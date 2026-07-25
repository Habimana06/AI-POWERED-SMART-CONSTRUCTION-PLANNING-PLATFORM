const express = require('express');
const adminController = require('../controllers/adminController');
const testimonialController = require('../controllers/testimonialController');
const contactController = require('../controllers/contactController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/dashboard', adminController.getDashboardStats);
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/audit-logs/users', adminController.getAuditUserSummaries);
router.get('/audit-logs/:id', adminController.getAuditLogById);
router.get('/settings', adminController.getSettings);
router.put('/settings/:key', adminController.updateSetting);
router.get('/system-status', adminController.getSystemStatus);
router.get('/message-recipients', adminController.getMessageRecipients);
router.get('/projects/:projectId/insights', adminController.getProjectInsights);
router.get('/system-reports', adminController.getSystemReports);
router.get('/testimonials', testimonialController.listTestimonials);
router.patch('/testimonials/:id/approve', testimonialController.approveTestimonial);
router.patch('/testimonials/:id/reject', testimonialController.rejectTestimonial);
router.delete('/testimonials/:id', testimonialController.deleteTestimonial);
router.get('/contact-messages', contactController.listContactMessages);
router.patch('/contact-messages/:id/reply', contactController.replyToContactMessage);
router.delete('/contact-messages/:id', contactController.deleteContactMessage);

module.exports = router;
