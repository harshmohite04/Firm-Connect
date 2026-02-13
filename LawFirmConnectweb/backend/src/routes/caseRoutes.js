const express = require('express');
const router = express.Router();
const { 
    getCases, createCase, getCaseById, deleteCase, 
    getCaseDocuments, uploadDocument, deleteDocument,
    getCaseActivity, addCaseActivity,
    getCaseBilling, addCaseBilling,
    updateCaseSettings
} = require('../controllers/caseController');
const {
    validateTeamMember,
    addTeamMember,
    removeTeamMember
} = require('../controllers/teamController');
const { protect } = require('../middlewares/authMiddleware');
const fileUpload = require('../middlewares/fileUpload');

// Main Case Routes
router.route('/')
    .get(protect, getCases)
    .post(protect, fileUpload.array('files'), createCase);

router.route('/:id')
    .get(protect, getCaseById)
    .delete(protect, deleteCase); // Soft delete via main endpoint or settings

// Tab: Active Documents
router.route('/:id/documents')
    .get(protect, getCaseDocuments)
    .post(protect, fileUpload.array('files'), uploadDocument);

router.delete('/:id/documents/:documentId', protect, deleteDocument);

// Tab: Activity
router.route('/:id/activity')
    .get(protect, getCaseActivity)
    .post(protect, addCaseActivity);

// Tab: Billing
router.route('/:id/billing')
    .get(protect, getCaseBilling)
    .post(protect, fileUpload.single('file'), addCaseBilling);

// Tab: Settings
router.route('/:id/settings')
    .patch(protect, updateCaseSettings);

// Tab: Team
router.route('/:id/team/validate').post(protect, validateTeamMember);
router.route('/:id/team/members').post(protect, addTeamMember);
router.route('/:id/team/members/:userId').delete(protect, removeTeamMember);

module.exports = router;
