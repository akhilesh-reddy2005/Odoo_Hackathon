const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', vehicleController.getAllVehicles);
router.get('/:id', vehicleController.getVehicleById);

// Require 'fleet' permissions to alter vehicle records
router.post('/', checkPermission('fleet'), vehicleController.createVehicle);
router.put('/:id', checkPermission('fleet'), vehicleController.updateVehicle);
router.delete('/:id', checkPermission('fleet'), vehicleController.deleteVehicle);

module.exports = router;
