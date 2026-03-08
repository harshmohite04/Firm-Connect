const asyncHandler = require('express-async-handler');
const Case = require('../models/Case');
const Message = require('../models/Message');
const Event = require('../models/Event');
const Notification = require('../models/Notification');

// @desc    Get aggregated dashboard data for logged-in user
// @route   GET /portal/dashboard
// @access  Private
const getDashboard = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const now = new Date();

    const [cases, unreadCount, upcomingEvents, recentNotifications] = await Promise.all([
        Case.find({
            recordStatus: 1,
            $or: [
                { createdBy: userId },
                { assignedLawyers: userId },
                { leadAttorneyId: userId },
                { 'teamMembers.userId': userId }
            ]
        }).sort({ updatedAt: -1 }).lean(),

        Message.countDocuments({ recipient: userId, read: false }),

        Event.find({
            $or: [{ user: userId }, { attendees: userId }],
            startDate: { $gte: now }
        }).sort({ startDate: 1 }).limit(5).populate('attendees', 'firstName lastName').lean(),

        Notification.find({ recipient: userId })
            .sort({ createdAt: -1 }).limit(10).lean()
    ]);

    // Compute case stats
    const activeCases = cases.filter(c => c.status !== 'Closed').length;
    const pendingCases = cases.filter(c => c.status === 'In Progress' || c.status === 'Paused').length;

    // Needs attention items
    const needsAttention = [];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Overdue cases (no activity in 7+ days)
    for (const c of cases) {
        if (c.status === 'Closed') continue;
        const lastActivity = c.activityLog && c.activityLog.length > 0
            ? new Date(c.activityLog[c.activityLog.length - 1].createdAt)
            : new Date(c.updatedAt);
        if (lastActivity < sevenDaysAgo) {
            const daysSinceActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
            needsAttention.push({
                type: 'overdue_case',
                title: c.title,
                caseId: c._id,
                daysSinceActivity
            });
        }
    }

    // Upcoming deadlines (events within 48h)
    for (const event of upcomingEvents) {
        const eventStart = new Date(event.startDate);
        if (eventStart <= fortyEightHoursFromNow) {
            const diffMs = eventStart.getTime() - now.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const startsIn = diffHours < 1 ? 'less than 1h' : `${diffHours}h`;
            needsAttention.push({
                type: 'upcoming_deadline',
                title: event.title,
                eventId: event._id,
                startsIn
            });
        }
    }

    // Unread messages
    if (unreadCount > 0) {
        needsAttention.push({
            type: 'unread_messages',
            count: unreadCount
        });
    }

    // Recent activity — flatten activityLog from all cases
    const allActivities = [];
    for (const c of cases) {
        if (c.activityLog && c.activityLog.length > 0) {
            for (const log of c.activityLog) {
                allActivities.push({
                    type: log.type,
                    description: log.description,
                    caseTitle: c.title,
                    caseId: c._id,
                    createdAt: log.createdAt
                });
            }
        }
    }
    allActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const recentActivity = allActivities.slice(0, 10);

    // Recent cases (top 5 non-closed, most recently updated)
    const recentCases = cases
        .filter(c => c.status !== 'Closed')
        .slice(0, 5)
        .map(c => ({
            _id: c._id,
            title: c.title,
            status: c.status,
            legalMatter: c.legalMatter,
            clientName: c.clientName,
            caseNumber: c.caseNumber,
            updatedAt: c.updatedAt,
            createdAt: c.createdAt
        }));

    res.json({
        stats: {
            activeCases,
            pendingCases,
            unreadMessages: unreadCount,
            upcomingEvents: upcomingEvents.length
        },
        needsAttention: needsAttention.slice(0, 6),
        recentActivity,
        upcomingEvents,
        recentCases
    });
});

module.exports = { getDashboard };
