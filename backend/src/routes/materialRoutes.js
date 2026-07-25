const express = require('express');
const materialController = require('../controllers/materialController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', materialController.getMaterials);
router.post('/request', authorize('contractor', 'project_manager'), materialController.requestMaterial);
router.patch('/:id/status', authorize('admin', 'project_manager'), materialController.updateMaterialStatus);

module.exports = router;
