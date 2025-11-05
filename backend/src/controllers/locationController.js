const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const { calculateDistance, calculateDeliveryFee, estimateDeliveryTime } = require('../utils/locationUtils');

// Save user location
exports.saveLocation = async (req, res) => {
    try {
        const { address, latitude, longitude } = req.body;

        if (!address || !latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Address and coordinates are required'
            });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.savedAddress = address;
        user.location = {
            type: 'Point',
            coordinates: [longitude, latitude]
        };

        await user.save();

        res.json({
            success: true,
            message: 'Location saved successfully',
            data: {
                address: user.savedAddress,
                coordinates: user.location.coordinates
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Calculate delivery info for a restaurant
exports.calculateDelivery = async (req, res) => {
    try {
        const { restaurantId, userLatitude, userLongitude } = req.body;

        if (!restaurantId || !userLatitude || !userLongitude) {
            return res.status(400).json({
                success: false,
                message: 'Restaurant ID and user coordinates are required'
            });
        }

        const restaurant = await Restaurant.findOne({ id: restaurantId });

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        // Check if restaurant has coordinates
        if (!restaurant.location || !restaurant.location.coordinates || 
            restaurant.location.coordinates[0] === 0 && restaurant.location.coordinates[1] === 0) {
            return res.json({
                success: true,
                data: {
                    distance: 0,
                    deliveryFee: 40,
                    estimatedTime: restaurant.deliveryTime || '30-40 mins',
                    hasLocation: false
                }
            });
        }

        const [restLon, restLat] = restaurant.location.coordinates;
        const distance = calculateDistance(restLat, restLon, userLatitude, userLongitude);
        const deliveryFee = calculateDeliveryFee(distance);
        const estimatedTime = estimateDeliveryTime(distance);

        res.json({
            success: true,
            data: {
                distance: distance,
                deliveryFee: deliveryFee,
                estimatedTime: estimatedTime,
                hasLocation: true,
                restaurantName: restaurant.name,
                restaurantAddress: restaurant.address || 'Address not available'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Get user's saved location
exports.getLocation = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                address: user.savedAddress || null,
                coordinates: user.location && user.location.coordinates && 
                           (user.location.coordinates[0] !== 0 || user.location.coordinates[1] !== 0)
                    ? user.location.coordinates 
                    : null
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
