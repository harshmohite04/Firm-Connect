const User = require('../models/User');
const Case = require('../models/Case');
const Message = require('../models/Message');
const ContactSubmission = require('../models/ContactSubmission');

// ==================== DASHBOARD ====================

const getStats = async (req, res, next) => {
    try {
        const [totalUsers, activeCases, activeSubscriptions, revenueResult] = await Promise.all([
            User.countDocuments(),
            Case.countDocuments({ status: { $in: ['Open', 'In Progress'] }, recordStatus: 1 }),
            User.countDocuments({ subscriptionStatus: 'ACTIVE' }),
            Case.aggregate([
                { $unwind: '$billing' },
                { $match: { 'billing.status': 'Paid' } },
                { $group: { _id: null, total: { $sum: '$billing.amount' } } }
            ])
        ]);

        res.json({
            totalUsers,
            activeCases,
            activeSubscriptions,
            totalRevenue: revenueResult.length > 0 ? revenueResult[0].total : 0
        });
    } catch (error) {
        next(error);
    }
};

const getRecentActivity = async (req, res, next) => {
    try {
        const [recentUsers, recentCases, recentContacts] = await Promise.all([
            User.find().select('firstName lastName email role createdAt').sort({ createdAt: -1 }).limit(5),
            Case.find({ recordStatus: 1 }).select('title status legalMatter createdAt clientId')
                .populate('clientId', 'firstName lastName').sort({ createdAt: -1 }).limit(5),
            ContactSubmission.find().sort({ createdAt: -1 }).limit(5)
        ]);

        res.json({ recentUsers, recentCases, recentContacts });
    } catch (error) {
        next(error);
    }
};

// ==================== USER MANAGEMENT ====================

const getUsers = async (req, res, next) => {
    try {
        const { search, role, subscriptionStatus, page = 1, limit = 20 } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        if (role) query.role = role;
        if (subscriptionStatus) query.subscriptionStatus = subscriptionStatus;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [users, total] = await Promise.all([
            User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
            User.countDocuments(query)
        ]);

        res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    } catch (error) {
        next(error);
    }
};

const getUserDetail = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        const [cases, messages, billingCases] = await Promise.all([
            Case.find({
                recordStatus: 1,
                $or: [
                    { clientId: user._id },
                    { assignedLawyers: user._id },
                    { leadAttorneyId: user._id },
                    { 'teamMembers.userId': user._id }
                ]
            }).select('title status legalMatter createdAt documents billing').sort({ createdAt: -1 }),

            Message.aggregate([
                { $match: { $or: [{ sender: user._id }, { recipient: user._id }] } },
                { $sort: { createdAt: -1 } },
                { $group: {
                    _id: { $cond: [{ $eq: ['$sender', user._id] }, '$recipient', '$sender'] },
                    lastMessage: { $first: '$content' },
                    lastDate: { $first: '$createdAt' },
                    unreadCount: {
                        $sum: { $cond: [{ $and: [{ $eq: ['$recipient', user._id] }, { $eq: ['$read', false] }] }, 1, 0] }
                    }
                }},
                { $sort: { lastDate: -1 } },
                { $limit: 10 },
                { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'contact' } },
                { $unwind: '$contact' },
                { $project: {
                    contactName: { $concat: ['$contact.firstName', ' ', { $ifNull: ['$contact.lastName', ''] }] },
                    contactEmail: '$contact.email',
                    lastMessage: 1, lastDate: 1, unreadCount: 1
                }}
            ]),

            Case.find({
                recordStatus: 1,
                $or: [
                    { clientId: user._id },
                    { assignedLawyers: user._id },
                    { leadAttorneyId: user._id }
                ],
                'billing.0': { $exists: true }
            }).select('billing')
        ]);

        const billing = billingCases.reduce((acc, c) => {
            return acc.concat(c.billing.map(b => ({ ...b.toObject(), caseId: c._id })));
        }, []);

        res.json({ user, cases, messages, billing });
    } catch (error) {
        next(error);
    }
};

const changeUserRole = async (req, res, next) => {
    try {
        const { role } = req.body;
        if (!['CLIENT', 'ATTORNEY', 'PARALEGAL', 'ADMIN'].includes(role)) {
            res.status(400);
            throw new Error('Invalid role');
        }

        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
        if (!user) { res.status(404); throw new Error('User not found'); }
        res.json(user);
    } catch (error) {
        next(error);
    }
};

const toggleAdminStatus = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) { res.status(404); throw new Error('User not found'); }

        user.isAdmin = !user.isAdmin;
        await user.save();
        res.json({ _id: user._id, isAdmin: user.isAdmin });
    } catch (error) {
        next(error);
    }
};

const resetUserPassword = async (req, res, next) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            res.status(400);
            throw new Error('Password must be at least 6 characters');
        }

        const user = await User.findById(req.params.id);
        if (!user) { res.status(404); throw new Error('User not found'); }

        user.password = newPassword;
        user.failedLoginAttempts = 0;
        user.lockUntil = null;
        await user.save();

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        next(error);
    }
};

const unlockUserAccount = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { failedLoginAttempts: 0, lockUntil: null },
            { new: true }
        ).select('-password');

        if (!user) { res.status(404); throw new Error('User not found'); }
        res.json({ message: 'Account unlocked', user });
    } catch (error) {
        next(error);
    }
};

// ==================== SUBSCRIPTIONS ====================

const getSubscriptions = async (req, res, next) => {
    try {
        const { status, plan, page = 1, limit = 20 } = req.query;
        const query = {};
        if (status) query.subscriptionStatus = status;
        if (plan) query.subscriptionPlan = plan;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [users, total, activeCount, inactiveCount] = await Promise.all([
            User.find(query).select('firstName lastName email subscriptionStatus subscriptionPlan subscriptionExpiresAt')
                .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
            User.countDocuments(query),
            User.countDocuments({ subscriptionStatus: 'ACTIVE' }),
            User.countDocuments({ subscriptionStatus: 'INACTIVE' })
        ]);

        res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), activeCount, inactiveCount });
    } catch (error) {
        next(error);
    }
};

const updateSubscription = async (req, res, next) => {
    try {
        const { subscriptionStatus, subscriptionPlan, days, subscriptionExpiresAt } = req.body;
        const user = await User.findById(req.params.userId);
        if (!user) { res.status(404); throw new Error('User not found'); }

        if (subscriptionStatus) user.subscriptionStatus = subscriptionStatus;
        if (subscriptionPlan) user.subscriptionPlan = subscriptionPlan;

        if (days) {
            user.subscriptionExpiresAt = new Date(Date.now() + parseInt(days) * 24 * 60 * 60 * 1000);
        } else if (subscriptionExpiresAt) {
            user.subscriptionExpiresAt = new Date(subscriptionExpiresAt);
        }

        await user.save();
        res.json({
            _id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email,
            subscriptionStatus: user.subscriptionStatus, subscriptionPlan: user.subscriptionPlan,
            subscriptionExpiresAt: user.subscriptionExpiresAt
        });
    } catch (error) {
        next(error);
    }
};

// ==================== CASES ====================

const getCases = async (req, res, next) => {
    try {
        const { status, legalMatter, search, page = 1, limit = 20 } = req.query;
        const query = { recordStatus: 1 };
        if (status) query.status = status;
        if (legalMatter) query.legalMatter = legalMatter;
        if (search) query.title = { $regex: search, $options: 'i' };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [cases, total] = await Promise.all([
            Case.find(query)
                .populate('clientId', 'firstName lastName email')
                .populate('leadAttorneyId', 'firstName lastName')
                .populate('assignedLawyers', 'firstName lastName')
                .sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
            Case.countDocuments(query)
        ]);

        res.json({ cases, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    } catch (error) {
        next(error);
    }
};

const updateCaseStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        if (!['Open', 'In Progress', 'Closed', 'Paused'].includes(status)) {
            res.status(400);
            throw new Error('Invalid status');
        }

        const caseDoc = await Case.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!caseDoc) { res.status(404); throw new Error('Case not found'); }
        res.json(caseDoc);
    } catch (error) {
        next(error);
    }
};

const assignLawyer = async (req, res, next) => {
    try {
        const { lawyerId } = req.body;
        const lawyer = await User.findById(lawyerId);
        if (!lawyer || !['ATTORNEY', 'ADMIN'].includes(lawyer.role)) {
            res.status(400);
            throw new Error('Invalid lawyer');
        }

        const caseDoc = await Case.findById(req.params.id);
        if (!caseDoc) { res.status(404); throw new Error('Case not found'); }

        if (!caseDoc.assignedLawyers.includes(lawyerId)) {
            caseDoc.assignedLawyers.push(lawyerId);
        }
        if (!caseDoc.leadAttorneyId) {
            caseDoc.leadAttorneyId = lawyerId;
        }

        await caseDoc.save();
        const updated = await Case.findById(caseDoc._id)
            .populate('assignedLawyers', 'firstName lastName')
            .populate('leadAttorneyId', 'firstName lastName');
        res.json(updated);
    } catch (error) {
        next(error);
    }
};

// ==================== CONTACT SUBMISSIONS ====================

const getContactSubmissions = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const query = {};
        if (status) query.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [submissions, total] = await Promise.all([
            ContactSubmission.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
            ContactSubmission.countDocuments(query)
        ]);

        res.json({ submissions, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    } catch (error) {
        next(error);
    }
};

const updateContactSubmission = async (req, res, next) => {
    try {
        const { status, notes } = req.body;
        const update = {};
        if (status) update.status = status;
        if (notes !== undefined) update.notes = notes;

        const submission = await ContactSubmission.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!submission) { res.status(404); throw new Error('Submission not found'); }
        res.json(submission);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getStats, getRecentActivity,
    getUsers, getUserDetail, changeUserRole, toggleAdminStatus, resetUserPassword, unlockUserAccount,
    getSubscriptions, updateSubscription,
    getCases, updateCaseStatus, assignLawyer,
    getContactSubmissions, updateContactSubmission
};
