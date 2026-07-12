const express = require('express');
const router = express.Router();
const mapController = require('../controllers/mapController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/directions', mapController.getDirections);
router.get('/geocode', mapController.geocodeAddress);
router.get('/autocomplete', mapController.autocompleteAddress);


module.exports = router;
