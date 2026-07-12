// Role-based Access Control Middlewares

/**
 * Checks if the authenticated user has a specific permission key enabled.
 * @param {string} permissionKey - e.g., 'fleet', 'drivers', 'trips', etc.
 */
function checkPermission(permissionKey) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized. User context missing.' });
    }

    // Admins bypass all permission checks
    if (req.user.role_name === 'Admin') {
      return next();
    }

    if (req.user.permissions && req.user.permissions[permissionKey] === true) {
      return next();
    }

    return res.status(430).json({ 
      message: `Access Denied. You do not have permissions to manage: ${permissionKey}` 
    });
  };
}

/**
 * Checks if the authenticated user belongs to any of the allowed roles.
 * @param {string[]} allowedRoles - Array of roles allowed (e.g., ['Admin', 'Fleet Manager'])
 */
function checkRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized. User context missing.' });
    }

    if (allowedRoles.includes(req.user.role_name)) {
      return next();
    }

    return res.status(403).json({ 
      message: `Access Denied. Required roles: ${allowedRoles.join(', ')}. Current role: ${req.user.role_name}` 
    });
  };
}

module.exports = {
  checkPermission,
  checkRole
};
