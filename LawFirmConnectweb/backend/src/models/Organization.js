const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    plan: {
        type: String,
        enum: ['FIRM'],
        required: true
    },
    razorpaySubscriptionId: { type: String, default: null },
    seats: [{
        razorpaySubscriptionId: String,
        plan: { type: String, enum: ['STARTER', 'PROFESSIONAL'] },
        status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        createdAt: { type: Date, default: Date.now }
    }],
    members: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        role: {
            type: String,
            enum: ['ADMIN', 'ADVOCATE'],
            default: 'ADVOCATE'
        },
        status: {
            type: String,
            enum: ['ACTIVE', 'PENDING', 'REMOVED'],
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

// Virtual to get active seat count
organizationSchema.virtual('activeSeats').get(function() {
    return this.seats ? this.seats.filter(s => s.status === 'ACTIVE').length : 0;
});

// Ensure virtuals are included in JSON
organizationSchema.set('toJSON', { virtuals: true });
organizationSchema.set('toObject', { virtuals: true });

const Organization = mongoose.model('Organization', organizationSchema);
module.exports = Organization;
