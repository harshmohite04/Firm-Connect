const User = require('../models/User');
const OTP = require('../models/OTP');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/emailService');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const { logLoginAttempt, logAccountLockout, logRegistration, logSessionReplaced, getClientIp } = require('../utils/auditLogger');
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');
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

        // Role is always ADVOCATE at registration.
        // Role upgrades happen at payment time (FIRM plan → ADMIN).
        const role = 'ADVOCATE';

        const isHarshDomain = email.toLowerCase().endsWith('@harsh.com');
        const user = await User.create({
            firstName,
            lastName,
            phone,
            email,
            password,
            role: isHarshDomain ? 'ADMIN' : role,
            status: initialStatus,
            // Auto-activate for @harsh.com
            subscriptionStatus: isHarshDomain ? 'ACTIVE' : 'INACTIVE',
            subscriptionPlan: isHarshDomain ? 'FIRM' : undefined,
            subscriptionExpiresAt: isHarshDomain ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null
        });

        if (user) {
            // Auto-create org for @harsh.com users (who bypass payment)
            if (isHarshDomain) {
                const org = await Organization.create({
                    name: `${firstName}'s Law Firm`,
                    ownerId: user._id,
                    plan: 'FIRM',
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
            // User joining a firm via invite link
            else if (organizationId) {
                const org = await Organization.findById(organizationId);
                if (org) {
                    org.members.push({
                        userId: user._id,
                        role: 'ADVOCATE',
                        status: 'PENDING',
                        joinedAt: new Date()
                    });
                    await org.save();
                }
            }

            // Generate session token for single-device enforcement
            const sessionToken = crypto.randomUUID();
            user.sessionToken = sessionToken;
            await user.save();

            // Log successful registration
            logRegistration(email, user._id.toString(), clientIp);

            res.status(201).json({
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId,
                subscriptionStatus: user.subscriptionStatus,
                token: generateToken(user._id, sessionToken),
                msg: organizationId
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

        // Notify previous session via Socket.IO before replacing token
        if (user.sessionToken) {
            const io = req.app.get('socketio');
            if (io) {
                io.to(user._id.toString()).emit('session_expired', {
                    message: 'Your account was signed in on another device.'
                });
            }
            logSessionReplaced(email, user._id.toString(), clientIp);
        }

        // Generate new session token for single-device enforcement
        const sessionToken = crypto.randomUUID();
        user.sessionToken = sessionToken;

        // Capture last login metadata
        const ua = new UAParser(req.headers['user-agent']);
        const browser = ua.getBrowser();
        const os = ua.getOS();
        const deviceString = browser.name
            ? `${browser.name}${browser.version ? ' ' + browser.version.split('.')[0] : ''} on ${os.name || 'Unknown OS'}${os.version ? ' ' + os.version : ''}`
            : 'Unknown device';

        const geo = geoip.lookup(clientIp);
        const locationString = geo && geo.city
            ? `${geo.city}, ${geo.country}`
            : geo && geo.country
                ? geo.country
                : 'Unknown location';

        // Preserve current login as previous before overwriting
        if (user.lastLoginAt) {
            user.previousLoginAt = user.lastLoginAt;
            user.previousLoginIp = user.lastLoginIp;
            user.previousLoginDevice = user.lastLoginDevice;
            user.previousLoginLocation = user.lastLoginLocation;
        }

        user.lastLoginAt = new Date();
        user.lastLoginIp = clientIp;
        user.lastLoginDevice = deviceString;
        user.lastLoginLocation = locationString;

        // Auto-activate subscription for @harsh.com
        if (user.email.toLowerCase().endsWith('@harsh.com')) {
            user.subscriptionStatus = 'ACTIVE';
            user.subscriptionPlan = 'FIRM';
            user.role = 'ADMIN';
            if (!user.subscriptionExpiresAt || user.subscriptionExpiresAt < new Date()) {
                 user.subscriptionExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
            }
        }
        await user.save();

        res.json({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            subscriptionStatus: user.subscriptionStatus,
            lastLoginAt: user.lastLoginAt,
            lastLoginDevice: user.lastLoginDevice,
            lastLoginLocation: user.lastLoginLocation,
            previousLoginAt: user.previousLoginAt,
            previousLoginDevice: user.previousLoginDevice,
            previousLoginLocation: user.previousLoginLocation,
            token: generateToken(user._id, sessionToken)
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
            razorpaySubscriptionId: user.razorpaySubscriptionId,
            subscriptionExpiresAt: user.subscriptionExpiresAt,
            lastLoginAt: user.lastLoginAt,
            lastLoginDevice: user.lastLoginDevice,
            lastLoginLocation: user.lastLoginLocation,
            previousLoginAt: user.previousLoginAt,
            previousLoginDevice: user.previousLoginDevice,
            previousLoginLocation: user.previousLoginLocation,
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
