const path = require('path');
const rootEnvPath = path.join(__dirname, '..', '..', '..', '.env');
const devEnvPath = path.join(__dirname, '..', '..', '..', '.env.development');

console.log('Loading env from:', rootEnvPath);
require('dotenv').config({ path: rootEnvPath });
console.log('Loading env from:', devEnvPath);
require('dotenv').config({ path: devEnvPath, override: true });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Organization = require('../src/models/Organization');

const testOrgFlow = async () => {
    try {
        console.log('Connecting to DB...');
        if (!process.env.MONGO_URI) {
            // Check if we have MONGODB_URI instead?
            console.log('Env keys:', Object.keys(process.env).filter(k => k.includes('MONGO')));
            throw new Error('MONGO_URI is undefined in env');
        }
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        // 1. Find an Admin
        console.log('Finding an Admin user...');
        const admin = await User.findOne({ role: 'ADMIN' });
        if (!admin) {
            console.error('No admin found. Please seed the database.');
            process.exit(1);
        }
        console.log(`Found Admin: ${admin.email}`);

        // 2. Find their Org
        const org = await Organization.findById(admin.organizationId);
        if (!org) {
            console.error('Admin has no organization.');
            process.exit(1);
        }
        console.log(`Organization: ${org.name}, Seats: ${org.members.length}/${org.maxSeats}`);

        // 3. Simulate Seat Limit Check (Dry Run)
        const activeMembers = org.members.filter(m => m.status === 'ACTIVE').length;
        console.log(`Active Members: ${activeMembers}`);
        if (activeMembers >= org.maxSeats) {
            console.log('⚠️  Organization is full. Cannot test invite flow without increasing seats.');
        } else {
            console.log('✅  Seats available. Invite flow ready to be tested via API.');
        }

        console.log('\n--- Transaction Support Check ---');
        try {
            const session = await mongoose.startSession();
            session.startTransaction();
            console.log('✅  Transaction started successfully (Replica Set is active).');
            await session.abortTransaction();
            session.endSession();
        } catch (error) {
            console.warn('⚠️  Transaction failed to start. Is MongoDB running as a Replica Set?');
            console.warn('   Note: Transactions require a Replica Set. If using standalone Mongo, transactions may fail.');
            console.warn(`   Error: ${error.message}`);
        }

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
};

testOrgFlow();
