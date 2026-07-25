const express = require('express');
const aiController = require('../controllers/aiController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/material-request-review', authenticate, authorize('project_manager', 'contractor'), aiController.reviewMaterialRequest);

router.use(authenticate, authorize('admin', 'project_manager'));

router.post('/chat', aiController.chat);
router.get('/conversations', aiController.getConversations);
router.get('/conversations/:id', aiController.getConversation);
router.post('/building-design', aiController.generateBuildingDesign);
router.post('/render-prompt', aiController.generateRenderPrompt);
router.post('/generate-render', aiController.generateRender);
router.post('/flux-image', aiController.fluxImage);
router.get('/image-providers', aiController.listImageProviders);
router.post('/cost-estimation', aiController.estimateCost);
router.post('/risk-prediction', aiController.predictRisks);
router.post('/progress-analysis', aiController.analyzeProgress);

module.exports = router;
