/**
 * One-time migration: ATTORNEY → ADVOCATE
 *
 * Run: node backend/src/scripts/migrateRoles.js
 *
 * Updates:
 * 1. User.role: "ATTORNEY" → "ADVOCATE"
 * 2. Organization.members[].role: "ATTORNEY" → "ADVOCATE"
 * 3. User.subscriptionPlan: "ENTERPRISE" → null (no longer valid)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

async function migrate() {
    if (!MONGO_URI) {
        console.error('MONGO_URI not set in .env');
        process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // 1. Update User roles
    const userResult = await db.collection('users').updateMany(
        { role: 'ATTORNEY' },
        { $set: { role: 'ADVOCATE' } }
    );
    console.log(`Users updated: ${userResult.modifiedCount} (ATTORNEY → ADVOCATE)`);

    // 2. Update Organization member roles
    const orgResult = await db.collection('organizations').updateMany(
        { 'members.role': 'ATTORNEY' },
        { $set: { 'members.$[elem].role': 'ADVOCATE' } },
        { arrayFilters: [{ 'elem.role': 'ATTORNEY' }] }
    );
    console.log(`Organizations updated: ${orgResult.modifiedCount} (member roles ATTORNEY → ADVOCATE)`);

    // 3. Clear invalid ENTERPRISE plan references
    const planResult = await db.collection('users').updateMany(
        { subscriptionPlan: 'ENTERPRISE' },
        { $set: { subscriptionPlan: null } }
    );
    console.log(`Users updated: ${planResult.modifiedCount} (ENTERPRISE plan cleared)`);

    await mongoose.disconnect();
    console.log('Migration complete');
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
