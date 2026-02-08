const express = require('express');
const router = express.Router();
const { registerUser, verifyEmail, loginUser, getCurrentUser } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const { body } = require('express-validator');

// Password strength validation: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const passwordValidator = body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character');

// Registration validation
const registerValidation = [
    body('email')
        .trim()
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail(),
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
    body('email')
        .trim()
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required')
];

router.post('/register', registerValidation, registerUser);
router.post('/verify-email', verifyEmail);
router.post('/login', loginValidation, loginUser);
router.get('/me', protect, getCurrentUser);

module.exports = router;
