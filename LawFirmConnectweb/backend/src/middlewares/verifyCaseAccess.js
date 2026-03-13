const Case = require('../models/Case');

// @desc    Verify if user has access to the case and attach req.caseRole
// @route   Middleware
const verifyCaseAccess = async (req, res, next) => {
    try {
        const caseId = req.params.id; // Assuming route is like /:id
        if (!caseId) {
            return next(); // If no ID param, skip (or handle as error depending on route)
        }

        const caseDoc = await Case.findById(caseId);

        if (!caseDoc) {
            res.status(404);
            throw new Error('Case not found');
        }

        const user = req.user;
        req.caseDoc = caseDoc; // Attach to req for reuse

        // 1. Firm ADMIN (same org) — full access
        if (user.role === 'ADMIN' && user.organizationId &&
            caseDoc.organizationId &&
            user.organizationId.toString() === caseDoc.organizationId.toString()) {
            req.caseRole = 'ADMIN';
            return next();
        }

        // 2. Fallback: super admin or any ADMIN with no org restriction
        if (user.role === 'ADMIN' && !caseDoc.organizationId) {
            req.caseRole = 'ADMIN';
            return next();
        }

        // 3. Lead Attorney by field
        if (caseDoc.leadAttorneyId && caseDoc.leadAttorneyId.toString() === user._id.toString()) {
            req.caseRole = 'LEAD_ATTORNEY';
            return next();
        }

        // 4. Creator is effectively lead
        if (caseDoc.createdBy && caseDoc.createdBy.toString() === user._id.toString()) {
            req.caseRole = 'LEAD_ATTORNEY';
            return next();
        }

        // 5. Team Members — use their stored role
        const teamMember = caseDoc.teamMembers &&
            caseDoc.teamMembers.find(m => m.userId.toString() === user._id.toString());
        if (teamMember) {
            req.caseRole = teamMember.role || 'MEMBER';
            return next();
        }

        // 6. Assigned Lawyers fallback
        if (caseDoc.assignedLawyers.some(id => id.toString() === user._id.toString())) {
            req.caseRole = 'MEMBER';
            return next();
        }

        // If none match
        res.status(403);
        throw new Error('Not authorized to access this case');

    } catch (error) {
        next(error);
    }
};

// @desc    Block write operations for VIEWER role
const blockViewerWrites = (req, res, next) => {
    if (req.method !== 'GET' && req.caseRole === 'VIEWER') {
        res.status(403);
        return next(new Error('Viewers cannot perform write operations on this case'));
    }
    next();
};

module.exports = verifyCaseAccess;
module.exports.blockViewerWrites = blockViewerWrites;
