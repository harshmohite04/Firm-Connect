const express = require('express');
const router = express.Router();

const messageController = require('../controllers/messageController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/fileUpload');
const { scanFiles } = require('../middlewares/fileScan');

router.get('/search-conversations', protect, messageController.searchConversations);
router.get('/search', protect, messageController.searchMessages);
router.get('/unread/count', protect, messageController.getUnreadCount);
router.get('/conversations', protect, messageController.getConversations);
router.get('/:contactId', protect, messageController.getMessages);
router.post('/', protect, upload.single('attachment'), scanFiles, messageController.sendMessage);
router.put('/read/:contactId', protect, messageController.markMessagesRead);
router.delete('/:messageId', protect, messageController.deleteMessage);

module.exports = router;
