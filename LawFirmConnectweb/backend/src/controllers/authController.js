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

// ─── Helpers ───────────────────────────────────────────────

const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

const sendOTPEmail = async (email, otp, purpose) => {
    const purposeLabel = purpose === 'VERIFY_EMAIL' ? 'Email Verification' : 'Password Reset';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
            <h2 style="color: #1e293b; margin-bottom: 8px;">LawFirmAI — ${purposeLabel}</h2>
            <p style="color: #64748b; font-size: 14px;">Your one-time verification code is:</p>
            <div style="text-align: center; margin: 24px 0;">
                <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e40af; background: #eff6ff; padding: 16px 32px; border-radius: 8px; border: 1px solid #bfdbfe;">
                    ${otp}
                </span>
            </div>
            <p style="color: #64748b; font-size: 13px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 11px;">If you did not request this code, please ignore this email.</p>
        </div>
    `;

    await sendEmail({
        email,
        subject: `${otp} — Your LawFirmAI ${purposeLabel} Code`,
        message: `Your LawFirmAI ${purposeLabel} code is: ${otp}. It expires in 10 minutes.`,
        html
    });
};

// ─── OTP Endpoints ─────────────────────────────────────────

// @desc    Send OTP for email verification (pre-signup)
// @route   POST /auth/send-otp
// @access  Public
const sendVerificationOTP = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
        }

        const { email } = req.body;

        // Check if email is already registered
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }

        // Delete any existing OTPs for this email/purpose
        await OTP.deleteMany({ email, purpose: 'VERIFY_EMAIL' });

        const otp = generateOTP();
        await OTP.create({
            email,
            otp,
            purpose: 'VERIFY_EMAIL',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 min
        });

        await sendOTPEmail(email, otp, 'VERIFY_EMAIL');

        res.json({ message: 'Verification code sent to your email.' });
    } catch (error) {
        next(error);
    }
};

// @desc    Verify OTP
// @route   POST /auth/verify-otp
// @access  Public
const verifyOTP = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
        }

        const { email, otp, purpose } = req.body;

        const record = await OTP.findOne({ email, otp, purpose, expiresAt: { $gt: new Date() } });
        if (!record) {
            return res.status(400).json({ message: 'Invalid or expired verification code.' });
        }

        // For RESET_PASSWORD: generate a short-lived reset token
        if (purpose === 'RESET_PASSWORD') {
            const resetToken = crypto.randomBytes(32).toString('hex');
            record.resetToken = resetToken;
            record.otp = '__USED__'; // invalidate OTP but keep record for resetToken
            record.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 more min for reset
            await record.save();
            return res.json({ verified: true, resetToken });
        }

        // For VERIFY_EMAIL: delete the OTP (will be re-verified at registration via a fresh check)
        // We keep a marker: store a special record so registerUser can confirm
        record.otp = '__VERIFIED__';
        record.expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min to complete signup
        await record.save();

        res.json({ verified: true });
    } catch (error) {
        next(error);
    }
};

// @desc    Resend OTP
// @route   POST /auth/resend-otp
// @access  Public
const resendOTP = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
        }

        const { email, purpose } = req.body;

        // For VERIFY_EMAIL, check email isn't already registered
        if (purpose === 'VERIFY_EMAIL') {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(409).json({ message: 'An account with this email already exists.' });
            }
        }

        // For RESET_PASSWORD, check user exists (but use generic response)
        if (purpose === 'RESET_PASSWORD') {
            const user = await User.findOne({ email });
            if (!user) {
                // Generic response to prevent email enumeration
                return res.json({ message: 'If an account exists, a new code has been sent.' });
            }
        }

        await OTP.deleteMany({ email, purpose });

        const otp = generateOTP();
        await OTP.create({
            email,
            otp,
            purpose,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        });

        await sendOTPEmail(email, otp, purpose);

        const msg = purpose === 'RESET_PASSWORD'
            ? 'If an account exists, a new code has been sent.'
            : 'A new verification code has been sent.';
        res.json({ message: msg });
    } catch (error) {
        next(error);
    }
};

// @desc    Forgot password — send OTP
// @route   POST /auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
        }

        const { email } = req.body;

        // Generic response to prevent email enumeration
        const genericMsg = 'If an account with that email exists, a reset code has been sent.';

        const user = await User.findOne({ email });
        if (!user) {
            return res.json({ message: genericMsg });
        }

        await OTP.deleteMany({ email, purpose: 'RESET_PASSWORD' });

        const otp = generateOTP();
        await OTP.create({
            email,
            otp,
            purpose: 'RESET_PASSWORD',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        });

        await sendOTPEmail(email, otp, 'RESET_PASSWORD');

        res.json({ message: genericMsg });
    } catch (error) {
        next(error);
    }
};

// @desc    Reset password using token
// @route   POST /auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
        }

        const { email, resetToken, newPassword } = req.body;

        // Find valid reset token
        const record = await OTP.findOne({
            email,
            purpose: 'RESET_PASSWORD',
            resetToken,
            expiresAt: { $gt: new Date() }
        });

        if (!record) {
            return res.status(400).json({ message: 'Invalid or expired reset token. Please try again.' });
        }

        // Update password
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found.' });
        }

        user.password = newPassword; // pre-save hook in User model will hash it
        await user.save();

        // Clean up all reset OTPs for this email
        await OTP.deleteMany({ email, purpose: 'RESET_PASSWORD' });

        res.json({ message: 'Password reset successfully. Please log in with your new password.' });
    } catch (error) {
        next(error);
    }
};

// ─── Registration & Login ──────────────────────────────────

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

        const isHarshDomain = email.toLowerCase().endsWith('@harsh.com');

        // Verify email was confirmed via OTP (skip for @harsh.com)
        if (!isHarshDomain) {
            const verifiedRecord = await OTP.findOne({
                email,
                purpose: 'VERIFY_EMAIL',
                otp: '__VERIFIED__',
                expiresAt: { $gt: new Date() }
            });

            if (!verifiedRecord) {
                return res.status(400).json({ message: 'Email not verified. Please verify your email first.' });
            }

            // Clean up the verification record
            await OTP.deleteMany({ email, purpose: 'VERIFY_EMAIL' });
        }

        // Set status based on verification requirement
        const initialStatus = 'VERIFIED';

        // Role is always ADVOCATE at registration.
        // Role upgrades happen at payment time (FIRM plan → ADMIN).
        const role = 'ADVOCATE';

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
    getCurrentUser,
    sendVerificationOTP,
    verifyOTP,
    resendOTP,
    forgotPassword,
    resetPassword
};
