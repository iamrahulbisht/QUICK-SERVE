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
    address: {
        type: String,
        required: true
    },
    paymentMethod: {
        type: String,
        default: 'cod'
    },
    status: {
        type: String,
        enum: ['Placed', 'Preparing', 'Delivered', 'Cancelled'],
        default: 'Placed'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);