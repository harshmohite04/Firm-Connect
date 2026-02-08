const User = require('../models/User');
const OTP = require('../models/OTP');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/emailService');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const { logLoginAttempt, logAccountLockout, logRegistration, getClientIp } = require('../utils/auditLogger');

// Environment-based toggle for email verification
const REQUIRE_EMAIL_VERIFICATION = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';

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

        const { firstName, lastName, phone, email, password } = req.body;
        const clientIp = getClientIp(req);

        const userExists = await User.findOne({ $or: [{ email }, { phone }] });

        if (userExists) {
            res.status(400);
            throw new Error('User already exists with this email or phone');
        }

        // Set status based on verification requirement
        const initialStatus = REQUIRE_EMAIL_VERIFICATION ? 'PENDING' : 'VERIFIED';

        const user = await User.create({
            firstName,
            lastName,
            phone,
            email,
            password,
            status: initialStatus,
            // Auto-activate for @harsh.com
            subscriptionStatus: email.endsWith('@harsh.com') ? 'ACTIVE' : 'INACTIVE',
            subscriptionPlan: email.endsWith('@harsh.com') ? 'PROFESSIONAL' : undefined,
            subscriptionExpiresAt: email.endsWith('@harsh.com') ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null
        });

        if (user) {
            // Log successful registration
            logRegistration(email, user._id.toString(), clientIp);

            // OTP Logic - only if verification is required
            if (REQUIRE_EMAIL_VERIFICATION) {
                // Generate OTP
                const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
                const hashedOtp = await bcrypt.hash(otpCode, 10);

                await OTP.create({
                    email,
                    otp: hashedOtp,
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
                });

                // Send OTP Email
                try {
                    await sendEmail({
                        email: user.email,
                        subject: 'LawFirmConnect - Verify your email',
                        message: `Your verification code is: ${otpCode}. It expires in 10 minutes.`
                    });
                } catch (emailError) {
                    console.error("Email send failed", emailError);
                }

                res.status(201).json({
                    _id: user._id,
                    firstName: user.firstName,
                    email: user.email,
                    role: user.role,
                    requiresVerification: true,
                    msg: 'User registered. Please check your email for verification code.'
                });
            } else {
                // Auto-verified for development
                res.status(201).json({
                    _id: user._id,
                    firstName: user.firstName,
                    email: user.email,
                    role: user.role,
                    token: generateToken(user._id),
                    msg: 'User registered successfully.'
                });
            }
        } else {
            res.status(400);
            throw new Error('Invalid user data');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Verify Email with OTP
// @route   POST /auth/verify-email
// @access  Public
const verifyEmail = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        if (user.status === 'VERIFIED') {
            res.status(200).json({ msg: 'Email already verified. Please login.' });
            return;
        }

        // Find latest OTP for email
        const validOtp = await OTP.findOne({ email }).sort({ createdAt: -1 });

        if (!validOtp) {
            res.status(400);
            throw new Error('OTP not found or expired. Please request a new one.');
        }

        if (validOtp.expiresAt < Date.now()) {
            res.status(400);
            throw new Error('OTP expired.');
        }

        const isMatch = await bcrypt.compare(otp, validOtp.otp);

        if (!isMatch) {
            res.status(400);
            throw new Error('Invalid OTP');
        }

        user.status = 'VERIFIED';
        await user.save();

        // Optional: Delete used OTPs for this email to be clean
        await OTP.deleteMany({ email });

        res.status(200).json({ 
            msg: 'Email verified successfully',
            token: generateToken(user._id)
        });

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

        // Check if account is verified
        if (user.status !== 'VERIFIED') {
            logLoginAttempt(false, email, user._id.toString(), clientIp, 'Account not verified');
            res.status(401);
            throw new Error('Account not verified. Please verify your email.');
        }

        // Successful login - reset failed attempts
        await user.resetLoginAttempts();
        logLoginAttempt(true, email, user._id.toString(), clientIp);

        // Auto-activate subscription for @harsh.com
        if (user.email.endsWith('@harsh.com')) {
            user.subscriptionStatus = 'ACTIVE';
            user.subscriptionPlan = 'PROFESSIONAL'; // Or ENTERPRISE
            user.subscriptionExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 Year
            await user.save();
        }

        res.json({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            subscriptionStatus: user.subscriptionStatus, // Return status
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
            role: user.role
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    registerUser,
    verifyEmail,
    loginUser,
    getCurrentUser
};
