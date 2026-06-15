```javascript
/**
 * Main application file for the Node.js server.
 * This file configures the Express application, sets up middleware,
 * connects to the database, and defines the API routes.
 *
 * @project Multi-vendor E-commerce Marketplace
 * @author Senior Developer
 */

// --- Core Node.js and Third-Party Modules ---
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = 'morgan';
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const xss = require('xss-clean');
const path = require('path');
const cookieParser = require('cookie-parser');

// --- Application-Specific Imports ---
const connectDB = require('./config/db'); // Assumes a db connection utility
const errorHandler = require('./middleware/errorHandler'); // Custom global error handler
const AppError = require('./utils/appError'); // Custom error class

// --- Route Imports ---
// Centralizing route definitions for cleaner app setup
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const vendorRoutes = require('./routes/vendors');

// --- Initial Configuration ---
// Load environment variables from .env file into process.env
dotenv.config({ path: './.env' });

// --- Database Connection ---
// Establish connection to the MongoDB database
connectDB();

// --- Express App Initialization ---
const app = express();

// --- Global Middleware Setup ---

// 1. Security HTTP Headers
// Sets various HTTP headers to help secure the app (e.g., X-XSS-Protection, Strict-Transport-Security)
app.use(helmet());

// 2. Cross-Origin Resource Sharing (CORS)
// Enables controlled access to resources from different origins.
// In production, this should be strictly configured to the frontend's domain.
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // Important for sending cookies/session info
};
app.use(cors(corsOptions));

// 3. API Rate Limiting
// Protects against brute-force and denial-of-service attacks.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes.',
});
app.use('/api', limiter); // Apply the rate limiting middleware to all API routes

// 4. Body Parsers
// Parses incoming request bodies, making them available under `req.body`.
app.use(express.json({ limit: '15kb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '15kb' }));

// 5. Cookie Parser
// Parses Cookie header and populates req.cookies with an object keyed by the cookie names.
app.use(cookieParser());

// 6. Data Sanitization
// Protects against NoSQL query injection and XSS attacks.
app.use(xss()); // Sanitize against XSS

// 7. HTTP Parameter Pollution (HPP) Protection
// Prevents attackers from overriding parameters.
app.use(
  hpp({
    whitelist: [
      // Add parameters that are allowed to appear multiple times in the query string
      'price',
      'ratingsAverage',
      'category',
      'brand',
      'sort',
    ],
  })
);

// 8. HTTP Request Logging
// Logs request details to the console during development for easier debugging.
if (process.env.NODE_ENV === 'development') {
  app.use(require('morgan')('dev'));
}

// --- Static File Serving ---
// Serves static files like product images from the 'uploads' directory.
// In a production environment, it's highly recommended to use a cloud storage service (e.g., AWS S3).
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- API Routes ---
const API_BASE_PATH = '/api/v1';

// Health check endpoint for monitoring and uptime checks
app.get(`${API_BASE_PATH}/health`, (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is healthy and running.',
    timestamp: new Date().toISOString(),
  });
});

// Mount the imported route handlers
app.use(`${API_BASE_PATH}/auth`, authRoutes);
app.use(`${API_BASE_PATH}/users`, userRoutes);
app.use(`${API_BASE_PATH}/products`, productRoutes);
app.use(`${API_BASE_PATH}/orders`, orderRoutes);
app.use(`${API_BASE_PATH}/vendors`, vendorRoutes);

// --- Error Handling Middleware ---

// 1. Handle 404 Not Found errors for unhandled routes
// This middleware is triggered if no other route matches the request.
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 2. Global Error Handler
// Catches all errors passed by `next(err)` from any part of the application.
// Provides a consistent error response format.
app.use(errorHandler);

// --- Export the Express App ---
// Exporting the app object allows the server startup logic (in server.js)
// to be separated, which is a best practice for testing and maintainability.
module.exports = app;
```