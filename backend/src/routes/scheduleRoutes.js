const express = require('express');
const scheduleController = require('../controllers/scheduleController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(authenticate, authorize('admin', 'project_manager'));

router.post('/generate', scheduleController.generateSchedule);
router.get('/projects/:projectId/tasks', scheduleController.getProjectTasks);
router.post('/projects/:projectId/tasks', scheduleController.createTask);
router.put('/tasks/:taskId', scheduleController.updateTask);
router.delete('/tasks/:taskId', scheduleController.deleteTask);
router.get('/projects/:projectId/blueprints', scheduleController.getBlueprints);
router.post('/projects/:projectId/blueprints', upload.single('file'), scheduleController.createBlueprint);

module.exports = router;
