const express = require('express');
const router = express.Router();
// Use the centralized Razorpay config
const razorpay = require('../utils/razorpayConfig'); 
const crypto = require('crypto');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { protect } = require('../middlewares/authMiddleware');

// ===== RAZORPAY LOGIC =====

router.post('/create-order', protect, async (req, res) => {
    try {
        const { planId, amount } = req.body;
        const options = {
            amount: amount * 100, // amount in paise
            currency: "INR",
            receipt: `rcpt_${Date.now().toString().slice(-10)}_${req.user._id.toString().slice(-4)}`,
            notes: { userId: req.user._id.toString(), planId }
        };
        const order = await razorpay.orders.create(options);
        res.json({ success: true, order });
    } catch (error) {
        console.error('Razorpay Order Error:', error);
        res.status(500).json({ success: false, message: 'Failed to create payment order' });
    }
});

router.post('/verify', protect, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, firmName } = req.body;
        
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            // Payment successful, activate user
             const user = await User.findById(req.user._id);
             const plan = planId || 'PROFESSIONAL';
             const maxSeats = plan === 'STARTER' ? 2 : 5;
     
             user.subscriptionStatus = 'ACTIVE';
             user.subscriptionPlan = plan;
             user.subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 days
             user.role = 'ADMIN';
     
             let org;
             if (!user.organizationId) {
                 org = await Organization.create({
                     name: firmName || `${user.firstName}'s Law Firm`,
                     ownerId: user._id,
                     plan: plan,
                     maxSeats: maxSeats,
                     members: [{
                         userId: user._id,
                         role: 'ADMIN',
                         status: 'ACTIVE',
                         joinedAt: new Date()
                     }],
                     subscriptionStatus: 'ACTIVE',
                     subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                 });
                 user.organizationId = org._id;
             } else {
                 org = await Organization.findById(user.organizationId);
                 if (org) {
                     org.plan = plan;
                     org.maxSeats = maxSeats;
                     org.subscriptionStatus = 'ACTIVE';
                     org.subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                     await org.save();
                 }
             }
     
             await user.save();
            
             res.json({
                success: true,
                message: 'Payment verified and plan activated',
                user: {
                    role: user.role,
                    organizationId: user.organizationId,
                    subscriptionStatus: user.subscriptionStatus,
                    subscriptionExpiresAt: user.subscriptionExpiresAt
                }
             });
        } else {
            res.status(400).json({ success: false, message: 'Invalid signature' });
        }
    } catch (error) {
        console.error('Payment Verification Error:', error);
        res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
});

// ===== END RAZORPAY LOGIC =====


// =============================================================
//  TEST ENDPOINT — Skips Razorpay, directly activates plan
//  POST /payments/test-activate
//  Body: { planId: "STARTER" | "PROFESSIONAL", firmName?: string }
// =============================================================
router.post('/test-activate', protect, async (req, res) => {
    try {
        // SECURITY CHECK: Only allow admin emails to bypass payment
        if (!req.user.email.endsWith('@harsh.com')) {
             return res.status(403).json({ 
                 success: false, 
                 message: 'Payment bypass is restricted to administrators only. Please complete the payment process.' 
             });
        }

        const { planId, firmName } = req.body;
        const user = await User.findById(req.user._id);

        const plan = planId || 'PROFESSIONAL';
        const maxSeats = plan === 'STARTER' ? 2 : 5;

        user.subscriptionStatus = 'ACTIVE';
        user.subscriptionPlan = plan;
        user.subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 days
        user.role = 'ADMIN';

        let org;
        if (!user.organizationId) {
            org = await Organization.create({
                name: firmName || `${user.firstName}'s Law Firm`,
                ownerId: user._id,
                plan: plan,
                maxSeats: maxSeats,
                members: [{
                    userId: user._id,
                    role: 'ADMIN',
                    status: 'ACTIVE',
                    joinedAt: new Date()
                }],
                subscriptionStatus: 'ACTIVE',
                subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
            user.organizationId = org._id;
        } else {
            org = await Organization.findById(user.organizationId);
            if (org) {
                org.plan = plan;
                org.maxSeats = maxSeats;
                org.subscriptionStatus = 'ACTIVE';
                org.subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                await org.save();
            }
        }

        await user.save();

        res.json({
            success: true,
            message: '[TEST] Subscription activated (no payment)',
            user: {
                role: user.role,
                organizationId: user.organizationId,
                subscriptionStatus: user.subscriptionStatus,
                subscriptionExpiresAt: user.subscriptionExpiresAt
            }
        });
    } catch (error) {
        console.error('Test Activate Error:', error);
        res.status(500).json({ success: false, message: 'Test activation failed' });
    }
});

module.exports = router;
