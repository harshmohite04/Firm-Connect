const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
    validateEmailForInvite,
    acceptCaseTeamInvitation,
    rejectCaseTeamInvitation,
    getMyCaseTeamInvitations
} = require('../controllers/teamController');

// Validate email for case team invitation (pre-case-creation)
router.post('/validate-email', protect, validateEmailForInvite);

// Case team invitation accept/reject
router.post('/case-invitations/:token/accept', protect, acceptCaseTeamInvitation);
router.post('/case-invitations/:token/reject', protect, rejectCaseTeamInvitation);

// Get my pending case team invitations
router.get('/my-case-invitations', protect, getMyCaseTeamInvitations);

module.exports = router;
