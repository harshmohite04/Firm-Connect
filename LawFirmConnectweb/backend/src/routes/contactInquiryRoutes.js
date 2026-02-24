const express = require('express');
const router = express.Router();
const { submitInquiry } = require('../controllers/contactInquiryController');

router.post('/', submitInquiry);

module.exports = router;
