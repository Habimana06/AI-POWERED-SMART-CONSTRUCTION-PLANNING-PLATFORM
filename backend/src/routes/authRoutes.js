const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/2fa/verify-login', authController.verify2FALogin);
router.post('/logout', authenticate, authController.logout);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);
router.post('/forgot-password/verify-code', authController.verifyForgotPasswordCode);
router.post('/reset-password', authController.resetPassword);
router.post('/verify-email', authController.verifyEmail);
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/profile/password', authenticate, authController.updatePassword);
router.post('/2fa/setup', authenticate, authController.setup2FA);
router.post('/2fa/enable', authenticate, authController.enable2FA);
router.post('/2fa/disable', authenticate, authController.disable2FA);
router.put('/profile/notifications', authenticate, authController.updateNotificationPrefs);
router.post('/audit-event', authenticate, require('../controllers/auditController').recordClientEvent);

module.exports = router;
