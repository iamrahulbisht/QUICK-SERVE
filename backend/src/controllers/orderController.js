const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const { calculateDistance, calculateDeliveryFee, estimateDeliveryTime } = require('../utils/locationUtils');

const generateOrderId = () => `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const ALLOWED_PAYMENT_METHODS = ['cod', 'card', 'upi'];

const findMenuItem = (restaurant, menuItemId) => {
    if (!restaurant?.categories) {
        return null;
    }

    for (const category of restaurant.categories) {
        const items = category?.items || [];
        const match = items.find((item) => item.id === menuItemId);
        if (match) {
            return match;
        }
    }

    return null;
};

exports.getRestaurants = async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};

        if (search) {
            query = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { cuisine: { $regex: search, $options: 'i' } },
                    { 'categories.items.name': { $regex: search, $options: 'i' } },
                    { 'categories.items.description': { $regex: search, $options: 'i' } }
                ]
            };
        }

        const restaurants = await Restaurant.find(query);
        
        res.json({
            success: true,
            count: restaurants.length,
            data: restaurants
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ id: req.params.id });
        
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        res.json({
            success: true,
            data: restaurant
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.createOrder = async (req, res) => {
    try {
        if (req.user.role !== 'customer') {
            return res.status(403).json({
                success: false,
                message: 'Only customers can place orders'
            });
        }

        const { items, address, paymentMethod, latitude, longitude, mode, tableNumber } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order must include at least one item'
            });
        }

        // Validate based on mode
        const orderMode = mode || 'delivery';
        
        if (orderMode === 'delivery' && !address) {
            return res.status(400).json({
                success: false,
                message: 'Delivery address is required for delivery orders'
            });
        }

        if (orderMode === 'dinein' && !tableNumber) {
            return res.status(400).json({
                success: false,
                message: 'Table number is required for dine-in orders'
            });
        }

        const normalizedPaymentMethod = (paymentMethod || 'cod').toLowerCase();
        if (!ALLOWED_PAYMENT_METHODS.includes(normalizedPaymentMethod)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment method'
            });
        }

        const restaurantCache = new Map();
        const itemMap = new Map();

        for (const rawItem of items) {
            const itemId = rawItem?.itemId;
            const restaurantId = rawItem?.restaurantId;
            const quantity = Number(rawItem?.quantity);

            if (!itemId || !restaurantId) {
                return res.status(400).json({
                    success: false,
                    message: 'Each item must include itemId and restaurantId'
                });
            }

            if (!Number.isFinite(quantity) || quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Item quantity must be a positive number'
                });
            }

            let restaurant = restaurantCache.get(restaurantId);
            if (!restaurant) {
                restaurant = await Restaurant.findOne({ id: restaurantId }).lean();
                if (!restaurant) {
                    return res.status(400).json({
                        success: false,
                        message: `Restaurant with id ${restaurantId} not found`
                    });
                }
                restaurantCache.set(restaurantId, restaurant);
            }

            const menuItem = findMenuItem(restaurant, itemId);
            if (!menuItem) {
                return res.status(400).json({
                    success: false,
                    message: `Item ${itemId} is not available for restaurant ${restaurant.name}`
                });
            }

            const key = `${restaurantId}:${menuItem.id}`;
            if (itemMap.has(key)) {
                const existing = itemMap.get(key);
                existing.quantity += quantity;
            } else {
                itemMap.set(key, {
                    itemId: menuItem.id,
                    itemName: menuItem.name,
                    restaurantId: restaurant.id,
                    restaurantName: restaurant.name,
                    price: menuItem.price,
                    quantity,
                    image: menuItem.image
                });
            }
        }

        const validatedItems = Array.from(itemMap.values());
        const subtotal = validatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        
        // Calculate delivery fee based on mode and location
        let deliveryFee = 0;
        let distance = 0;
        let estimatedTime = '15-20 mins';
        let deliveryLocation = { type: 'Point', coordinates: [0, 0] };

        if (orderMode === 'delivery') {
            deliveryFee = 40; // Default delivery fee
            estimatedTime = '30-40 mins';

            if (latitude && longitude) {
                const firstRestaurantId = validatedItems[0].restaurantId;
                const restaurant = restaurantCache.get(firstRestaurantId);

                if (restaurant && restaurant.location && restaurant.location.coordinates && 
                    (restaurant.location.coordinates[0] !== 0 || restaurant.location.coordinates[1] !== 0)) {
                    const [restLon, restLat] = restaurant.location.coordinates;
                    distance = calculateDistance(restLat, restLon, latitude, longitude);
                    deliveryFee = calculateDeliveryFee(distance);
                    estimatedTime = estimateDeliveryTime(distance);
                }

                deliveryLocation = {
                    type: 'Point',
                    coordinates: [longitude, latitude]
                };
            }
        } else {
            // Dine-in mode - no delivery fee
            estimatedTime = '15-20 mins';
        }

        const total = subtotal + deliveryFee;

        const orderData = {
            orderId: generateOrderId(),
            userId: req.user._id,
            userEmail: req.user.email,
            items: validatedItems,
            subtotal,
            deliveryFee,
            total,
            paymentMethod: normalizedPaymentMethod,
            mode: orderMode
        };

        // Add mode-specific fields
        if (orderMode === 'delivery') {
            orderData.address = address;
            orderData.deliveryLocation = deliveryLocation;
            orderData.distance = distance;
            orderData.estimatedDeliveryTime = estimatedTime;
        } else {
            orderData.tableNumber = tableNumber;
            orderData.estimatedDeliveryTime = estimatedTime;
        }

        const order = await Order.create(orderData);

        res.status(201).json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getMyOrders = async (req, res) => {
    try {
        if (req.user.role !== 'customer') {
            return res.status(403).json({
                success: false,
                message: 'Only customers can view their orders'
            });
        }

        const orders = await Order.find({ userId: req.user._id }).sort('-createdAt');

        res.json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getOrder = async (req, res) => {
    try {
        if (req.user.role !== 'customer') {
            return res.status(403).json({
                success: false,
                message: 'Only customers can view order details'
            });
        }

        const order = await Order.findOne({ orderId: req.params.orderId, userId: req.user._id }).populate('userId', 'name email');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.cancelOrder = async (req, res) => {
    try {
        if (req.user.role !== 'customer') {
            return res.status(403).json({
                success: false,
                message: 'Only customers can cancel their orders'
            });
        }

        const order = await Order.findOne({ orderId: req.params.orderId, userId: req.user._id });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if order can be cancelled (not already served or delivered)
        if (order.status === 'served' || order.status === 'delivered') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel an order that has already been served or delivered'
            });
        }

        if (order.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Order is already cancelled'
            });
        }

        order.status = 'cancelled';
        await order.save();

        res.json({
            success: true,
            message: 'Order cancelled successfully',
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};