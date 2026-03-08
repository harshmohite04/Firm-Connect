const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Please add a title']
    },
    description: String,
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    startTime: String,
    endTime: String,
    allDay: {
        type: Boolean,
        default: false
    },
    location: String,
    attendees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case'
    },
    type: {
        type: String,
        default: 'Meeting'
    },
    status: {
        type: String,
        default: 'Scheduled'
    },
    isOnlineMeeting: {
        type: Boolean,
        default: false
    },
    meetingLink: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);
