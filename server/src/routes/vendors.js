```javascript
/**
 * @fileoverview Vendor API routes for the e-commerce marketplace.
 *
 * This file defines the API endpoints related to vendors. It includes routes for
 * public access to vendor information, as well as protected routes for vendors
 * to manage their profiles, products, and orders.
 *
 * @requires express - The Express framework for creating router.
 * @requires express-validator - Middleware for input validation.
 * @requires ../middleware/auth - Authentication and authorization middleware.
 * @requires ../models/Vendor - The Vendor Mongoose model.
 * @requires ../models/Product - The Product Mongoose model.
 * @requires ../models/Order - The Order Mongoose model.
 * @requires ../models/User - The User Mongoose model.
 */

const express = require('express');
const { check, validationResult } = require('express-validator');
const { auth, authorize } = require('../middleware/auth'); // Assuming authorize middleware exists

// Assuming Mongoose models are set up in these paths
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');

const router = express.Router();

// =================================================================================================
// == PUBLIC ROUTES ==
// =================================================================================================

/**
 * @route   GET /api/vendors
 * @desc    Get all approved vendors
 * @access  Public
 * @returns {Array<Object>} A list of approved vendors with public information.
 */
router.get('/', async (req, res) => {
  try {
    // Find vendors with 'approved' status and populate their user info
    // We only select fields that should be public
    const vendors = await Vendor.find({ status: 'approved' }).populate('user', [
      'name',
      'createdAt',
    ]);

    if (!vendors) {
      return res.status(404).json({ msg: 'No vendors found' });
    }

    res.json(vendors);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET /api/vendors/:vendorId
 * @desc    Get a specific vendor's public profile by their ID
 * @access  Public
 * @param   {string} vendorId - The ID of the vendor to retrieve.
 * @returns {Object} The vendor's public profile.
 * @returns {Array<Object>} A list of products by the vendor.
 */
router.get('/:vendorId', async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.vendorId)
      .where('status')
      .equals('approved')
      .populate('user', ['name', 'createdAt']);

    if (!vendor) {
      return res.status(404).json({ msg: 'Vendor not found or not approved' });
    }

    // Also fetch the products for this vendor
    const products = await Product.find({ vendor: vendor.user })
      .where('isPublished')
      .equals(true);

    res.json({ vendor, products });
  } catch (err) {
    console.error(err.message);
    // Handle invalid ObjectId format
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Vendor not found' });
    }
    res.status(500).send('Server Error');
  }
});

// =================================================================================================
// == VENDOR PROTECTED ROUTES ==
// =================================================================================================

/**
 * @route   GET /api/vendors/me/profile
 * @desc    Get the profile of the currently logged-in vendor
 * @access  Private (Vendor)
 * @returns {Object} The vendor's complete profile information.
 */
router.get('/me/profile', auth, authorize('vendor'), async (req, res) => {
  try {
    // req.user.id is available from the 'auth' middleware
    const vendor = await Vendor.findOne({ user: req.user.id }).populate('user', [
      'name',
      'email',
    ]);

    if (!vendor) {
      return res.status(404).json({
        msg: 'Vendor profile not found. Please create one.',
      });
    }

    res.json(vendor);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   POST /api/vendors/me/profile
 * @desc    Create or update the logged-in vendor's profile
 * @access  Private (Vendor)
 * @body    {string} shopName - The name of the vendor's shop.
 * @body    {string} description - A description of the shop.
 * @body    {string} [phoneNumber] - Contact phone number.
 * @body    {Object} [address] - The vendor's physical address.
 * @returns {Object} The newly created or updated vendor profile.
 */
router.post(
  '/me/profile',
  [
    auth,
    authorize('vendor'),
    [
      check('shopName', 'Shop name is required').not().isEmpty(),
      check('description', 'Description is required').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { shopName, description, phoneNumber, address } = req.body;

    // Build vendor profile object
    const profileFields = {
      user: req.user.id,
      shopName,
      description,
    };
    if (phoneNumber) profileFields.phoneNumber = phoneNumber;
    if (address) profileFields.address = address;

    try {
      // Using upsert option (create if not exists)
      let vendor = await Vendor.findOneAndUpdate(
        { user: req.user.id },
        { $set: profileFields },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).populate('user', ['name', 'email']);

      res.json(vendor);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

/**
 * @route   GET /api/vendors/me/orders
 * @desc    Get all orders containing products from the logged-in vendor
 * @access  Private (Vendor)
 * @returns {Array<Object>} A list of orders relevant to the vendor.
 */
router.get('/me/orders', auth, authorize('vendor'), async (req, res) => {
  try {
    // This is a complex query. We need to find orders that contain at least one
    // product belonging to the current vendor.
    const vendorProducts = await Product.find({ vendor: req.user.id }).select('_id');
    const productIds = vendorProducts.map(p => p._id);

    const orders = await Order.find({ 'items.product': { $in: productIds } })
      .populate('user', ['name', 'email'])
      .populate('items.product', ['name', 'price']);

    if (!orders.length) {
      return res.json([]); // Return empty array if no orders found
    }

    // Filter order items to only show items relevant to this vendor
    const vendorOrders = orders.map(order => {
      const vendorItems = order.items.filter(item =>
        productIds.some(pId => pId.equals(item.product._id))
      );
      // Return a modified order object
      return {
        _id: order._id,
        user: order.user,
        totalPrice: order.totalPrice, // Note: This is the total for the whole order
        status: order.status,
        createdAt: order.createdAt,
        items: vendorItems, // Only items for this vendor
      };
    });

    res.json(vendorOrders);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET /api/vendors/me/dashboard
 * @desc    Get sales dashboard data for the logged-in vendor
 * @access  Private (Vendor)
 * @returns {Object} An object containing dashboard metrics.
 */
router.get('/me/dashboard', auth, authorize('vendor'), async (req, res) => {
    try {
        // 1. Get all product IDs for the current vendor
        const vendorProducts = await Product.find({ vendor: req.user.id }).select('_id');
        const productIds = vendorProducts.map(p => p._id);

        if (productIds.length === 0) {
            return res.json({
                totalRevenue: 0,
                totalOrders: 0,
                totalProductsSold: 0,
                recentOrders: []
            });
        }

        // 2. Find all completed orders containing these products
        const completedOrders = await Order.find({
            'items.product': { $in: productIds },
            status: 'Completed' // Assuming 'Completed' is a valid status
        }).sort({ createdAt: -1 });

        let totalRevenue = 0;
        let totalProductsSold = 0;

        // 3. Calculate metrics by iterating through the orders
        completedOrders.forEach(order => {
            order.items.forEach(item => {
                // Check if the item's product belongs to the vendor
                if (productIds.some(pId => pId.equals(item.product))) {
                    totalRevenue += item.quantity * item.price;
                    totalProductsSold += item.quantity;
                }
            });
        });
        
        // 4. Get recent orders (can reuse the logic from /me/orders)
        const recentOrdersRaw = await Order.find({ 'items.product': { $in: productIds } })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('user', 'name');

        const recentOrders = recentOrdersRaw.map(order => {
            const vendorItems = order.items.filter(item =>
                productIds.some(pId => pId.equals(item.product))
            );
            const orderTotalForVendor = vendorItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            return {
                orderId: order._id,
                customerName: order.user.name,
                date: order.createdAt,
                status: order.status,
                total: orderTotalForVendor
            };
        });

        res.json({
            totalRevenue,
            totalOrders: completedOrders.length,
            totalProductsSold,
            recentOrders
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;
```