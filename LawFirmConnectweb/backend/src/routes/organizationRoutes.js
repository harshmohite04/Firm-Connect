const express = require('express');
const router = express.Router();
const {
    getOrganization,
    getMembers,
    inviteMember,
    getInvitations,
    acceptInvitation,
    rejectInvitation,
    removeMember,
    reassignCases
} = require('../controllers/organizationController');
const { protect } = require('../middlewares/authMiddleware');

// Organization info
router.get('/', protect, getOrganization);

// Members
router.get('/members', protect, getMembers);
router.delete('/members/:userId', protect, removeMember);

// Invitations
router.post('/invite', protect, inviteMember);
router.get('/invitations', protect, getInvitations);
router.post('/invitations/:token/accept', protect, acceptInvitation);
router.post('/invitations/:token/reject', rejectInvitation);

// Case reassignment
router.post('/reassign-cases', protect, reassignCases);

module.exports = router;
