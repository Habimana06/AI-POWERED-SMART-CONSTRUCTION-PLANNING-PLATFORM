const express = require('express');
const projectController = require('../controllers/projectController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const auditLog = require('../middleware/auditLog');

const router = express.Router();

router.use(authenticate);

router.get('/dashboard/pm', authorize('project_manager'), projectController.getPmDashboard);
router.get('/dashboard/contractor', authorize('contractor'), projectController.getContractorDashboard);
router.get('/contractors/list', authorize('admin', 'project_manager'), projectController.getContractors);

router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProjectById);
router.post('/', authorize('admin', 'project_manager'), auditLog('CREATE_PROJECT', 'project'), projectController.createProject);
router.put('/:id', authorize('admin', 'project_manager'), auditLog('UPDATE_PROJECT', 'project'), projectController.updateProject);
router.delete('/:id', authorize('admin'), auditLog('DELETE_PROJECT', 'project'), projectController.deleteProject);

router.patch('/:id/approve', authorize('admin'), auditLog('APPROVE_PROJECT', 'project'), projectController.approveProject);
router.patch('/:id/archive', authorize('admin'), auditLog('ARCHIVE_PROJECT', 'project'), projectController.archiveProject);

router.post('/:id/files', authorize('admin', 'project_manager'), upload.single('file'), projectController.uploadProjectFile);
router.post('/:id/assign-contractor', authorize('admin', 'project_manager'), projectController.assignContractor);
router.get('/:id/assignments', authorize('admin', 'project_manager'), projectController.getProjectAssignments);
router.post('/:id/assignments', authorize('admin', 'project_manager'), projectController.assignContractor);
router.get('/:id/designs', authorize('admin', 'project_manager', 'contractor'), projectController.getProjectDesigns);
router.post('/:id/designs', authorize('admin', 'project_manager'), projectController.saveDesign);
router.post('/:id/designs/:designId/generate-exterior', authorize('admin', 'project_manager'), projectController.generateDesignExterior);
router.patch('/:id/designs/:designId/ai-render', authorize('admin', 'project_manager'), projectController.saveDesignAiRender);
router.get('/:id/floor-plans', authorize('admin', 'project_manager'), projectController.getProjectFloorPlans);

module.exports = router;
