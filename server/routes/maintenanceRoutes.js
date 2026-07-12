const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', maintenanceController.getAllMaintenance);

// Require 'maintenance' permission to raise and alter tickets
router.post('/', checkPermission('maintenance'), maintenanceController.createRequest);
router.patch('/:id', checkPermission('maintenance'), maintenanceController.updateRequest);
router.delete('/:id', checkPermission('maintenance'), maintenanceController.deleteRequest);

module.exports = router;
