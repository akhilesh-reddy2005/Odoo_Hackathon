const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', driverController.getAllDrivers);
router.get('/:id', driverController.getDriverById);

// Require 'drivers' permission to alter driver profiles
router.post('/', checkPermission('drivers'), driverController.createDriver);
router.put('/:id', checkPermission('drivers'), driverController.updateDriver);
router.delete('/:id', checkPermission('drivers'), driverController.deleteDriver);

module.exports = router;
