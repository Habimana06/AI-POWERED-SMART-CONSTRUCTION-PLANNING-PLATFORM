const express = require('express');
const progressController = require('../controllers/progressController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/updates', progressController.getProgressUpdates);
router.post('/updates', authorize('contractor', 'project_manager'), progressController.submitProgress);
router.get('/daily-logs', progressController.getDailyLogs);
router.post('/daily-logs', authorize('contractor'), progressController.createDailyLog);

module.exports = router;
