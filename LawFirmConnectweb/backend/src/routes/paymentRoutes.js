const express = require('express');
const router = express.Router();
const razorpay = require('../utils/razorpayConfig');
const crypto = require('crypto');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { protect, admin } = require('../middlewares/authMiddleware');

// Map plan names to env-based Razorpay plan IDs
const PLAN_MAP = {
    STARTER: process.env.RAZORPAY_PLAN_STARTER,
    PROFESSIONAL: process.env.RAZORPAY_PLAN_PROFESSIONAL,
    FIRM: process.env.RAZORPAY_PLAN_FIRM,
};

const SEAT_PLAN_MAP = {
    STARTER: process.env.RAZORPAY_PLAN_SEAT_STARTER,
    PROFESSIONAL: process.env.RAZORPAY_PLAN_SEAT_PROFESSIONAL,
};

// =====================================================
// POST /payments/create-subscription
// Creates a Razorpay subscription for the user
// =====================================================
router.post('/create-subscription', protect, async (req, res) => {
    try {
        const { planId } = req.body; // 'STARTER' | 'PROFESSIONAL' | 'FIRM'

        const razorpayPlanId = PLAN_MAP[planId];
        if (!razorpayPlanId) {
            return res.status(400).json({ success: false, message: `Invalid plan: ${planId}` });
        }

        const subscription = await razorpay.subscriptions.create({
            plan_id: razorpayPlanId,
            total_count: 12,
            customer_notify: 1,
            notes: {
                userId: req.user._id.toString(),
                planId
            }
        });

        res.json({
            success: true,
            subscriptionId: subscription.id,
            short_url: subscription.short_url
        });
    } catch (error) {
        console.error('Create Subscription Error:', error);
        res.status(500).json({ success: false, message: 'Failed to create subscription' });
    }
});

// =====================================================
// POST /payments/verify-subscription
// Verifies Razorpay subscription payment & assigns role
// =====================================================
router.post('/verify-subscription', protect, async (req, res) => {
    try {
        const { razorpay_subscription_id, razorpay_payment_id, razorpay_signature, planId, firmName } = req.body;

        // Verify HMAC signature
        const body = razorpay_payment_id + '|' + razorpay_subscription_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid signature' });
        }

        const user = await User.findById(req.user._id);

        user.subscriptionStatus = 'ACTIVE';
        user.subscriptionPlan = planId;
        user.subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        user.razorpaySubscriptionId = razorpay_subscription_id;

        if (planId === 'FIRM') {
            // Firm plan → ADMIN role + create organization
            user.role = 'ADMIN';

            if (!user.organizationId) {
                const org = await Organization.create({
                    name: firmName || `${user.firstName}'s Law Firm`,
                    ownerId: user._id,
                    plan: 'FIRM',
                    razorpaySubscriptionId: razorpay_subscription_id,
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
                const org = await Organization.findById(user.organizationId);
                if (org) {
                    org.plan = 'FIRM';
                    org.razorpaySubscriptionId = razorpay_subscription_id;
                    org.subscriptionStatus = 'ACTIVE';
                    org.subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    await org.save();
                }
            }
        } else {
            // Starter or Professional → ADVOCATE role, no org
            user.role = 'ADVOCATE';
        }

        await user.save();

        res.json({
            success: true,
            message: 'Subscription verified and plan activated',
            user: {
                role: user.role,
                organizationId: user.organizationId,
                subscriptionStatus: user.subscriptionStatus,
                subscriptionPlan: user.subscriptionPlan,
                subscriptionExpiresAt: user.subscriptionExpiresAt
            }
        });
    } catch (error) {
        console.error('Verify Subscription Error:', error);
        res.status(500).json({ success: false, message: 'Subscription verification failed' });
    }
});

// =====================================================
// POST /payments/create-seat
// Creates a Razorpay subscription for a seat (admin only)
// =====================================================
router.post('/create-seat', protect, admin, async (req, res) => {
    try {
        const { seatPlan } = req.body; // 'STARTER' | 'PROFESSIONAL'

        const razorpayPlanId = SEAT_PLAN_MAP[seatPlan];
        if (!razorpayPlanId) {
            return res.status(400).json({ success: false, message: `Invalid seat plan: ${seatPlan}` });
        }

        const user = await User.findById(req.user._id);
        if (!user.organizationId) {
            return res.status(400).json({ success: false, message: 'You must have an organization to buy seats' });
        }

        const subscription = await razorpay.subscriptions.create({
            plan_id: razorpayPlanId,
            total_count: 12,
            customer_notify: 1,
            notes: {
                userId: req.user._id.toString(),
                organizationId: user.organizationId.toString(),
                seatPlan,
                type: 'seat'
            }
        });

        res.json({
            success: true,
            subscriptionId: subscription.id,
            short_url: subscription.short_url
        });
    } catch (error) {
        console.error('Create Seat Error:', error);
        res.status(500).json({ success: false, message: 'Failed to create seat subscription' });
    }
});

// =====================================================
// POST /payments/verify-seat
// Verifies seat payment & adds to org.seats
// =====================================================
router.post('/verify-seat', protect, admin, async (req, res) => {
    try {
        const { razorpay_subscription_id, razorpay_payment_id, razorpay_signature, seatPlan } = req.body;

        // Verify HMAC signature
        const body = razorpay_payment_id + '|' + razorpay_subscription_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid signature' });
        }

        const user = await User.findById(req.user._id);
        const org = await Organization.findById(user.organizationId);

        if (!org) {
            return res.status(404).json({ success: false, message: 'Organization not found' });
        }

        org.seats.push({
            razorpaySubscriptionId: razorpay_subscription_id,
            plan: seatPlan,
            status: 'ACTIVE',
            assignedTo: null,
            createdAt: new Date()
        });
        await org.save();

        res.json({
            success: true,
            message: `${seatPlan} seat added to organization`,
            seats: org.seats
        });
    } catch (error) {
        console.error('Verify Seat Error:', error);
        res.status(500).json({ success: false, message: 'Seat verification failed' });
    }
});

// =====================================================
// POST /payments/cancel-subscription
// Cancels the user's Razorpay subscription
// =====================================================
router.post('/cancel-subscription', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user.razorpaySubscriptionId) {
            return res.status(400).json({ success: false, message: 'No active subscription found' });
        }

        await razorpay.subscriptions.cancel(user.razorpaySubscriptionId);

        user.subscriptionStatus = 'INACTIVE';
        await user.save();

        res.json({
            success: true,
            message: 'Subscription cancelled successfully'
        });
    } catch (error) {
        console.error('Cancel Subscription Error:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel subscription' });
    }
});

// =====================================================
// POST /payments/webhook
// Razorpay webhook handler (public, no auth)
// =====================================================
router.post('/webhook', async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

        // Verify webhook signature
        const receivedSignature = req.headers['x-razorpay-signature'];
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(JSON.stringify(req.body))
            .digest('hex');

        if (receivedSignature !== expectedSignature) {
            console.warn('Webhook signature mismatch');
            return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
        }

        const { event, payload } = req.body;
        const subscriptionEntity = payload?.subscription?.entity;

        if (!subscriptionEntity) {
            return res.status(200).json({ success: true, message: 'No subscription entity' });
        }

        const subscriptionId = subscriptionEntity.id;
        const notes = subscriptionEntity.notes || {};

        console.log(`[Webhook] Event: ${event}, Subscription: ${subscriptionId}`);

        if (event === 'subscription.charged') {
            // Check if this is a seat subscription
            if (notes.type === 'seat' && notes.organizationId) {
                const org = await Organization.findById(notes.organizationId);
                if (org) {
                    const seat = org.seats.find(s => s.razorpaySubscriptionId === subscriptionId);
                    if (seat) {
                        seat.status = 'ACTIVE';
                        await org.save();
                    }
                }
            } else {
                // User subscription — extend expiry
                const user = await User.findOne({ razorpaySubscriptionId: subscriptionId });
                if (user) {
                    user.subscriptionStatus = 'ACTIVE';
                    user.subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    await user.save();

                    // Also extend org subscription if FIRM plan
                    if (user.organizationId) {
                        const org = await Organization.findById(user.organizationId);
                        if (org && org.razorpaySubscriptionId === subscriptionId) {
                            org.subscriptionStatus = 'ACTIVE';
                            org.subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                            await org.save();
                        }
                    }
                }
            }
        } else if (event === 'subscription.cancelled' || event === 'subscription.halted') {
            // Check seat subscription
            if (notes.type === 'seat' && notes.organizationId) {
                const org = await Organization.findById(notes.organizationId);
                if (org) {
                    const seat = org.seats.find(s => s.razorpaySubscriptionId === subscriptionId);
                    if (seat) {
                        seat.status = 'INACTIVE';
                        await org.save();
                    }
                }
            } else {
                // User subscription
                const user = await User.findOne({ razorpaySubscriptionId: subscriptionId });
                if (user) {
                    user.subscriptionStatus = 'INACTIVE';
                    await user.save();

                    if (user.organizationId) {
                        const org = await Organization.findById(user.organizationId);
                        if (org && org.razorpaySubscriptionId === subscriptionId) {
                            org.subscriptionStatus = 'INACTIVE';
                            await org.save();
                        }
                    }
                }
            }
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ success: false, message: 'Webhook processing failed' });
    }
});

// =====================================================
// POST /payments/test-activate
// Dev bypass for @harsh.com users
// =====================================================
router.post('/test-activate', protect, async (req, res) => {
    try {
        if (!req.user.email.endsWith('@harsh.com')) {
            return res.status(403).json({
                success: false,
                message: 'Payment bypass is restricted to administrators only.'
            });
        }

        const { planId, firmName } = req.body;
        const user = await User.findById(req.user._id);
        const plan = planId || 'PROFESSIONAL';

        user.subscriptionStatus = 'ACTIVE';
        user.subscriptionPlan = plan;
        user.subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        if (plan === 'FIRM') {
            user.role = 'ADMIN';

            if (!user.organizationId) {
                const org = await Organization.create({
                    name: firmName || `${user.firstName}'s Law Firm`,
                    ownerId: user._id,
                    plan: 'FIRM',
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
                const org = await Organization.findById(user.organizationId);
                if (org) {
                    org.plan = 'FIRM';
                    org.subscriptionStatus = 'ACTIVE';
                    org.subscriptionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    await org.save();
                }
            }
        } else {
            user.role = 'ADVOCATE';
        }

        await user.save();

        res.json({
            success: true,
            message: '[TEST] Subscription activated (no payment)',
            user: {
                role: user.role,
                organizationId: user.organizationId,
                subscriptionStatus: user.subscriptionStatus,
                subscriptionPlan: user.subscriptionPlan,
                subscriptionExpiresAt: user.subscriptionExpiresAt
            }
        });
    } catch (error) {
        console.error('Test Activate Error:', error);
        res.status(500).json({ success: false, message: 'Test activation failed' });
    }
});

module.exports = router;
