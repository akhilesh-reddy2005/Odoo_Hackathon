const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const authMiddleware = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', tripController.getAllTrips);
router.get('/:id', tripController.getTripById);

// Require 'trips' permissions to edit and plan routes
router.post('/', checkPermission('trips'), tripController.createTrip);
router.put('/:id', checkPermission('trips'), tripController.updateTrip);
router.delete('/:id', checkPermission('trips'), tripController.deleteTrip);

// Lifecycle adjustments
router.patch('/:id/dispatch', checkPermission('trips'), tripController.dispatchTrip);
router.patch('/:id/complete', checkPermission('trips'), tripController.completeTrip);
router.patch('/:id/cancel', checkPermission('trips'), tripController.cancelTrip);

module.exports = router;
