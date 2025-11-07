const express = require('express');
const router = express.Router();
const { 
    getStats, 
    getAllOrders, 
    updateOrderStatus, 
    getAllUsers, 
    updateUserRole,
    toggleUserStatus,
    deleteUser,
    getPendingRestaurants, 
    approveRestaurant, 
    rejectRestaurant, 
    getAllRestaurants,
    getRestaurantManagement,
    getRestaurantDetails,
    updateRestaurant,
    toggleRestaurantStatus,
    deleteRestaurant
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

router.get('/stats', protect, admin, getStats);
router.get('/orders', protect, admin, getAllOrders);
router.patch('/orders/:orderId/status', protect, admin, updateOrderStatus);

// User routes
router.get('/users', protect, admin, getAllUsers);
router.patch('/users/:userId/role', protect, admin, updateUserRole);
router.put('/users/:userId/status', protect, admin, toggleUserStatus);
router.delete('/users/:userId', protect, admin, deleteUser);

// Restaurant routes
router.get('/restaurants/pending', protect, admin, getPendingRestaurants);
router.get('/restaurants/management', protect, admin, getRestaurantManagement);
router.get('/restaurants/:restaurantId/details', protect, admin, getRestaurantDetails);
router.get('/restaurants', protect, admin, getAllRestaurants);
router.put('/restaurants/:restaurantId/approve', protect, admin, approveRestaurant);
router.put('/restaurants/:restaurantId/reject', protect, admin, rejectRestaurant);
router.put('/restaurants/:restaurantId', protect, admin, updateRestaurant);
router.put('/restaurants/:restaurantId/toggle-status', protect, admin, toggleRestaurantStatus);
router.delete('/restaurants/:restaurantId', protect, admin, deleteRestaurant);

module.exports = router;
