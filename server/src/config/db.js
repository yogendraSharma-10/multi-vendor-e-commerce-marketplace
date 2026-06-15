const mongoose = require('mongoose');

/**
 * @description Establishes a connection to the MongoDB database using Mongoose.
 * This function reads the database connection string from the environment variables.
 * It's designed to be called once at the application's startup.
 * In case of a connection failure, it logs the error and terminates the application process,
 * as the database is a critical dependency for the marketplace to function.
 */
const connectDB = async () => {
  try {
    // Mongoose 6+ no longer requires most options to be set,
    // as they are now the default. We connect using the URI
    // from our environment variables for security and flexibility.
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`[INFO] MongoDB Connected: ${conn.connection.host}`);

    // NOTE: This database stores core e-commerce data. User data may be synced
    // or referenced from our 'Micro Social Media Dashboard' service to provide
    // a unified user experience across platforms. This is managed via a shared user ID.

  } catch (error) {
    console.error(`[ERROR] MongoDB connection failed: ${error.message}`);
    // Exit the process with a non-zero status code to indicate failure
    process.exit(1);
  }
};

// --- Mongoose Connection Event Listeners ---
// These listeners provide real-time feedback on the database connection status,
// which is crucial for monitoring and debugging in a production environment.

// Emitted when the connection is successfully established.
mongoose.connection.on('connected', () => {
  console.log('[INFO] Mongoose connection established.');
});

// Emitted when Mongoose has lost connection to the MongoDB server.
mongoose.connection.on('disconnected', () => {
  console.warn('[WARN] Mongoose connection lost.');
});

// Emitted if an error occurs on the connection.
mongoose.connection.on('error', (err) => {
  console.error(`[ERROR] Mongoose connection error: ${err}`);
});

// --- Graceful Shutdown ---
// Ensures that the database connection is properly closed when the application
// is terminated (e.g., via Ctrl+C in the terminal), preventing orphaned connections.
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('[INFO] Mongoose connection closed due to application termination.');
  process.exit(0);
});

module.exports = connectDB;