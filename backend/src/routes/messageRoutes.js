const express = require('express');
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', messageController.getMessages);
router.post('/', messageController.sendMessage);
router.patch('/:id/read', messageController.markMessageRead);

module.exports = router;
