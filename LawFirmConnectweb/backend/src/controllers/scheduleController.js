const crypto = require('crypto');
const Event = require('../models/Event');
const createNotification = require('../utils/createNotification');

// Get events — visible to both creator and attendees
exports.getEvents = async (req, res) => {
    try {
        const events = await Event.find({
            $or: [
                { user: req.user._id },
                { attendees: req.user._id }
            ]
        })
        .populate('attendees', 'firstName lastName email _id')
        .sort({ startDate: 1 });

        res.json(events);
    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create event — auto-generate Jitsi link if online meeting
exports.createEvent = async (req, res) => {
    try {
        const eventData = {
            ...req.body,
            user: req.user._id
        };

        // Auto-generate Jitsi Meet link for online meetings
        if (eventData.isOnlineMeeting) {
            const meetingId = `lawfirm-${crypto.randomBytes(8).toString('hex')}`;
            eventData.meetingLink = `https://meet.jit.si/${meetingId}`;
        }

        const event = await Event.create(eventData);
        await event.populate('attendees', 'firstName lastName email _id');

        // Notify attendees
        if (req.body.attendees && Array.isArray(req.body.attendees)) {
            const io = req.app.get('socketio');
            const creatorName = `${req.user.firstName} ${req.user.lastName || ''}`.trim();
            for (const attendeeId of req.body.attendees) {
                if (attendeeId.toString() !== req.user._id.toString()) {
                    await createNotification(io, {
                        recipient: attendeeId,
                        type: 'calendar',
                        title: 'New Event',
                        description: `${creatorName} invited you to "${event.title}"`,
                        link: '/portal/calendar'
                    });
                }
            }
        }

        res.status(201).json(event);
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete event — notify attendees
exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        if (event.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Notify attendees about cancellation
        if (event.attendees && event.attendees.length > 0) {
            const io = req.app.get('socketio');
            const creatorName = `${req.user.firstName} ${req.user.lastName || ''}`.trim();
            for (const attendeeId of event.attendees) {
                if (attendeeId.toString() !== req.user._id.toString()) {
                    await createNotification(io, {
                        recipient: attendeeId,
                        type: 'calendar',
                        title: 'Event Cancelled',
                        description: `${creatorName} cancelled "${event.title}"`,
                        link: '/portal/calendar'
                    });
                }
            }
        }

        await event.deleteOne();
        res.json({ message: 'Event removed' });
    } catch (error) {
        console.error('Delete event error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update event — handle meeting link toggling + notify new attendees
exports.updateEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        if (event.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const updateData = { ...req.body };

        // If toggling online meeting on and no meeting link exists
        if (updateData.isOnlineMeeting && !event.meetingLink) {
            const meetingId = `lawfirm-${crypto.randomBytes(8).toString('hex')}`;
            updateData.meetingLink = `https://meet.jit.si/${meetingId}`;
        }

        // If toggling online meeting off, clear meeting link
        if (updateData.isOnlineMeeting === false) {
            updateData.meetingLink = null;
        }

        // Find newly added attendees to notify
        const oldAttendeeIds = (event.attendees || []).map(id => id.toString());
        const newAttendeeIds = (updateData.attendees || []).map((id) => id.toString());
        const addedAttendees = newAttendeeIds.filter(id => !oldAttendeeIds.includes(id));

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('attendees', 'firstName lastName email _id');

        // Notify newly added attendees
        if (addedAttendees.length > 0) {
            const io = req.app.get('socketio');
            const creatorName = `${req.user.firstName} ${req.user.lastName || ''}`.trim();
            for (const attendeeId of addedAttendees) {
                if (attendeeId !== req.user._id.toString()) {
                    await createNotification(io, {
                        recipient: attendeeId,
                        type: 'calendar',
                        title: 'New Event',
                        description: `${creatorName} invited you to "${updatedEvent.title}"`,
                        link: '/portal/calendar'
                    });
                }
            }
        }

        res.json(updatedEvent);
    } catch (error) {
        console.error('Update event error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Search users in same organization for attendee autocomplete
exports.searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || !q.trim()) {
            return res.json([]);
        }

        const User = require('../models/User');
        const currentUser = await User.findById(req.user._id);
        if (!currentUser) return res.json([]);

        const searchRegex = new RegExp(q.trim(), 'i');

        // Find users in same organization (or all contacts if no org)
        const query = {
            _id: { $ne: req.user._id },
            $or: [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { email: searchRegex }
            ]
        };

        if (currentUser.organization) {
            query.organization = currentUser.organization;
        }

        const users = await User.find(query)
            .select('firstName lastName email _id')
            .limit(10);

        res.json(users);
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
