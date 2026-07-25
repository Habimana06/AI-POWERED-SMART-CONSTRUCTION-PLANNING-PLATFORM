const express = require('express');
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', reportController.getReports);
router.get('/:id', reportController.getReportById);
router.post('/', authorize('admin', 'project_manager'), reportController.createReport);
router.put('/:id', authorize('admin', 'project_manager'), reportController.updateReport);
router.delete('/:id', authorize('admin'), reportController.deleteReport);

module.exports = router;
