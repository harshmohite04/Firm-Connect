const express = require('express');
const router = express.Router();
const ContactSubmission = require('../models/ContactSubmission');

// @desc    Submit contact form (Public)
// @route   POST /contact-submissions
// @access  Public
router.post('/', async (req, res, next) => {
    try {
        const { name, email, phone, subject, message } = req.body;
        if (!name || !email || !message) {
            res.status(400);
            throw new Error('Name, email, and message are required');
        }

        const submission = await ContactSubmission.create({ name, email, phone, subject, message });
        res.status(201).json(submission);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
