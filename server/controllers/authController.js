const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Handle user login
exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    // Find user in DB
    const [users] = await db.query(
      `SELECT u.*, r.name as role_name, r.permissions 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.username = ?`,
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const user = users[0];

    if (user.status !== 'Active') {
      return res.status(403).json({ message: 'Your account has been deactivated. Contact an administrator.' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    // Sign JWT Token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role_name },
      process.env.JWT_SECRET || 'transitops_super_secret_jwt_key_2026_keyphrase',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Write activity log
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [user.id, 'User Login', `User ${user.username} logged in successfully.`]
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role_name,
        permissions: JSON.parse(user.permissions)
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error occurred during login.' });
  }
};

// Fetch current user details
exports.getMe = async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role_name,
      permissions: req.user.permissions
    }
  });
};

// Update profile details
exports.updateProfile = async (req, res) => {
  const { name, email, newPassword } = req.body;
  const userId = req.user.id;

  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required fields.' });
  }

  try {
    let query = 'UPDATE users SET name = ?, email = ?';
    let params = [name, email];

    if (newPassword && newPassword.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(newPassword, salt);
      query += ', password_hash = ?';
      params.push(hash);
    }

    query += ' WHERE id = ?';
    params.push(userId);

    await db.query(query, params);

    // Logging Activity
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'Profile Updated', 'User details updated.']
    );

    res.json({ message: 'Profile updated successfully.' });

  } catch (error) {
    console.error('Profile update error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email address already in use.' });
    }
    res.status(500).json({ message: 'Failed to update profile.' });
  }
};

// Get system roles and permissions (Admin screen settings)
exports.getRoles = async (req, res) => {
  try {
    const [roles] = await db.query('SELECT * FROM roles');
    const formattedRoles = roles.map(role => ({
      id: role.id,
      name: role.name,
      permissions: JSON.parse(role.permissions)
    }));
    res.json(formattedRoles);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ message: 'Failed to retrieve role list.' });
  }
};

// Update role permissions matrix (Admin action)
exports.updateRolePermissions = async (req, res) => {
  const { roleId, permissions } = req.body;

  if (!roleId || !permissions) {
    return res.status(400).json({ message: 'Role ID and permission configuration are required.' });
  }

  try {
    await db.query(
      'UPDATE roles SET permissions = ? WHERE id = ?',
      [JSON.stringify(permissions), roleId]
    );

    // Logging Activity
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'Role Updated', `Permissions updated for Role ID: ${roleId}.`]
    );

    res.json({ message: 'Role permissions matrix updated successfully.' });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ message: 'Failed to update role permissions.' });
  }
};
