const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: function() { return !this.attachment; }
    },
    read: {
        type: Boolean,
        default: false
    },
    attachment: {
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        url: String
    }
}, {
    timestamps: true
});

// Index for efficient retrieval of conversation
messageSchema.index({ sender: 1, recipient: 1, createdAt: 1 });
messageSchema.index({ recipient: 1, sender: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
