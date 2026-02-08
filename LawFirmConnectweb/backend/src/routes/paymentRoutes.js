const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middlewares/authMiddleware');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder', // User needs to set this
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder'
});

// @desc    Create a payment order
// @route   POST /portal/payments/create-order
// @access  Private
router.post('/create-order', protect, async (req, res) => {
    try {
        const { planId, amount } = req.body; // Amount in smallest currency unit (paise)

        const options = {
            amount: amount * 100, // Convert to paise
            currency: "INR",
            receipt: `rcpt_${Date.now().toString().slice(-10)}_${req.user._id.toString().slice(-4)}`,
            notes: {
                userId: req.user._id.toString(),
                planId: planId
            }
        };

        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            order
        });
    } catch (error) {
        console.error('Razorpay Order Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create payment order' 
        });
    }
});

// @desc    Verify payment signature and activate subscription
// @route   POST /portal/payments/verify
// @access  Private
router.post('/verify', protect, async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature,
            planId 
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder')
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Payment Success - Update User
            const user = await User.findById(req.user._id);
            
            user.subscriptionStatus = 'ACTIVE';
            user.subscriptionPlan = planId || 'PROFESSIONAL'; // Default or from frontend
            user.subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 Days
            
            await user.save();

            res.json({
                success: true,
                message: 'Payment verified and subscription activated',
                user: {
                    subscriptionStatus: user.subscriptionStatus,
                    subscriptionExpiresAt: user.subscriptionExpiresAt
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Invalid signature'
            });
        }
    } catch (error) {
        console.error('Payment Verification Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Payment verification failed' 
        });
    }
});

module.exports = router;
