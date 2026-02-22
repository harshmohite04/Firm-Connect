const Case = require('../models/Case');

// @desc    Verify if user has access to the case
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

        // 1. Admin always has access
        if (user.role === 'ADMIN') {
            req.caseDoc = caseDoc; // Attach to req for reuse
            return next();
        }

        // 2. Client who created the case
        if (caseDoc.createdBy && caseDoc.createdBy.toString() === user._id.toString()) {
            req.caseDoc = caseDoc;
            return next();
        }

        // 3. Assigned Lawyers
        if (caseDoc.assignedLawyers.some(id => id.toString() === user._id.toString())) {
             req.caseDoc = caseDoc;
             return next();
        }
        
        // 4. Lead Attorney
        if (caseDoc.leadAttorneyId && caseDoc.leadAttorneyId.toString() === user._id.toString()) {
            req.caseDoc = caseDoc;
            return next();
        }

        // 5. Team Members
        if (caseDoc.teamMembers && caseDoc.teamMembers.some(member => member.userId.toString() === user._id.toString())) {
            req.caseDoc = caseDoc;
            return next();
        }

        // If none match
        res.status(403);
        throw new Error('Not authorized to access this case');

    } catch (error) {
        next(error);
    }
};

module.exports = verifyCaseAccess;
