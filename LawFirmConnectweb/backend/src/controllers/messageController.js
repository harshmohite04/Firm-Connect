const Message = require('../models/Message');
const createNotification = require('../utils/createNotification');

// Get messages for a specific conversation
exports.getMessages = async (req, res) => {
    try {
        const { contactId } = req.params;
        const userId = req.user._id;

        const messages = await Message.find({
            $or: [
                { sender: userId, recipient: contactId },
                { sender: contactId, recipient: userId }
            ]
        }).sort({ createdAt: 1 });

        // Replace content of deleted messages with placeholder
        const sanitized = messages.map(m => {
            if (m.deleted) {
                const obj = m.toObject();
                obj.content = 'This message was deleted';
                obj.attachment = null;
                return obj;
            }
            return m;
        });

        res.json(sanitized);
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Send a message (supports file attachment via multipart/form-data)
exports.sendMessage = async (req, res) => {
    try {
        const { contactId, content } = req.body;
        const userId = req.user._id;

        if (!contactId || (!content && !req.file)) {
            return res.status(400).json({ message: 'Recipient and content or attachment are required' });
        }

        const messageData = {
            sender: userId,
            recipient: contactId,
            content: content || ''
        };

        // If file was uploaded, add attachment metadata
        if (req.file) {
            messageData.attachment = {
                filename: req.file.filename,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size,
                url: req.file.location || `/uploads/${req.file.filename}`
            };
        }

        const newMessage = await Message.create(messageData);

        await newMessage.populate('sender', 'firstName lastName _id');
        await newMessage.populate('recipient', 'firstName lastName _id');

        // Emit real-time event
        const io = req.app.get('socketio');
        if (io) {
            io.to(contactId).emit('newMessage', newMessage);
            io.to(userId.toString()).emit('newMessage', newMessage);
        }

        // Create notification for the recipient
        const senderName = `${req.user.firstName} ${req.user.lastName || ''}`.trim();
        await createNotification(io, {
            recipient: contactId,
            type: 'message',
            title: 'New Message',
            description: `${senderName} sent you a message`,
            link: '/portal/messages'
        });

        res.status(201).json(newMessage);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete a message (soft delete - sender only)
exports.deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        if (message.sender.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'You can only delete your own messages' });
        }

        message.deleted = true;
        await message.save();

        // Emit real-time event to both users
        const io = req.app.get('socketio');
        if (io) {
            io.to(message.recipient.toString()).emit('messageDeleted', {
                messageId: message._id.toString(),
                conversationContactId: userId.toString()
            });
            io.to(userId.toString()).emit('messageDeleted', {
                messageId: message._id.toString(),
                conversationContactId: message.recipient.toString()
            });
        }

        res.json({ message: 'Message deleted' });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Mark messages as read
exports.markMessagesRead = async (req, res) => {
    try {
        const { contactId } = req.params;
        const userId = req.user._id;

        const result = await Message.updateMany(
            { sender: contactId, recipient: userId, read: false },
            { $set: { read: true } }
        );

        const io = req.app.get('socketio');
        if (io && result.modifiedCount > 0) {
            io.to(contactId).emit('messagesRead', {
                recipientId: userId.toString(),
                contactId: contactId
            });
        }

        res.json({ message: 'Messages marked as read', count: result.modifiedCount });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get total unread count
exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user._id;
        const count = await Message.countDocuments({ recipient: userId, read: false });
        res.json({ count });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get conversations with last message and unread count
exports.getConversations = async (req, res) => {
    try {
        const userId = req.user._id;
        const User = require('../models/User');

        const user = await User.findById(userId).populate('contacts', 'firstName lastName _id');
        if (!user || !user.contacts) {
            return res.json([]);
        }

        const conversationsData = await Promise.all(user.contacts.map(async (contact) => {
            const contactUserId = contact._id;

            const lastMessage = await Message.findOne({
                $or: [
                    { sender: userId, recipient: contactUserId },
                    { sender: contactUserId, recipient: userId }
                ]
            }).sort({ createdAt: -1 }).limit(1);

            const unreadCount = await Message.countDocuments({
                sender: contactUserId,
                recipient: userId,
                read: false
            });

            return {
                contactId: contactUserId.toString(),
                name: `${contact.firstName} ${contact.lastName || ''}`.trim(),
                lastMessage: lastMessage ? {
                    content: lastMessage.deleted ? 'This message was deleted' : lastMessage.content,
                    timestamp: lastMessage.createdAt,
                    senderId: lastMessage.sender.toString(),
                    attachment: lastMessage.deleted ? null : (lastMessage.attachment || null)
                } : null,
                unreadCount
            };
        }));

        const sortedConversations = conversationsData
            .sort((a, b) => {
                if (!a.lastMessage && !b.lastMessage) return 0;
                if (!a.lastMessage) return 1;
                if (!b.lastMessage) return -1;
                return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime();
            });

        res.json(sortedConversations);
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Search conversations by contact name/email
exports.searchConversations = async (req, res) => {
    try {
        const userId = req.user._id;
        const { q } = req.query;
        const User = require('../models/User');

        if (!q || !q.trim()) {
            return res.json([]);
        }

        const searchRegex = new RegExp(q.trim(), 'i');

        const user = await User.findById(userId).populate('contacts', 'firstName lastName email _id');
        if (!user || !user.contacts) {
            return res.json([]);
        }

        const matchingContacts = user.contacts.filter(c =>
            searchRegex.test(c.firstName) ||
            searchRegex.test(c.lastName) ||
            searchRegex.test(c.email) ||
            searchRegex.test(`${c.firstName} ${c.lastName}`)
        );

        const results = await Promise.all(matchingContacts.map(async (contact) => {
            const lastMessage = await Message.findOne({
                $or: [
                    { sender: userId, recipient: contact._id },
                    { sender: contact._id, recipient: userId }
                ]
            }).sort({ createdAt: -1 }).limit(1);

            return {
                contactId: contact._id.toString(),
                name: `${contact.firstName} ${contact.lastName || ''}`.trim(),
                email: contact.email,
                lastMessage: lastMessage ? {
                    content: lastMessage.content,
                    timestamp: lastMessage.createdAt,
                    senderId: lastMessage.sender.toString()
                } : null
            };
        }));

        res.json(results);
    } catch (error) {
        console.error('Search conversations error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Search messages within a conversation
exports.searchMessages = async (req, res) => {
    try {
        const userId = req.user._id;
        const { userId: contactId, q } = req.query;

        if (!contactId || !q || !q.trim()) {
            return res.json([]);
        }

        const searchRegex = new RegExp(q.trim(), 'i');

        const messages = await Message.find({
            $or: [
                { sender: userId, recipient: contactId },
                { sender: contactId, recipient: userId }
            ],
            content: searchRegex
        }).sort({ createdAt: -1 }).limit(50);

        res.json(messages);
    } catch (error) {
        console.error('Search messages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
