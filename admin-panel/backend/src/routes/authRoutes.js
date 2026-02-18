const express = require('express');
const router = express.Router();
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const { protect, admin } = require('../middlewares/authMiddleware');

// @desc    Admin login
// @route   POST /auth/login
// @access  Public
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400);
            throw new Error('Email and password are required');
        }

        const user = await User.findOne({ email });

        if (!user) {
            res.status(401);
            throw new Error('Invalid credentials');
        }

        if (!user.isAdmin) {
            res.status(403);
            throw new Error('Access denied. Admin only.');
        }

        if (user.isLocked) {
            const lockRemaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
            res.status(423);
            throw new Error(`Account is locked. Try again in ${lockRemaining} minutes.`);
        }

        const isPasswordValid = await user.matchPassword(password);

        if (!isPasswordValid) {
            await user.incrementLoginAttempts();
            res.status(401);
            throw new Error('Invalid credentials');
        }

        await user.resetLoginAttempts();

        res.json({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            isAdmin: user.isAdmin,
            token: generateToken(user._id)
        });
    } catch (error) {
        next(error);
    }
});

// @desc    Get current admin user
// @route   GET /auth/me
// @access  Admin
router.get('/me', protect, admin, async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }
        res.json({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            isAdmin: user.isAdmin
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
