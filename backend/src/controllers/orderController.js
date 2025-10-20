const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');

const generateOrderId = () => `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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

        const { items, address, paymentMethod } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order must include at least one item'
            });
        }

        if (!address) {
            return res.status(400).json({
                success: false,
                message: 'Delivery address is required'
            });
        }

        const subtotal = items.reduce((sum, item) => {
            const price = Number(item.price) || 0;
            const quantity = Number(item.quantity) || 0;
            return sum + price * quantity;
        }, 0);

        const deliveryFee = 40;
        const total = subtotal + deliveryFee;

        const order = await Order.create({
            orderId: generateOrderId(),
            userId: req.user._id,
            userEmail: req.user.email,
            items,
            subtotal,
            deliveryFee,
            total,
            address,
            paymentMethod: paymentMethod || 'cod'
        });

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