const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    itemId: String,
    itemName: String,
    restaurantId: String,
    restaurantName: String,
    price: Number,
    quantity: Number,
    image: String
});

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userEmail: String,
    items: [orderItemSchema],
    subtotal: Number,
    deliveryFee: {
        type: Number,
        default: 40
    },
    total: Number,
    mode: {
        type: String,
        enum: ['delivery', 'dinein'],
        default: 'delivery'
    },
    tableNumber: {
        type: Number
    },
    address: {
        type: String
    },
    deliveryLocation: {
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
    distance: {
        type: Number,
        default: 0
    },
    estimatedDeliveryTime: {
        type: String,
        default: '30-40 mins'
    },
    paymentMethod: {
        type: String,
        default: 'cod'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'pending'
    },
    status: {
        type: String,
        enum: ['received', 'preparing', 'served', 'delivered', 'cancelled'],
        default: 'received'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);