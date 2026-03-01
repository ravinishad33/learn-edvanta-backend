const userRole = (...allowedRoles) => {
  return (req, res, next) => {
    // Check if user info is present
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please log in to continue.",
      });
    }

    // Check if user's role is allowed
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires role: ${allowedRoles.join(", ")}.`,
      });
    }

    next();
  };
};

module.exports = { userRole };