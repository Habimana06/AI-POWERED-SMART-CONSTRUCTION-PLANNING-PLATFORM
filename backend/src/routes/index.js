const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const projectRoutes = require('./projectRoutes');
const companyRoutes = require('./companyRoutes');
const aiRoutes = require('./aiRoutes');
const scheduleRoutes = require('./scheduleRoutes');
const materialRoutes = require('./materialRoutes');
const reportRoutes = require('./reportRoutes');
const notificationRoutes = require('./notificationRoutes');
const messageRoutes = require('./messageRoutes');
const progressRoutes = require('./progressRoutes');
const issueRoutes = require('./issueRoutes');
const adminRoutes = require('./adminRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const contractorRoutes = require('./contractorRoutes');
const publicRoutes = require('./publicRoutes');
const env = require('../config/env');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: `${env.appName} API is running`,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/companies', companyRoutes);
router.use('/ai', aiRoutes);
router.use('/schedule', scheduleRoutes);
router.use('/materials', materialRoutes);
router.use('/reports', reportRoutes);
router.use('/notifications', notificationRoutes);
router.use('/messages', messageRoutes);
router.use('/progress', progressRoutes);
router.use('/issues', issueRoutes);
router.use('/admin', adminRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/contractor', contractorRoutes);
router.use('/public', publicRoutes);

module.exports = router;
