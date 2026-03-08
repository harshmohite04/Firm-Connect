const express = require('express');
const router = express.Router();

const messageController = require('../controllers/messageController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/fileUpload');

router.get('/search-conversations', protect, messageController.searchConversations);
router.get('/search', protect, messageController.searchMessages);
router.get('/unread/count', protect, messageController.getUnreadCount);
router.get('/conversations', protect, messageController.getConversations);
router.get('/:contactId', protect, messageController.getMessages);
router.post('/', protect, upload.single('attachment'), messageController.sendMessage);
router.put('/read/:contactId', protect, messageController.markMessagesRead);

module.exports = router;
