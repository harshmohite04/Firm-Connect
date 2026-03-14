const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { getMyProfile } = require('../controllers/advocateController');

router.get('/my-profile', protect, getMyProfile);

module.exports = router;
