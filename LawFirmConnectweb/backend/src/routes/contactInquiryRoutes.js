const express = require('express');
const router = express.Router();
const { submitInquiry, getInquiries, getInquiryById } = require('../controllers/contactInquiryController');

router.post('/', submitInquiry);
router.get('/', getInquiries);
router.get('/:id', getInquiryById);

module.exports = router;
