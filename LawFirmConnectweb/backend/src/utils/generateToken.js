const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// SECURITY: Fail fast if JWT_SECRET is not set - never use a fallback
if (!JWT_SECRET) {
    throw new Error('CRITICAL: JWT_SECRET environment variable not set. Cannot start server.');
}

const generateToken = (id) => {
    return jwt.sign({ id }, JWT_SECRET, {
        expiresIn: '7d', // Reduced from 30d for security
    });
};

module.exports = generateToken;
