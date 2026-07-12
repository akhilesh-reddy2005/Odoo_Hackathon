const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const ActivityLog = require('../models/ActivityLog');

// Handle operator login
exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    // Find user in MongoDB and populate role details
    const user = await User.findOne({ username: username.toLowerCase() }).populate('role');
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

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
      { id: user._id, username: user.username, role: user.role.name },
      process.env.JWT_SECRET || 'transitops_super_secret_jwt_key_2026_keyphrase',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Write activity log
    await ActivityLog.create({
      user: user._id,
      action: 'User Login',
      details: `User ${user.username} logged in successfully.`
    });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role.name,
        permissions: user.role.permissions
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
    const updateFields = { name, email: email.toLowerCase() };

    if (newPassword && newPassword.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updateFields.password_hash = await bcrypt.hash(newPassword, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, { new: true });
    if (!updatedUser) {
      return res.status(404).json({ message: 'User profile not found.' });
    }

    // Logging Activity
    await ActivityLog.create({
      user: userId,
      action: 'Profile Updated',
      details: 'User details updated.'
    });

    res.json({ message: 'Profile updated successfully.' });

  } catch (error) {
    console.error('Profile update error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email address already in use.' });
    }
    res.status(500).json({ message: 'Failed to update profile.' });
  }
};

// Get system roles and permissions (Admin screen settings)
exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find({});
    res.json(roles);
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
    await Role.findByIdAndUpdate(roleId, { permissions });

    // Logging Activity
    await ActivityLog.create({
      user: req.user.id,
      action: 'Role Updated',
      details: `Permissions updated for Role ID: ${roleId}.`
    });

    res.json({ message: 'Role permissions matrix updated successfully.' });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ message: 'Failed to update role permissions.' });
  }
};
