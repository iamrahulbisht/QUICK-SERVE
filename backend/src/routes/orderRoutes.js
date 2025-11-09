const express = require('express');
const router = express.Router();
const { createOrder, getMyOrders, getOrder, cancelOrder, rateOrder } = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/:orderId', protect, getOrder);
router.patch('/:orderId/cancel', protect, cancelOrder);
router.patch('/:orderId/rate', protect, rateOrder);

module.exports = router;