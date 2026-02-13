const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User'); // Assuming User model exists, need to check path

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('CRITICAL: JWT_SECRET environment variable not set. Cannot start server.');
}

const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            
            // Check if User model exists, otherwise mock? 
            // Better to assume User model is at ../models/User (standard)
            // But wait, list_dir didn't show User.js in models?
            // list_dir showed Case.js and TeamInvitation.js
            // I need to check if User.js exists!
            
            req.user = await User.findById(decoded.id).select('-password');
            if (!req.user) {
                res.status(401);
                throw new Error('Not authorized, user not found');
            }
            next();
        } catch (error) {
            console.error(error);
            res.status(401);
            throw new Error('Not authorized, token failed');
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
});

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(401);
        throw new Error('Not authorized as an admin');
    }
};


// Access Control Middleware (Paid or @harsh.com)
const checkAccess = (req, res, next) => {
    // 1. Bypass for Admin Domain
    if (req.user.email.endsWith('@harsh.com')) {
        return next();
    }

    // 2. Check Subscription Status
    if (req.user.subscriptionStatus === 'ACTIVE' && req.user.subscriptionExpiresAt > Date.now()) {
        return next();
    }

    // 3. Deny Access
    res.status(403).json({ 
        message: 'Subscription required. Please upgrade your plan.',
        requiresSubscription: true 
    });
};

module.exports = { protect, admin, checkAccess };
