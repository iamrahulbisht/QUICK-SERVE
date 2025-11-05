const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const restaurantOwnerController = require('../controllers/restaurantOwnerController');

// Check if user is restaurant owner
const isRestaurantOwner = (req, res, next) => {
    if (req.user.role !== 'restaurantOwner') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Restaurant owners only.'
        });
    }
    next();
};

// Public route - Registration
router.post('/register', restaurantOwnerController.registerRestaurantOwner);

// Protected routes - Require authentication and restaurant owner role
router.use(protect);
router.use(isRestaurantOwner);

router.get('/dashboard', restaurantOwnerController.getDashboard);
router.get('/orders', restaurantOwnerController.getRestaurantOrders);
router.put('/orders/:orderId/status', restaurantOwnerController.updateOrderStatus);
router.post('/dishes', restaurantOwnerController.addDish);
router.put('/dishes/:dishId', restaurantOwnerController.updateDish);
router.delete('/dishes/:dishId', restaurantOwnerController.deleteDish);
router.put('/settings', restaurantOwnerController.updateRestaurantSettings);
router.get('/qr-codes', restaurantOwnerController.generateTableQRs);

module.exports = router;
