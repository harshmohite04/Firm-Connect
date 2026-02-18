const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 15;

const userSchema = new mongoose.Schema(
    {
        firstName: { type: String, required: true },
        lastName: { type: String, required: false },
        email: { type: String, required: true, unique: true },
        phone: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: {
            type: String,
            enum: ['ATTORNEY', 'CLIENT', 'ADMIN', 'PARALEGAL'],
            default: 'CLIENT',
        },
        status: { type: String, enum: ['PENDING', 'VERIFIED'], default: 'PENDING' },
        isAdmin: { type: Boolean, default: false },
        contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        failedLoginAttempts: { type: Number, default: 0 },
        lockUntil: { type: Date, default: null },
        subscriptionStatus: {
            type: String,
            enum: ['ACTIVE', 'INACTIVE'],
            default: 'INACTIVE',
        },
        subscriptionPlan: {
            type: String,
            enum: ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'],
            default: null,
        },
        subscriptionExpiresAt: { type: Date, default: null },
    },
    { timestamps: true }
);

userSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.methods.incrementLoginAttempts = async function () {
    this.failedLoginAttempts += 1;
    if (this.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        this.lockUntil = new Date(Date.now() + LOCK_TIME_MINUTES * 60 * 1000);
    }
    await this.save();
};

userSchema.methods.resetLoginAttempts = async function () {
    this.failedLoginAttempts = 0;
    this.lockUntil = null;
    await this.save();
};

userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
