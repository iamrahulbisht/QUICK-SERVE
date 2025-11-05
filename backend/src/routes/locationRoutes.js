const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const locationController = require('../controllers/locationController');

router.post('/save', protect, locationController.saveLocation);
router.post('/calculate', protect, locationController.calculateDelivery);
router.get('/get', protect, locationController.getLocation);

module.exports = router;
