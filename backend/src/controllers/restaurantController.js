const Restaurant = require('../models/Restaurant');

exports.getRestaurants = async (req, res) => {
    try {
        const { search } = req.query;
        let query = { isApproved: true }; // Only show approved restaurants

        if (search) {
            query = {
                isApproved: true, // Keep approval filter
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