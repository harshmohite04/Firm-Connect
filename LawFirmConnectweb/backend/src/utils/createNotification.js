const Notification = require('../models/Notification');

/**
 * Create a notification, save to DB, and emit via Socket.IO
 * @param {object} io - Socket.IO server instance
 * @param {object} params - Notification parameters
 * @param {string} params.recipient - User ID of the recipient
 * @param {string} params.type - Notification type: case | message | calendar | billing | system
 * @param {string} params.title - Notification title
 * @param {string} params.description - Notification description
 * @param {string} [params.link] - Optional navigation link
 * @param {object} [params.metadata] - Optional extra data
 */
const createNotification = async (io, { recipient, type, title, description, link, metadata }) => {
    try {
        const notification = await Notification.create({
            recipient,
            type,
            title,
            description,
            link,
            metadata
        });

        if (io) {
            io.to(recipient.toString()).emit('newNotification', {
                _id: notification._id,
                type: notification.type,
                title: notification.title,
                description: notification.description,
                link: notification.link,
                read: notification.read,
                createdAt: notification.createdAt,
                metadata: notification.metadata
            });
        }

        return notification;
    } catch (error) {
        console.error('Failed to create notification:', error);
    }
};

module.exports = createNotification;
