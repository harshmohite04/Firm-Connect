const mongoose = require('mongoose');
const crypto = require('crypto');

const caseTeamInvitationSchema = new mongoose.Schema({
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
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
        required: true
    },
    role: {
        type: String,
        default: 'Member'
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
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
        default: () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
    },
    acceptedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Generate unique token before saving
caseTeamInvitationSchema.pre('validate', function(next) {
    if (!this.token) {
        this.token = crypto.randomBytes(32).toString('hex');
    }
    next();
});

const CaseTeamInvitation = mongoose.model('CaseTeamInvitation', caseTeamInvitationSchema);
module.exports = CaseTeamInvitation;
