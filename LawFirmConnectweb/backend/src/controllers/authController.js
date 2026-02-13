const User = require('../models/User');
const OTP = require('../models/OTP');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/emailService');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const { logLoginAttempt, logAccountLockout, logRegistration, getClientIp } = require('../utils/auditLogger');
const Organization = require('../models/Organization');
const TeamInvitation = require('../models/TeamInvitation'); // Added if we need it, though we might just push to members array directly

// Environment-based toggle for email verification
// const REQUIRE_EMAIL_VERIFICATION = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';

// @desc    Register a new user
// @route   POST /auth/register
// @access  Public
const registerUser = async (req, res, next) => {
    try {
        // Check validation results from express-validator
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                message: 'Validation failed',
                errors: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }

        const { firstName, lastName, phone, email, password, accountType, organizationId } = req.body;
        const clientIp = getClientIp(req);

        const userExists = await User.findOne({ $or: [{ email }, { phone }] });

        if (userExists) {
            res.status(400);
            throw new Error('User already exists with this email or phone');
        }

        // Set status based on verification requirement
        const initialStatus = 'VERIFIED';
        
        // Determine Role
        // If accountType is 'FIRM', role is ADMIN. Default is ATTORNEY.
        const role = accountType === 'FIRM' ? 'ADMIN' : 'ATTORNEY';

        const user = await User.create({
            firstName,
            lastName,
            phone,
            email,
            password,
            role,
            status: initialStatus,
            // Auto-activate for @harsh.com
            subscriptionStatus: email.toLowerCase().endsWith('@harsh.com') ? 'ACTIVE' : 'INACTIVE',
            subscriptionPlan: email.toLowerCase().endsWith('@harsh.com') ? 'PROFESSIONAL' : undefined,
            subscriptionExpiresAt: email.toLowerCase().endsWith('@harsh.com') ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null
        });

        if (user) {
            // Case 1: USER CREATING A FIRM
            // Only auto-create org for @harsh.com users (who bypass payment).
            // All other ADMIN users must go through the Pricing page to pay and create their org.
            if (role === 'ADMIN' && email.toLowerCase().endsWith('@harsh.com')) {
                const org = await Organization.create({
                    name: `${firstName}'s Law Firm`, // Default name
                    ownerId: user._id,
                    plan: 'STARTER', 
                    maxSeats: 2, 
                    members: [{
                        userId: user._id,
                        role: 'ADMIN',
                        status: 'ACTIVE',
                        joinedAt: new Date()
                    }],
                    subscriptionStatus: user.subscriptionStatus, 
                    subscriptionExpiresAt: user.subscriptionExpiresAt
                });

                user.organizationId = org._id;
                await user.save();
            }
            // Case 2: USER JOINING A FIRM (ATTORNEY)
            else if (role === 'ATTORNEY' && organizationId) {
                const org = await Organization.findById(organizationId);
                if (org) {
                    // Check if seats available (Optional: enforce strict, or allow pending even if full?)
                    // Let's allow adding as PENDING even if full, Admin resolves it later.
                    
                    // Add to organization members list as PENDING
                    org.members.push({
                        userId: user._id,
                        role: 'ATTORNEY',
                        status: 'PENDING', // Admin must approve
                        joinedAt: new Date()
                    });
                    await org.save();
                    
                    // We DO NOT set user.organizationId yet. 
                    // It stays null until Admin approves (Active status).
                }
            }

            // Log successful registration
            logRegistration(email, user._id.toString(), clientIp);

            res.status(201).json({
                _id: user._id,
                firstName: user.firstName,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId,
                token: generateToken(user._id),
                msg: role === 'ATTORNEY' && organizationId 
                    ? 'Account created. Your request to join the firm is pending approval.' 
                    : 'User registered successfully.'
            });
        } else {
            res.status(400);
            throw new Error('Invalid user data');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Auth user & get token
// @route   POST /auth/login
// @access  Public
const loginUser = async (req, res, next) => {
    try {
        // Check validation results from express-validator
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                message: 'Validation failed',
                errors: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg
                }))
            });
        }

        const { email, password } = req.body;
        const clientIp = getClientIp(req);

        const user = await User.findOne({ email });

        // Check if user exists
        if (!user) {
            logLoginAttempt(false, email, null, clientIp, 'User not found');
            res.status(401);
            throw new Error('Invalid email or password');
        }

        // Check if account is locked
        if (user.isLocked) {
            const lockRemaining = Math.ceil((user.lockUntil - Date.now()) / 60000);
            logLoginAttempt(false, email, user._id.toString(), clientIp, 'Account locked');
            res.status(423); // 423 Locked
            throw new Error(`Account is locked. Try again in ${lockRemaining} minutes.`);
        }

        // Verify password
        const isPasswordValid = await user.matchPassword(password);

        if (!isPasswordValid) {
            // Increment failed attempts
            await user.incrementLoginAttempts();
            
            // Check if account just got locked
            const updatedUser = await User.findById(user._id);
            if (updatedUser.isLocked) {
                logAccountLockout(email, user._id.toString(), updatedUser.failedLoginAttempts, updatedUser.lockUntil);
                res.status(423);
                throw new Error('Account locked due to too many failed login attempts. Try again in 15 minutes.');
            }

            logLoginAttempt(false, email, user._id.toString(), clientIp, 'Invalid password');
            res.status(401);
            throw new Error('Invalid email or password');
        }

        // Successful login - reset failed attempts
        await user.resetLoginAttempts();
        logLoginAttempt(true, email, user._id.toString(), clientIp);

        // Auto-activate subscription for @harsh.com
        if (user.email.toLowerCase().endsWith('@harsh.com')) {
            user.subscriptionStatus = 'ACTIVE';
            user.subscriptionPlan = 'PROFESSIONAL'; 
            // Reset expiration if expired or not set
            if (!user.subscriptionExpiresAt || user.subscriptionExpiresAt < new Date()) {
                 user.subscriptionExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 Year
            }
            await user.save();
        }

        res.json({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            subscriptionStatus: user.subscriptionStatus,
            token: generateToken(user._id)
        });

    } catch (error) {
        console.error("Login error", error);
        next(error);
    }
};

// @desc    Get current user info
// @route   GET /auth/me
// @access  Private
const getCurrentUser = async (req, res, next) => {
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
            phone: user.phone,
            role: user.role,
            organizationId: user.organizationId,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionPlan: user.subscriptionPlan,
            subscriptionExpiresAt: user.subscriptionExpiresAt
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    registerUser,
    loginUser,
    getCurrentUser
};
