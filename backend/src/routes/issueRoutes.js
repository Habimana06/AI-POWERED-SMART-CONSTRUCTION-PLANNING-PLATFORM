const express = require('express');
const issueController = require('../controllers/issueController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', issueController.getIssues);
router.post('/', authorize('contractor', 'project_manager'), issueController.reportIssue);
router.patch('/:id', authorize('admin', 'project_manager'), issueController.updateIssue);

module.exports = router;
