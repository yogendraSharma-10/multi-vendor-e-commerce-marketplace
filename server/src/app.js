```javascript
/**
 * Main application file for the Node.js server.
 * This file initializes the Express application, sets up middleware,
 * connects to the database, defines API routes, and starts the server.
 *
 * @file server/src/app.js
 * @author Senior Developer
 */

// Load environment variables from a .env file into process.env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const path = require('path');

// --- Import Middleware ---
const { errorHandler } = require('./middleware/errorHandler');
const { notFoundHandler } = require('./middleware/notFoundHandler');
const rateLimiter = require('./middleware/rateLimiter');

// --- Import API Routes ---
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const vendorRoutes = require('./routes/vendors');
const cartRoutes = require('./routes/cart');
const paymentRoutes = require('./routes/payment');

// --- Initialize Express App ---
const app = express();

// --- Database Connection ---
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('FATAL ERROR: MONGO_URI is not defined in the environment variables.');
    process.exit(1);
}

mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Successfully connected to MongoDB.'))
.catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit process with failure
});

// --- Core Middleware Setup ---

// Set security-related HTTP headers
app.use(helmet());

// Configure CORS to allow requests from the frontend client
const corsOptions = {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Allow cookies to be sent
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// HTTP request logger middleware
// Use 'dev' format for development and 'combined' for production for more detailed logs
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat));

// Body parsing middleware
app.use(express.json({ limit: '10kb' })); // for parsing application/json
app.use(express.urlencoded({ extended: true, limit: '10kb' })); // for parsing application/x-www-form-urlencoded

// Apply rate limiting to all API requests to prevent abuse
app.use('/api/', rateLimiter);

// Serve static files (e.g., product images) from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


// --- API Routes ---
const API_PREFIX = '/api/v1';

// A simple root route for basic API information
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to the Multi-vendor E-commerce Marketplace API!',
        version: '1.0.0',
        documentation: '/api-docs' // Placeholder for future API docs
    });
});

// Health check endpoint for monitoring services
app.get(`${API_PREFIX}/health`, (req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        dbState: mongoose.STATES[mongoose.connection.readyState]
    });
});

// Mount the application's routers
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/products`, productRoutes);
app.use(`${API_PREFIX}/orders`, orderRoutes);
app.use(`${API_PREFIX}/vendors`, vendorRoutes);
app.use(`${API_PREFIX}/cart`, cartRoutes);
app.use(`${API_PREFIX}/payment`, paymentRoutes);


// --- Error Handling Middleware ---
// These must be the last middleware added to the app.

// Handle requests to routes that do not exist
app.use(notFoundHandler);

// Global error handler to catch all errors passed by next()
app.use(errorHandler);


// --- Server Initialization ---
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// --- Graceful Shutdown ---
// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});

// Handle SIGTERM signal (e.g., from Docker or cloud services)
process.on('SIGTERM', () => {
    console.info('SIGTERM signal received: closing HTTP server gracefully.');
    server.close(() => {
        console.log('HTTP server closed.');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed.');
            process.exit(0);
        });
    });
});

// Export the app for integration testing
module.exports = app;
```