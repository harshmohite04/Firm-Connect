const mongoose = require('mongoose');
const crypto = require('crypto');

const teamInvitationSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    invitedEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    invitedUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    seatId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    seatPlan: {
        type: String,
        enum: ['STARTER', 'PROFESSIONAL'],
        default: null
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'revoked'],
        default: 'pending'
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
    },
    acceptedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Generate unique token before saving
teamInvitationSchema.pre('save', function(next) {
    if (!this.token) {
        this.token = crypto.randomBytes(32).toString('hex');
    }
    next();
});

const TeamInvitation = mongoose.model('TeamInvitation', teamInvitationSchema);
module.exports = TeamInvitation;
