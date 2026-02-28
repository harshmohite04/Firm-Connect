const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Open', 'In Progress', 'Closed', 'Paused'],
        default: 'Open'
    },
    legalMatter: {
        type: String,
        enum: ['Family Law', 'Corporate', 'Real Estate', 'Litigation', 'Other'],
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        default: null
    },
    assignedLawyers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    documents: [{
        fileName: { type: String, required: true },
        filePath: { type: String, required: true },
        category: {
            type: String,
            enum: ['Court Filings', 'Evidence', 'Correspondence', 'IGR Record', 'General'],
            default: 'General'
        },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        uploadedAt: { type: Date, default: Date.now },
        fileSize: { type: Number },
        source: { type: String, default: 'Upload' }, // 'Upload', 'IGR', etc.
        igr_metadata: mongoose.Schema.Types.Mixed, // Metadata from IGR scraper
        recordStatus: { type: Number, enum: [0, 1], default: 1 }
    }],

    leadAttorneyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    teamMembers: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, default: 'Member' },
        joinedAt: { type: Date, default: Date.now }
    }],
    activityLog: [{
        type: { type: String, required: true },
        description: { type: String, required: true },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        metadata: mongoose.Schema.Types.Mixed,
        createdAt: { type: Date, default: Date.now }
    }],
    billing: [{
        invoiceId: { type: String }, // or ObjectId
        amount: { type: Number },
        description: { type: String },
        status: { type: String, enum: ['Paid', 'Unpaid', 'Pending'], default: 'Unpaid' },
        date: { type: Date, default: Date.now },
        receiptUrl: { type: String } // URL to S3 or local path
    }],
    settings: {
        notifications: {
            email: { type: Boolean, default: true },
            sms: { type: Boolean, default: false }
        }
    },
    propertyDetails: {
        surveyNumber: { type: String },
        ctsNumber: { type: String },
        district: { type: String },
        taluka: { type: String },
        village: { type: String },
        propertyType: {
            type: String,
            enum: ['Agricultural', 'Residential', 'Commercial', 'Industrial'],
            default: 'Residential'
        }
    },
    recordStatus: {
        type: Number,
        enum: [0, 1],
        default: 1
    }
}, {
    timestamps: true
});

const Case = mongoose.model('Case', caseSchema);
module.exports = Case;
