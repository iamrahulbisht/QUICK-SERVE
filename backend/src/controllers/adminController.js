const Order = require('../models/Order');
const User = require('../models/User');

exports.getStats = async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const totalRevenue = await Order.aggregate([
            {
                $match: {
                    status: { $ne: 'Cancelled' },
                    $or: [
                        { paymentMethod: { $ne: 'cod' } },
                        { status: 'Delivered' }
                    ]
                }
            },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);
        const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
        const pendingOrders = await Order.countDocuments({ status: 'Placed' });

        res.json({
            success: true,
            data: {
                totalOrders,
                totalRevenue: totalRevenue[0]?.total || 0,
                totalUsers,
                pendingOrders
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().populate('userId', 'name email').sort('-createdAt');
        
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

exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        const order = await Order.findOneAndUpdate(
            { orderId: req.params.orderId },
            { status },
            { new: true, runValidators: true }
        );

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            message: 'Order status updated',
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort('-createdAt');
        
        const usersWithOrders = await Promise.all(
            users.map(async (user) => {
                const orderCount = await Order.countDocuments({ userId: user._id });
                return {
                    ...user.toObject(),
                    orderCount
                };
            })
        );

        res.json({
            success: true,
            count: usersWithOrders.length,
            data: usersWithOrders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
