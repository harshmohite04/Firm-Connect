const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    plan: {
        type: String,
        enum: ['STARTER', 'PROFESSIONAL'],
        required: true
    },
    maxSeats: {
        type: Number,
        required: true,
        default: 2
    },
    members: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        role: {
            type: String,
            enum: ['ADMIN', 'ATTORNEY'],
            default: 'ATTORNEY'
        },
        status: {
            type: String,
            enum: ['ACTIVE', 'REMOVED'],
            default: 'ACTIVE'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        removedAt: {
            type: Date,
            default: null
        }
    }],
    subscriptionStatus: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE'],
        default: 'ACTIVE'
    },
    subscriptionExpiresAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Virtual to get active member count
organizationSchema.virtual('activeMemberCount').get(function() {
    return this.members.filter(m => m.status === 'ACTIVE').length;
});

// Virtual to check if seats are available
organizationSchema.virtual('hasAvailableSeats').get(function() {
    return this.activeMemberCount < this.maxSeats;
});

// Ensure virtuals are included in JSON
organizationSchema.set('toJSON', { virtuals: true });
organizationSchema.set('toObject', { virtuals: true });

const Organization = mongoose.model('Organization', organizationSchema);
module.exports = Organization;
