const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('admin', 'project_manager'));

router.get('/projects', analyticsController.getProjectAnalytics);
router.get('/users', authorize('admin'), analyticsController.getUserAnalytics);

module.exports = router;
