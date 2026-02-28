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
const verifyCaseAccess = require('../middlewares/verifyCaseAccess');
const fileUpload = require('../middlewares/fileUpload');

// Main Case Routes
router.route('/')
    .get(protect, getCases)
    .post((req, res, next) => {
        console.log('Request HIT /cases POST route');
        next();
    }, protect, fileUpload.array('files'), (req, res, next) => {
        console.log('Passed middleware, entering controller');
        createCase(req, res, next);
    });

router.route('/:id')
    .get(protect, verifyCaseAccess, getCaseById)
    .delete(protect, verifyCaseAccess, deleteCase); // Soft delete via main endpoint or settings

// Tab: Active Documents
router.route('/:id/documents')
    .get(protect, verifyCaseAccess, getCaseDocuments)
    .post(protect, verifyCaseAccess, fileUpload.array('files'), uploadDocument);

router.delete('/:id/documents/:documentId', protect, verifyCaseAccess, deleteDocument);

// Tab: Activity
router.route('/:id/activity')
    .get(protect, verifyCaseAccess, getCaseActivity)
    .post(protect, verifyCaseAccess, addCaseActivity);

// Tab: Billing
router.route('/:id/billing')
    .get(protect, verifyCaseAccess, getCaseBilling)
    .post(protect, verifyCaseAccess, fileUpload.single('file'), addCaseBilling);

// Tab: Settings
router.route('/:id/settings')
    .patch(protect, verifyCaseAccess, updateCaseSettings);

// Tab: Team
router.route('/:id/team/validate').post(protect, verifyCaseAccess, validateTeamMember);
router.route('/:id/team/members').post(protect, verifyCaseAccess, addTeamMember);
router.route('/:id/team/members/:userId').delete(protect, verifyCaseAccess, removeTeamMember);

// IGR Document Registration (for syncing UI when Python backend imports IGR documents)
router.post('/:id/documents/igr-register', protect, verifyCaseAccess, async (req, res, next) => {
    try {
        const { fileName, filePath, category, fileSize, source, igr_metadata } = req.body;

        // Validate required fields
        if (!fileName || !filePath) {
            return res.status(400).json({ error: 'fileName and filePath are required' });
        }

        const Case = require('../models/Case');
        const caseDoc = await Case.findById(req.params.id);

        if (!caseDoc) {
            return res.status(404).json({ error: 'Case not found' });
        }

        // Create document entry (without requiring file upload)
        const newDocument = {
            fileName: fileName,
            filePath: filePath,
            category: category || 'General',
            uploadedBy: req.user._id,
            uploadedAt: new Date(),
            fileSize: fileSize || 0,
            source: source || 'IGR',
            igr_metadata: igr_metadata || {}
        };

        // Add to case documents array
        if (!caseDoc.documents) {
            caseDoc.documents = [];
        }

        caseDoc.documents.push(newDocument);
        await caseDoc.save();

        res.status(201).json({
            message: 'Document registered successfully',
            document: newDocument
        });
    } catch (error) {
        console.error('Error registering IGR document:', error);
        next(error);
    }
});

module.exports = router;
