const User = require('../models/User');
const mongoose = require('mongoose');

// ─── Helpers ───────────────────────────────────────────────

// Use the shared collections from the Firm-Connect app
const Event = mongoose.model.bind(mongoose);

const getEventModel = () => {
    try { return mongoose.model('Event'); } catch {
        return mongoose.model('Event', new mongoose.Schema({}, { strict: false, collection: 'events' }));
    }
};

const getCaseModel = () => {
    try { return mongoose.model('Case'); } catch {
        return mongoose.model('Case', new mongoose.Schema({}, { strict: false, collection: 'cases' }));
    }
};

// @desc    Get advocate's own profile summary (profile + hearings + documents)
// @route   GET /advocates/my-profile
// @access  Private
const getMyProfile = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // 1. Fetch user profile with org name
        const user = await User.findById(userId)
            .select('firstName lastName email phone role barNumber organizationId subscriptionPlan subscriptionStatus')
            .populate('organizationId', 'name')
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const EventModel = getEventModel();
        const CaseModel = getCaseModel();

        // 2. Parallel fetch: upcoming hearings + active cases
        const [events, cases] = await Promise.all([
            EventModel.find({
                $or: [
                    { user: userId },
                    { attendees: userId }
                ],
                startDate: { $gte: new Date() }
            })
                .sort({ startDate: 1 })
                .limit(10)
                .lean()
                .catch(() => []),

            CaseModel.find({
                $or: [
                    { assignedLawyers: userId },
                    { createdBy: userId }
                ],
                recordStatus: 1
            })
                .select('title documents')
                .lean()
                .catch(() => [])
        ]);

        // 3. Flatten case documents and attach caseTitle
        const documents = [];
        for (const c of cases) {
            if (Array.isArray(c.documents)) {
                for (const doc of c.documents) {
                    if (doc.recordStatus === 1 || doc.recordStatus === undefined) {
                        documents.push({ ...doc, caseTitle: c.title, caseId: c._id });
                    }
                }
            }
        }

        res.json({
            profile: user,
            hearings: events,
            documents
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getMyProfile };
