const jwt = require('jsonwebtoken');
const db = require('../config/db');

module.exports = async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required. Access denied.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Malformed authorization token.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'transitops_super_secret_jwt_key_2026_keyphrase');
    
    // Fetch user details including role permissions
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.email, u.name, u.status, u.role_id, r.name as role_name, r.permissions 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? AND u.status = 'Active'`,
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'User not found or suspended.' });
    }

    const user = rows[0];
    user.permissions = JSON.parse(user.permissions); // Parse permission JSON object

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid token. Authorization failed.' });
  }
};
