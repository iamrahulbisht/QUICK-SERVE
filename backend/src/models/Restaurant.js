const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    id: String,
    name: String,
    description: String,
    price: Number,
    image: String,
    vegetarian: Boolean
});

const categorySchema = new mongoose.Schema({
    name: String,
    items: [menuItemSchema]
});

const restaurantSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    emoji: String,
    cardImage: String,
    cuisine: String,
    rating: Number,
    deliveryTime: String,
    categories: [categorySchema]
}, {
    timestamps: true
});

module.exports = mongoose.model('Restaurant', restaurantSchema);