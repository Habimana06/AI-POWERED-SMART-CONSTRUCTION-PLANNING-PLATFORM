const express = require('express');
const contractorController = require('../controllers/contractorController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('contractor'));

router.get('/tasks', contractorController.getMyTasks);
router.post('/tasks/:taskId/daily', contractorController.submitDailyTaskUpdate);
router.post('/tasks/:taskId/complete', contractorController.completeTask);
router.get('/message-recipients', contractorController.getMessageRecipients);
router.put('/profile', contractorController.updateContractorProfile);
router.get('/reports', contractorController.getContractorReports);
router.get('/projects/:projectId/tasks', contractorController.getProjectTasks);

module.exports = router;
