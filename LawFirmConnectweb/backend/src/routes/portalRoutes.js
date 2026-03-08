const express = require('express');
const router = express.Router();
const { getDashboard } = require('../controllers/portalController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/', (req, res) => {
    res.send('Portal API');
});

router.get('/dashboard', protect, getDashboard);

module.exports = router;
