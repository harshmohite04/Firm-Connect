/**
 * One-time script: Create Razorpay Subscription Plans
 *
 * Run: node backend/src/scripts/createRazorpayPlans.js
 *
 * Creates 5 plans:
 *   1. Starter              – ₹4,999/mo  (individual)
 *   2. Professional          – ₹8,999/mo  (individual)
 *   3. Firm                  – ₹9,999/mo  (firm owner)
 *   4. Starter Seat          – ₹4,999/mo  (per-member seat, starter tier)
 *   5. Professional Seat     – ₹8,999/mo  (per-member seat, professional tier)
 *
 * Output: Plan IDs to add to your .env file
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.production') });
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
    key_id: "rzp_live_SDP3lAYaf3uoiv",
    key_secret: "ktKelOL130OpOj77DsiHK7c0"
});

const plans = [
    { item: { name: 'LawFirmAI Starter',             amount: 100, currency: 'INR', description: 'Starter plan – 5 cases/mo, 3 AI investigations' },               period: 'monthly', interval: 1, envKey: 'RAZORPAY_PLAN_STARTER' },
    { item: { name: 'LawFirmAI Professional',       amount: 200, currency: 'INR', description: 'Professional plan – 20 cases/mo, 8 AI investigations' },          period: 'monthly', interval: 1, envKey: 'RAZORPAY_PLAN_PROFESSIONAL' },
    { item: { name: 'LawFirmAI Firm',               amount: 300, currency: 'INR', description: 'Firm plan – 20 cases/mo, org management, admin' },               period: 'monthly', interval: 1, envKey: 'RAZORPAY_PLAN_FIRM' },
    { item: { name: 'LawFirmAI Starter Seat',       amount: 100, currency: 'INR', description: 'Starter seat – 5 cases/mo, 3 AI investigations per member' },     period: 'monthly', interval: 1, envKey: 'RAZORPAY_PLAN_SEAT_STARTER' },
    { item: { name: 'LawFirmAI Professional Seat',  amount: 200, currency: 'INR', description: 'Professional seat – 20 cases/mo, 8 AI investigations per member' }, period: 'monthly', interval: 1, envKey: 'RAZORPAY_PLAN_SEAT_PROFESSIONAL' },
];

async function createPlans() {
    console.log('Creating Razorpay subscription plans...\n');

    const envLines = [];

    for (const plan of plans) {
        try {
            const created = await razorpay.plans.create({
                period: plan.period,
                interval: plan.interval,
                item: plan.item
            });
            console.log(`✓ ${plan.item.name}: ${created.id}`);
            envLines.push(`${plan.envKey}=${created.id}`);
        } catch (err) {
            console.error(`✗ ${plan.item.name}: ${err.error?.description || err.message}`);
            envLines.push(`# ${plan.envKey}=FAILED`);
        }
    }

    console.log('\n--- Add these to your .env file ---');
    console.log(envLines.join('\n'));
    console.log('RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here');
}

createPlans().catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
});
