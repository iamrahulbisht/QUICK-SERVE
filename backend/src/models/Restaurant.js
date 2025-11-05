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
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    emoji: String,
    cardImage: String,
    logo: String,
    cuisine: String,
    rating: {
        type: Number,
        default: 0
    },
    deliveryTime: String,
    openTime: {
        type: String,
        default: '09:00'
    },
    closeTime: {
        type: String,
        default: '22:00'
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    categories: [categorySchema],
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [0, 0]
        }
    },
    address: String,
    totalTables: {
        type: Number,
        default: 10
    }
}, {
    timestamps: true
});

restaurantSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Restaurant', restaurantSchema);