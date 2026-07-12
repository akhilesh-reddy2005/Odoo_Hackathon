const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// Analytics endpoints require 'analytics' permission flag
router.get('/dashboard', checkPermission('dashboard'), analyticsController.getDashboardStats);
router.get('/charts', checkPermission('analytics'), analyticsController.getAnalyticsCharts);

module.exports = router;
