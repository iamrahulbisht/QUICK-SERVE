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

        const usersWithStats = await Promise.all(
            users.map(async (user) => {
                const userObj = user.toObject();
                
                // Get order stats for each user
                const orders = await Order.find({
                    userId: user._id,
                    status: { $ne: 'Cancelled' }
                });
                
                const orderCount = orders.length;
                const totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0);
                
                userObj.orderCount = orderCount;
                userObj.totalSpent = totalSpent;
                
                return userObj;
            })
        );

        res.json({
            success: true,
            count: usersWithStats.length,
            data: usersWithStats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Toggle user status (suspend/activate)
exports.toggleUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { isSuspended } = req.body;

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent suspending own account
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You cannot suspend your own account'
            });
        }

        // Update suspended status
        user.isSuspended = isSuspended;
        await user.save();

        res.json({
            success: true,
            message: `User ${isSuspended ? 'suspended' : 'activated'} successfully`,
            data: user
        });
    } catch (error) {
        console.error('Error toggling user status:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete user
exports.deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent deleting own account
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You cannot delete your own account'
            });
        }

        // If user is a restaurant owner, delete their restaurant
        if (user.role === 'restaurantOwner') {
            await Restaurant.findOneAndDelete({ ownerId: user._id });
        }

        // Delete all orders associated with this user
        await Order.deleteMany({ userId: user._id });

        // Delete the user
        await User.findByIdAndDelete(userId);

        res.json({
            success: true,
            message: 'User and associated data deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update user role
exports.updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        // Validate role
        const allowedRoles = ['customer', 'restaurantOwner', 'admin'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Must be customer, restaurantOwner, or admin'
            });
        }

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent changing own role
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You cannot change your own role'
            });
        }

        // Update role
        user.role = role;
        await user.save();

        res.json({
            success: true,
            message: `User role updated to ${role} successfully`,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
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

// Get restaurant management data with stats
exports.getRestaurantManagement = async (req, res) => {
    try {
        const restaurants = await Restaurant.find()
            .populate('ownerId', 'name email mobile')
            .sort('-createdAt');

        // Get stats for each restaurant
        const restaurantsWithStats = await Promise.all(restaurants.map(async (restaurant) => {
            const restaurantObj = restaurant.toObject();
            
            // Get order stats for this restaurant
            const orders = await Order.find({
                'items.restaurantId': restaurant.id,
                status: { $ne: 'Cancelled' }
            });
            
            const totalOrders = orders.length;
            const totalRevenue = orders.reduce((sum, order) => {
                // Calculate revenue from this restaurant's items only
                const restaurantItems = order.items.filter(item => item.restaurantId === restaurant.id);
                const itemsTotal = restaurantItems.reduce((itemSum, item) => 
                    itemSum + (item.price * item.quantity), 0
                );
                return sum + itemsTotal;
            }, 0);
            
            restaurantObj.stats = {
                totalOrders,
                totalRevenue
            };
            
            return restaurantObj;
        }));

        res.json({
            success: true,
            count: restaurantsWithStats.length,
            data: restaurantsWithStats
        });
    } catch (error) {
        console.error('Error getting restaurant management:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get detailed restaurant information
exports.getRestaurantDetails = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        
        const restaurant = await Restaurant.findById(restaurantId)
            .populate('ownerId', 'name email mobile');

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        const restaurantObj = restaurant.toObject();
        
        // Get detailed stats
        const orders = await Order.find({
            'items.restaurantId': restaurant.id,
            status: { $ne: 'Cancelled' }
        });
        
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => {
            const restaurantItems = order.items.filter(item => item.restaurantId === restaurant.id);
            const itemsTotal = restaurantItems.reduce((itemSum, item) => 
                itemSum + (item.price * item.quantity), 0
            );
            return sum + itemsTotal;
        }, 0);
        
        restaurantObj.stats = {
            totalOrders,
            totalRevenue
        };

        res.json({
            success: true,
            data: restaurantObj
        });
    } catch (error) {
        console.error('Error getting restaurant details:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update restaurant details
exports.updateRestaurant = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const updateData = req.body;

        // Fields that can be updated
        const allowedFields = [
            'name', 'cuisine', 'address', 'totalTables', 
            'deliveryTime', 'openTime', 'closeTime', 'logo', 'cardImage'
        ];

        const filteredData = {};
        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                filteredData[field] = updateData[field];
            }
        });

        const restaurant = await Restaurant.findByIdAndUpdate(
            restaurantId,
            filteredData,
            { new: true, runValidators: true }
        );

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        res.json({
            success: true,
            message: 'Restaurant updated successfully',
            data: restaurant
        });
    } catch (error) {
        console.error('Error updating restaurant:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Toggle restaurant status (active/inactive)
exports.toggleRestaurantStatus = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const { isActive } = req.body;

        const restaurant = await Restaurant.findByIdAndUpdate(
            restaurantId,
            { isActive: isActive },
            { new: true }
        );

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        res.json({
            success: true,
            message: `Restaurant ${isActive ? 'activated' : 'deactivated'} successfully`,
            data: restaurant
        });
    } catch (error) {
        console.error('Error toggling restaurant status:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete restaurant (permanent)
exports.deleteRestaurant = async (req, res) => {
    try {
        const { restaurantId } = req.params;

        const restaurant = await Restaurant.findById(restaurantId);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        // Delete all orders associated with this restaurant
        await Order.deleteMany({ 'items.restaurantId': restaurant.id });

        // Delete the owner user account
        if (restaurant.ownerId) {
            await User.findByIdAndDelete(restaurant.ownerId);
        }

        // Delete the restaurant
        await Restaurant.findByIdAndDelete(restaurantId);

        res.json({
            success: true,
            message: 'Restaurant and associated data deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting restaurant:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete all orders (reset orders/purchases)
exports.deleteAllOrders = async (req, res) => {
    try {
        const result = await Order.deleteMany({});
        
        res.json({
            success: true,
            message: `All orders deleted successfully. ${result.deletedCount} orders removed.`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error deleting all orders:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


