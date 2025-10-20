const express = require('express');
const router = express.Router();
const { createOrder, getMyOrders, getOrder } = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/:orderId', protect, getOrder);

module.exports = router;