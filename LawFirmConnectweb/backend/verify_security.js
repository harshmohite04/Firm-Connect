const axios = require('axios');

const API_URL = 'http://localhost:5000';

const timestamp = Date.now();
const userA = {
    email: `usera_${timestamp}@example.com`,
    password: 'TestPassword123!',
    firstName: 'User',
    lastName: 'A',
    phone: `12345${String(timestamp).slice(-5)}`
};

const userB = {
    email: `userb_${timestamp}@example.com`,
    password: 'TestPassword123!',
    firstName: 'User',
    lastName: 'B',
    phone: `09876${String(timestamp).slice(-5)}`
};

let tokenA = '';
let tokenB = '';
let caseIdA = '';

const registerOrLogin = async (user) => {
    try {
        // Try login
        let res = await axios.post(`${API_URL}/auth/login`, {
            email: user.email,
            password: user.password
        });
        return res.data.token;
    } catch (err) {
        if (err.response && err.response.status === 401) {
            // Register if login fails (assuming user doesn't exist or wrong password, but here we assume clean slate or consistent data)
             try {
                let res = await axios.post(`${API_URL}/auth/register`, user);
                return res.data.token;
             } catch(regErr) {
                 console.error(`Failed to register ${user.email}:`, regErr.response ? regErr.response.data : regErr.message);
                 // Maybe user exists but password matches? Retry login if 400 'User already exists'
                 if(regErr.response && regErr.response.data.message.includes('already exists')) {
                     // If we got here, it means login failed but register says user exists. 
                     // This implies password changed or DB inconsistent. 
                     // For this simple script, we'll stop.
                     throw new Error(`User ${user.email} exists but login failed.`);
                 }
             }
        }
        console.error(`Login failed for ${user.email}:`, err.response ? err.response.data : err.message);
        throw err;
    }
};

const runVerification = async () => {
    console.log('--- Starting Security Verification ---');

    // 1. Authenticate Users
    try {
        console.log('Authenticating User A...');
        tokenA = await registerOrLogin(userA);
        console.log('User A Authenticated.');

        console.log('Authenticating User B...');
        tokenB = await registerOrLogin(userB);
        console.log('User B Authenticated.');
    } catch (e) {
        console.error('Authentication failed, cannot proceed.');
        return;
    }

    // 2. User A creates a case
    try {
        console.log('User A creating a case...');
        const res = await axios.post(`${API_URL}/cases`, {
            title: 'Security Test Case',
            description: 'Testing authorization',
            legalMatter: 'Corporate',
            assignedLawyers: [] 
        }, {
            headers: { Authorization: `Bearer ${tokenA}` }
        });
        caseIdA = res.data._id;
        console.log(`Case created by User A. ID: ${caseIdA}`);
    } catch (e) {
        console.error('Failed to create case:', e.response ? e.response.data : e.message);
        return;
    }

    // 3. User B attempts to access User A's case
    try {
        console.log(`User B attempting to access Case ${caseIdA}...`);
        await axios.get(`${API_URL}/cases/${caseIdA}`, {
            headers: { Authorization: `Bearer ${tokenB}` }
        });
        console.error('❌ FAILURE: User B was able to access the case! Authorization is BROKEN.');
    } catch (e) {
        if (e.response && (e.response.status === 403 || e.response.status === 401)) {
            console.log('✅ SUCCESS: User B was denied access (403/401).');
        } else {
            console.error(`❌ UNEXPECTED ERROR: ${e.message}`, e.response ? e.response.status : '');
        }
    }

    // 4. User A attempts to access their own case
    try {
        console.log(`User A attempting to access Case ${caseIdA}...`);
        await axios.get(`${API_URL}/cases/${caseIdA}`, {
            headers: { Authorization: `Bearer ${tokenA}` }
        });
        console.log('✅ SUCCESS: User A can access their own case.');
    } catch (e) {
        console.error('❌ FAILURE: User A was denied access to their own case!', e.response ? e.response.data : e.message);
    }

    // 5. Test Rate Limiting (Optional - just checking headers on a request)
    try {
        console.log('Checking for Rate Limit headers...');
        const res = await axios.get(`${API_URL}/`, { // Health check or similar
            headers: { Authorization: `Bearer ${tokenA}` }
        });
        const remaining = res.headers['x-ratelimit-remaining'];
        if (remaining) {
            console.log(`✅ SUCCESS: Rate Limit headers present. Remaining: ${remaining}`);
        } else {
            console.log('⚠️ WARNING: No Rate Limit headers found. Middleware might not be active globally or on this route.');
        }
    } catch (e) {
        // Ignore error
    }

    console.log('--- Verification Complete ---');
};

runVerification();
