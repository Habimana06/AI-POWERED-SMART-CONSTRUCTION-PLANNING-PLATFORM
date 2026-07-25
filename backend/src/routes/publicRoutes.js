const express = require('express');
const publicController = require('../controllers/publicController');

const router = express.Router();

router.get('/landing-stats', publicController.getLandingStats);
router.get('/showcase-projects', publicController.getShowcaseProjects);
router.get('/testimonials', publicController.getApprovedTestimonials);
router.post('/testimonials', publicController.submitTestimonial);
router.get('/contact-info', publicController.getContactInfo);
router.post('/contact', publicController.submitContact);

module.exports = router;
