/**
 * @file server/src/models/Order.js
 * @description Mongoose model for Orders in the multi-vendor marketplace.
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * @typedef {object} OrderItem
 * @property {string} name - The name of the product at the time of purchase.
 * @property {number} quantity - The number of units of the product ordered.
 * @property {string} image - The primary image URL of the product.
 * @property {number} price - The price of a single unit of the product at the time of purchase.
 * @property {mongoose.Schema.Types.ObjectId} product - Reference to the Product document.
 * @property {mongoose.Schema.Types.ObjectId} vendor - Reference to the User (vendor) document who owns the product.
 */
const orderItemSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Product name is required.'],
  },
  quantity: {
    type: Number,
    required: [true, 'Product quantity is required.'],
    min: [1, 'Quantity must be at least 1.'],
  },
  image: {
    type: String,
    required: [true, 'Product image is required.'],
  },
  price: {
    type: Number,
    required: [true, 'Product price at time of order is required.'],
  },
  product: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Product',
  },
  vendor: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User', // Refers to the vendor user
  },
});

/**
 * @typedef {object} ShippingAddress
 * @property {string} address - Street address and number.
 * @property {string} city - City name.
 * @property {string} postalCode - Postal or ZIP code.
 * @property {string} country - Country name.
 */
const shippingAddressSchema = new Schema({
    address: { type: String, required: [true, 'Street address is required.'] },
    city: { type: String, required: [true, 'City is required.'] },
    postalCode: { type: String, required: [true, 'Postal code is required.'] },
    country: { type: String, required: [true, 'Country is required.'] },
}, { _id: false }); // _id is not needed for this sub-document

/**
 * @typedef {object} PaymentResult
 * @property {string} id - Transaction ID from the payment provider.
 * @property {string} status - Status from the payment provider (e.g., 'COMPLETED').
 * @property {string} update_time - Timestamp of the payment update.
 * @property {string} email_address - Payer's email address from the payment provider.
 */
const paymentResultSchema = new Schema({
    id: { type: String },
    status: { type: String },
    update_time: { type: String },
    email_address: { type: String },
}, { _id: false });

/**
 * @typedef {object} Order
 * @description Represents a customer's order, potentially containing items from multiple vendors.
 */
const orderSchema = new Schema(
  {
    customer: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User', // Refers to the customer user
    },
    orderItems: [orderItemSchema],
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required.'],
    },
    paymentResult: {
      type: paymentResultSchema,
    },
    itemsPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    taxPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'],
        default: 'Pending',
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    isDelivered: {
      type: Boolean,
      required: true,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  }
);

// Create a compound index for efficient querying of a customer's orders
orderSchema.index({ customer: 1, createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;