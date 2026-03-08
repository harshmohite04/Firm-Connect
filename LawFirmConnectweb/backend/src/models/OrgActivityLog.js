const mongoose = require('mongoose');

const orgActivityLogSchema = new mongoose.Schema({
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    action: {
        type: String,
        enum: [
            'MEMBER_JOINED', 'MEMBER_REMOVED', 'MEMBER_LEFT',
            'SEAT_ADDED', 'SEAT_CANCELLED',
            'INVITE_SENT', 'INVITE_ACCEPTED', 'INVITE_DECLINED', 'INVITE_REVOKED',
            'ORG_UPDATED', 'ORG_DELETED'
        ],
        required: true
    },
    actorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

orgActivityLogSchema.index({ organizationId: 1, createdAt: -1 });

const OrgActivityLog = mongoose.model('OrgActivityLog', orgActivityLogSchema);
module.exports = OrgActivityLog;
