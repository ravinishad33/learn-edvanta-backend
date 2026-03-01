const jwt = require("jsonwebtoken");
const generateToken = (userId,role) => {
    return jwt.sign(
        {
            id: userId,
            role
        }, // payload
        process.env.JWT_SECRET, // secret key from .env
        {
            expiresIn: "7d", // token expiry
        }
    );
};

module.exports = { generateToken };
