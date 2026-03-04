const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    getCurrentUser,
    sendVerificationOTP,
    verifyOTP,
    resendOTP,
    forgotPassword,
    resetPassword
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');

// ─── Rate Limiters ─────────────────────────────────────────

const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { message: 'Too many attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: { message: 'Too many password reset attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

// ─── Validators ────────────────────────────────────────────

// Password strength validation: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const passwordValidator = body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character');

const emailValidator = body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail();

const otpValidator = body('otp')
    .trim()
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers');

const purposeValidator = body('purpose')
    .isIn(['VERIFY_EMAIL', 'RESET_PASSWORD']).withMessage('Invalid purpose');

// Registration validation
const registerValidation = [
    emailValidator,
    body('firstName')
        .trim()
        .notEmpty().withMessage('First name is required')
        .isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
    body('phone')
        .trim()
        .notEmpty().withMessage('Phone number is required')
        .matches(/^[+]?[\d\s-]{10,}$/).withMessage('Please provide a valid phone number'),
    passwordValidator
];

// Login validation
const loginValidation = [
    emailValidator,
    body('password')
        .notEmpty().withMessage('Password is required')
];

// New password strength validator (for reset)
const newPasswordValidator = body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character');

// ─── Routes ────────────────────────────────────────────────

// OTP routes
router.post('/send-otp', otpLimiter, [emailValidator], sendVerificationOTP);
router.post('/verify-otp', otpLimiter, [emailValidator, otpValidator, purposeValidator], verifyOTP);
router.post('/resend-otp', otpLimiter, [emailValidator, purposeValidator], resendOTP);

// Forgot / Reset password
router.post('/forgot-password', forgotPasswordLimiter, [emailValidator], forgotPassword);
router.post('/reset-password', otpLimiter, [
    emailValidator,
    body('resetToken').notEmpty().withMessage('Reset token is required'),
    newPasswordValidator
], resetPassword);

// Existing routes
router.post('/register', registerValidation, registerUser);
router.post('/login', loginValidation, loginUser);
router.get('/me', protect, getCurrentUser);

module.exports = router;
