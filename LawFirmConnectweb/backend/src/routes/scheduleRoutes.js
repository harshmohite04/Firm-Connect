const express = require('express');
const router = express.Router();
const { getEvents, createEvent, deleteEvent, updateEvent } = require('../controllers/scheduleController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/')
    .get(protect, getEvents)
    .post(protect, createEvent);

router.route('/:id')
    .put(protect, updateEvent)
    .delete(protect, deleteEvent);

module.exports = router;
