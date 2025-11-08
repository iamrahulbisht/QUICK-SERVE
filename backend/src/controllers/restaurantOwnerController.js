const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Order = require('../models/Order');
const jwt = require('jsonwebtoken');

const REGISTRATION_PASSCODE = 'REST123';

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d'
    });
};

// Verify passcode and register restaurant owner
exports.registerRestaurantOwner = async (req, res) => {
    try {
        const {
            passcode,
            name,
            email,
            password,
            mobile,
            restaurantName,
            restaurantAddress,
            latitude,
            longitude,
            cuisine,
            logo,
            openTime,
            closeTime,
            totalTables
        } = req.body;

        // Verify passcode
        if (passcode !== REGISTRATION_PASSCODE) {
            return res.status(403).json({
                success: false,
                message: 'Invalid Access Code. Please contact support for registration.'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username: email }] });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Create restaurant ID
        const restaurantId = restaurantName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

        // Create restaurant
        const restaurant = await Restaurant.create({
            id: restaurantId,
            name: restaurantName,
            address: restaurantAddress,
            cuisine: cuisine || 'Multi-Cuisine',
            logo: logo || '',
            cardImage: logo || '',
            emoji: '🍽️',
            deliveryTime: '30-40 min',
            openTime: openTime || '09:00',
            closeTime: closeTime || '22:00',
            location: {
                type: 'Point',
                coordinates: [longitude || 0, latitude || 0]
            },
            totalTables: totalTables || 10,
            isApproved: false,
            categories: []
        });

        // Create user account
        const user = await User.create({
            name,
            email,
            username: email,
            mobile,
            password,
            role: 'restaurantOwner',
            restaurantId: restaurant._id
        });

        // Update restaurant with owner ID
        restaurant.ownerId = user._id;
        await restaurant.save();

        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'Restaurant owner registered successfully. Awaiting admin approval.',
            data: {
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    restaurantId: restaurant._id
                },
                restaurant: {
                    id: restaurant.id,
                    name: restaurant.name,
                    isApproved: restaurant.isApproved
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get restaurant owner dashboard
exports.getDashboard = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.user.restaurantId);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        // Get orders for this restaurant
        const orders = await Order.find({
            'items.restaurantId': restaurant.id
        }).sort('-createdAt');

        // Calculate analytics
        const totalOrders = orders.filter(o => o.status !== 'cancelled').length;
        
        // Calculate revenue: exclude cancelled orders, and for COD, only count if served/delivered
        const totalRevenue = orders.reduce((sum, order) => {
            // Skip cancelled orders
            if (order.status === 'cancelled') {
                return sum;
            }
            
            // For COD orders, only count if served or delivered
            if (order.paymentMethod === 'cod' && 
                order.status !== 'served' && 
                order.status !== 'delivered') {
                return sum;
            }
            
            return sum + order.total;
        }, 0);
        
        const pendingOrders = orders.filter(o => o.status === 'received' || o.status === 'preparing').length;

        // Get top selling dishes
        const dishStats = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                if (item.restaurantId === restaurant.id) {
                    if (!dishStats[item.itemId]) {
                        dishStats[item.itemId] = {
                            name: item.itemName,
                            quantity: 0,
                            revenue: 0
                        };
                    }
                    dishStats[item.itemId].quantity += item.quantity;
                    dishStats[item.itemId].revenue += item.price * item.quantity;
                }
            });
        });

        const topDishes = Object.values(dishStats)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);

        res.json({
            success: true,
            data: {
                restaurant: {
                    id: restaurant.id,
                    name: restaurant.name,
                    address: restaurant.address,
                    isApproved: restaurant.isApproved,
                    totalTables: restaurant.totalTables,
                    categories: restaurant.categories || []
                },
                analytics: {
                    totalOrders,
                    totalRevenue,
                    pendingOrders,
                    topDishes
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get restaurant orders
exports.getRestaurantOrders = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.user.restaurantId);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        const { mode, status } = req.query;
        let query = { 'items.restaurantId': restaurant.id };

        if (mode) {
            query.mode = mode;
        }

        if (status) {
            query.status = status;
        }

        const orders = await Order.find(query)
            .populate('userId', 'name email mobile')
            .sort('-createdAt');

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

// Update order status
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        console.log('=== UPDATE ORDER STATUS ===');
        console.log('Order ID:', orderId);
        console.log('New Status:', status);
        console.log('User:', req.user?.email, 'Role:', req.user?.role);
        console.log('User Restaurant ID:', req.user?.restaurantId);

        const validStatuses = ['received', 'preparing', 'served', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const order = await Order.findOne({ orderId });

        if (!order) {
            console.log('Order not found:', orderId);
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        console.log('Order found:', order.orderId);
        console.log('Order items:', order.items);

        // Verify this order belongs to the restaurant
        if (!req.user.restaurantId) {
            console.error('User has no restaurantId!');
            return res.status(403).json({
                success: false,
                message: 'Restaurant not linked to your account. Please contact support.'
            });
        }

        const restaurant = await Restaurant.findById(req.user.restaurantId);
        
        if (!restaurant) {
            console.error('Restaurant not found for ID:', req.user.restaurantId);
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        console.log('Restaurant:', restaurant.name, 'ID:', restaurant.id);
        
        const hasItem = order.items.some(item => {
            console.log('Checking item restaurantId:', item.restaurantId, 'against:', restaurant.id);
            return item.restaurantId === restaurant.id;
        });

        if (!hasItem) {
            console.log('No matching items found for restaurant:', restaurant.id);
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to update this order'
            });
        }

        order.status = status;
        await order.save();

        console.log('Order status updated successfully');

        res.json({
            success: true,
            message: 'Order status updated successfully',
            data: order
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Add dish
exports.addDish = async (req, res) => {
    try {
        const { categoryName, dish } = req.body;

        if (!categoryName || !dish) {
            return res.status(400).json({
                success: false,
                message: 'Category name and dish details are required'
            });
        }

        const restaurant = await Restaurant.findById(req.user.restaurantId);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        // Find or create category
        let category = restaurant.categories.find(c => c.name === categoryName);

        if (!category) {
            category = { name: categoryName, items: [] };
            restaurant.categories.push(category);
        } else {
            category = restaurant.categories.find(c => c.name === categoryName);
        }

        // Generate dish ID
        const dishId = `${restaurant.id}-${Date.now()}`;
        const newDish = {
            id: dishId,
            name: dish.name,
            description: dish.description,
            price: dish.price,
            image: dish.image || '',
            vegetarian: dish.vegetarian || false
        };

        category.items.push(newDish);
        await restaurant.save();

        res.status(201).json({
            success: true,
            message: 'Dish added successfully',
            data: newDish
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update dish
exports.updateDish = async (req, res) => {
    try {
        const { dishId } = req.params;
        const updates = req.body;

        const restaurant = await Restaurant.findById(req.user.restaurantId);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        let dishFound = false;

        restaurant.categories.forEach(category => {
            const dishIndex = category.items.findIndex(item => item.id === dishId);
            if (dishIndex !== -1) {
                Object.assign(category.items[dishIndex], updates);
                dishFound = true;
            }
        });

        if (!dishFound) {
            return res.status(404).json({
                success: false,
                message: 'Dish not found'
            });
        }

        await restaurant.save();

        res.json({
            success: true,
            message: 'Dish updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete dish
exports.deleteDish = async (req, res) => {
    try {
        const { dishId } = req.params;

        const restaurant = await Restaurant.findById(req.user.restaurantId);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        let dishFound = false;

        restaurant.categories.forEach(category => {
            const dishIndex = category.items.findIndex(item => item.id === dishId);
            if (dishIndex !== -1) {
                category.items.splice(dishIndex, 1);
                dishFound = true;
            }
        });

        if (!dishFound) {
            return res.status(404).json({
                success: false,
                message: 'Dish not found'
            });
        }

        await restaurant.save();

        res.json({
            success: true,
            message: 'Dish deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update restaurant settings
exports.updateRestaurantSettings = async (req, res) => {
    try {
        const updates = req.body;
        const allowedUpdates = ['name', 'address', 'cuisine', 'logo', 'cardImage', 'openTime', 'closeTime', 'totalTables', 'location'];

        const restaurant = await Restaurant.findById(req.user.restaurantId);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                restaurant[key] = updates[key];
            }
        });
        
        // If logo is updated, also update cardImage
        if (updates.logo) {
            restaurant.cardImage = updates.logo;
        }

        await restaurant.save();

        res.json({
            success: true,
            message: 'Restaurant settings updated successfully',
            data: restaurant
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Generate QR codes for tables
exports.generateTableQRs = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.user.restaurantId);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        const baseUrl = process.env.CLIENT_URL || 'http://localhost:5500';
        const qrCodes = [];

        for (let i = 1; i <= restaurant.totalTables; i++) {
            qrCodes.push({
                tableNumber: i,
                url: `${baseUrl}?restaurant=${restaurant.id}&table=${i}&mode=dinein`
            });
        }

        res.json({
            success: true,
            data: qrCodes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
