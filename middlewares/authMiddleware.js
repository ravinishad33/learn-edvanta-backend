const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Please log in to continue.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Please log in to continue.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error("JWT verification error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Your session has expired. Please log in again.",
    });
  }
};

module.exports = { verifyToken };