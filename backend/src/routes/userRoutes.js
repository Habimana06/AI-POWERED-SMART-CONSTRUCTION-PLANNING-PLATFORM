const express = require('express');
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);
router.post('/', auditLog('CREATE_USER', 'user'), userController.createUser);
router.put('/:id', auditLog('UPDATE_USER', 'user'), userController.updateUser);
router.delete('/:id', auditLog('DELETE_USER', 'user'), userController.deleteUser);

module.exports = router;
