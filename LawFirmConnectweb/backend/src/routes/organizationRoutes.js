const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const {
    getOrganization,
    getMembers,
    inviteMember,
    getInvitations,
    acceptInvitation,
    rejectInvitation,
    revokeInvitation,
    removeMember,
    reassignCases,
    updateSeats,
    getPublicOrganizations,
    getMyInvitations,
    getInvitationByToken,
    completeInviteSetup,
    leaveOrganization,
    updateOrganization,
    deleteOrganization,
    getActivityLog,
    getInvitationHistory,
    getCaseTeamRequestById,
    reviewCaseTeamRequest
} = require('../controllers/organizationController');
const { protect, admin } = require('../middlewares/authMiddleware');

// Public list of organizations
router.get('/public', getPublicOrganizations);

// Organization info
router.get('/', protect, getOrganization);

// Members
router.get('/members', protect, getMembers);
router.delete('/members/:userId', protect, removeMember);

// Invitations
router.post('/invite', protect, admin, inviteMember);
router.get('/invitations', protect, getInvitations);
router.get('/my-invitations', protect, getMyInvitations);

// Leave organization (advocate)
router.post('/leave', protect, leaveOrganization);

// Update organization (admin)
router.patch('/', protect, updateOrganization);

// Delete organization (admin)
router.delete('/', protect, deleteOrganization);

// Activity log (admin)
router.get('/activity-log', protect, getActivityLog);

// Invitation history (admin)
router.get('/invitation-history', protect, getInvitationHistory);

// Public invitation setup (no auth needed)
router.get('/invitations/:token/info', getInvitationByToken);
router.post('/invitations/:token/setup', [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('phone').trim().notEmpty().matches(/^[+]?[\d\s-]{10,}$/).withMessage('Valid phone number is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain a number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain a special character')
], completeInviteSetup);

router.post('/invitations/:token/accept', protect, acceptInvitation);
router.post('/invitations/:token/reject', rejectInvitation);
router.delete('/invitations/:invitationId', protect, revokeInvitation);

// Case reassignment
router.post('/reassign-cases', protect, reassignCases);

// Seat management
router.patch('/seats', protect, updateSeats);

// Case team requests (admin approval workflow)
router.get('/case-team-requests/:requestId', protect, getCaseTeamRequestById);
router.patch('/case-team-requests/:requestId', protect, reviewCaseTeamRequest);

module.exports = router;
