const mongoose = require('mongoose');
require('dotenv').config();

const email = process.argv[2];

if (!email) {
    console.log('Please provide an email address.');
    process.exit(1);
}

// Define minimal schema inline to avoid import issues
const userSchema = new mongoose.Schema({
    email: String,
    subscriptionStatus: String,
    subscriptionExpiresAt: Date
}, { strict: false });

const User = mongoose.model('User', userSchema);

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/lawfirm')
    .then(async () => {
        console.log(`Searching for user: ${email}`);
        const user = await User.findOne({ email });
        if (user) {
            console.log('User found:');
            console.log(JSON.stringify(user, null, 2));
            
            // Check specific fields
            console.log('--- Checks ---');
            console.log(`Email ends with @harsh.com: ${user.email && user.email.toLowerCase().endsWith('@harsh.com')}`);
            console.log(`Subscription Status: ${user.subscriptionStatus}`);
        } else {
            console.log('User not found.');
        }
        mongoose.disconnect();
    })
    .catch(err => {
        console.error('Database connection error:', err);
    });
