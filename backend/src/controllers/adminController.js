const fs = require('fs');
const path = require('path');

const Order = require('../models/Order');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

const fsPromises = fs.promises;
const BACKUP_DIR = path.join(__dirname, '../../backups');

const ensureBackupDir = async () => {
    await fsPromises.mkdir(BACKUP_DIR, { recursive: true });
};

const sanitizeRestaurantDocument = (restaurant) => {
    const sanitized = { ...restaurant };
    delete sanitized._id;
    if (Array.isArray(sanitized.categories)) {
        sanitized.categories = sanitized.categories.map(category => {
            const categoryCopy = { ...category };
            delete categoryCopy._id;
            if (Array.isArray(categoryCopy.items)) {
                categoryCopy.items = categoryCopy.items.map(item => {
                    const itemCopy = { ...item };
                    delete itemCopy._id;
                    return itemCopy;
                });
            }
            return categoryCopy;
        });
    }
    return sanitized;
};

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

exports.exportRestaurants = async (req, res) => {
    try {
        await ensureBackupDir();
        const restaurants = await Restaurant.find().lean();

        const sanitized = restaurants.map(sanitizeRestaurantDocument);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `restaurants-${timestamp}.json`;
        const filePath = path.join(BACKUP_DIR, fileName);

        const payload = {
            generatedAt: new Date().toISOString(),
            count: sanitized.length,
            restaurants: sanitized
        };

        await fsPromises.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');

        res.json({
            success: true,
            message: 'Restaurant data exported successfully',
            filePath: path.relative(path.join(__dirname, '../../'), filePath)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.importRestaurants = async (req, res) => {
    try {
        await ensureBackupDir();

        const { fileName } = req.body || {};
        const files = await fsPromises.readdir(BACKUP_DIR);
        const restaurantFiles = files.filter(name => name.startsWith('restaurants-') && name.endsWith('.json'));

        if (!restaurantFiles.length) {
            return res.status(404).json({
                success: false,
                message: 'No restaurant backup files found'
            });
        }

        const targetFile = fileName && restaurantFiles.includes(fileName)
            ? fileName
            : restaurantFiles.sort().pop();

        const filePath = path.join(BACKUP_DIR, targetFile);
        const fileContents = await fsPromises.readFile(filePath, 'utf-8');

        const parsed = JSON.parse(fileContents);
        const restaurants = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed.restaurants)
                ? parsed.restaurants
                : null;

        if (!restaurants) {
            return res.status(400).json({
                success: false,
                message: 'Backup file does not contain a valid restaurant list'
            });
        }

        const bulkOps = restaurants.map(rest => ({
            updateOne: {
                filter: { id: rest.id },
                update: { $set: rest },
                upsert: true
            }
        }));

        if (bulkOps.length > 0) {
            await Restaurant.bulkWrite(bulkOps);
        }

        res.json({
            success: true,
            message: 'Restaurant data imported successfully',
            fileName: targetFile,
            count: restaurants.length
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

// Get pending restaurant applications
exports.getPendingRestaurants = async (req, res) => {
    try {
        const pendingRestaurants = await Restaurant.find({ isApproved: false })
            .populate('ownerId', 'name email mobile')
            .sort('-createdAt');

        res.json({
            success: true,
            count: pendingRestaurants.length,
            data: pendingRestaurants
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Approve restaurant
exports.approveRestaurant = async (req, res) => {
    try {
        const { restaurantId } = req.params;

        const restaurant = await Restaurant.findById(restaurantId);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        restaurant.isApproved = true;
        await restaurant.save();

        res.json({
            success: true,
            message: 'Restaurant approved successfully',
            data: restaurant
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Reject restaurant
exports.rejectRestaurant = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { reason } = req.body;

        const restaurant = await Restaurant.findById(restaurantId).populate('ownerId');

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        // Delete the restaurant
        await Restaurant.findByIdAndDelete(restaurantId);

        // Delete the owner user account
        if (restaurant.ownerId) {
            await User.findByIdAndDelete(restaurant.ownerId._id);
        }

        res.json({
            success: true,
            message: 'Restaurant application rejected and removed',
            reason: reason || 'No reason provided'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get all restaurants (approved and pending)
exports.getAllRestaurants = async (req, res) => {
    try {
        const restaurants = await Restaurant.find()
            .populate('ownerId', 'name email mobile')
            .sort('-createdAt');

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

