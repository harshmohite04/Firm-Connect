const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middlewares/authMiddleware');
const {
    getStats, getRecentActivity,
    getUsers, getUserDetail, changeUserRole, toggleAdminStatus, resetUserPassword, unlockUserAccount,
    getSubscriptions, updateSubscription,
    getCases, updateCaseStatus, assignLawyer,
    getContactSubmissions, updateContactSubmission
} = require('../controllers/adminController');

// All routes require protect + admin
router.use(protect, admin);

// Dashboard
router.get('/stats', getStats);
router.get('/recent-activity', getRecentActivity);

// Users
router.get('/users', getUsers);
router.get('/users/:id', getUserDetail);
router.patch('/users/:id/role', changeUserRole);
router.patch('/users/:id/admin-status', toggleAdminStatus);
router.patch('/users/:id/reset-password', resetUserPassword);
router.patch('/users/:id/unlock', unlockUserAccount);

// Subscriptions
router.get('/subscriptions', getSubscriptions);
router.patch('/subscriptions/:userId', updateSubscription);

// Cases
router.get('/cases', getCases);
router.patch('/cases/:id/status', updateCaseStatus);
router.patch('/cases/:id/assign', assignLawyer);

// Contact Submissions
router.get('/contact-submissions', getContactSubmissions);
router.patch('/contact-submissions/:id', updateContactSubmission);

module.exports = router;
