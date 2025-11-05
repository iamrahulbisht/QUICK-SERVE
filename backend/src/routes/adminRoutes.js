const express = require('express');
const router = express.Router();
const { getStats, getAllOrders, updateOrderStatus, getAllUsers, getPendingRestaurants, approveRestaurant, rejectRestaurant, getAllRestaurants } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

router.get('/stats', protect, admin, getStats);
router.get('/orders', protect, admin, getAllOrders);
router.patch('/orders/:orderId/status', protect, admin, updateOrderStatus);
router.get('/users', protect, admin, getAllUsers);
router.get('/restaurants/pending', protect, admin, getPendingRestaurants);
router.get('/restaurants', protect, admin, getAllRestaurants);
router.put('/restaurants/:restaurantId/approve', protect, admin, approveRestaurant);
router.put('/restaurants/:restaurantId/reject', protect, admin, rejectRestaurant);

module.exports = router;