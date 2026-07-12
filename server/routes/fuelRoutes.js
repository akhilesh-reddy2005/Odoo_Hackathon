const express = require('express');
const router = express.Router();
const fuelController = require('../controllers/fuelController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', fuelController.getAllFuelLogs);
router.post('/', checkPermission('fuel'), fuelController.createFuelLog);

module.exports = router;
