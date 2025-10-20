const express = require('express');
const router = express.Router();
const { getStats, getAllOrders, updateOrderStatus, getAllUsers } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

router.get('/stats', protect, admin, getStats);
router.get('/orders', protect, admin, getAllOrders);
router.patch('/orders/:orderId/status', protect, admin, updateOrderStatus);
router.get('/users', protect, admin, getAllUsers);

module.exports = router;