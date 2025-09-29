const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        }
    }],
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        default: 'Order Placed',
        enum: ['Payment Completed', 'Shipped', 'Delivered', 'Cancelled']
    }
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

module.exports = { Order };