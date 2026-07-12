const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role'); // Needed for population reference

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
    
    // Fetch user and populate role details
    const user = await User.findOne({ _id: decoded.id, status: 'Active' })
      .populate('role');

    if (!user) {
      return res.status(401).json({ message: 'User not found or suspended.' });
    }

    // Format req.user to match expected structure in controllers
    req.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      name: user.name,
      status: user.status,
      role_id: user.role._id,
      role_name: user.role.name,
      permissions: user.role.permissions // Automatically an object in Mongoose
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid token. Authorization failed.' });
  }
};
