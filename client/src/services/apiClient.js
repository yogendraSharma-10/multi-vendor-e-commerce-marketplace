import axios from 'axios';

/**
 * @file apiClient.js
 * @description Centralized API client for the React application.
 * This file configures an Axios instance with a base URL, default headers,
 * and interceptors for handling authentication tokens and global error responses.
 * It exports a structured object of API methods for different resources.
 */

// Determine the base URL for the API from environment variables,
// with a fallback for local development.
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Create a new Axios instance with a custom configuration.
 * @type {import('axios').AxiosInstance}
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Set a default timeout for requests (e.g., 10 seconds)
  timeout: 10000,
});

/**
 * Request Interceptor
 *
 * This interceptor runs before each request is sent.
 * It retrieves the authentication token from local storage (if it exists)
 * and attaches it to the 'Authorization' header as a Bearer token.
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Handle request configuration errors
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 *
 * This interceptor handles responses from the API.
 * It passes through successful responses but intercepts errors globally.
 * This is useful for handling common error cases like expired tokens (401).
 */
apiClient.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    const { response } = error;

    if (response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx.
      if (response.status === 401) {
        // Unauthorized: Token might be invalid or expired.
        // Clear user data and redirect to login.
        console.error('Authentication error: Token is invalid or expired.');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        // Use a more robust navigation method if using React Router
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } else if (response.status === 403) {
        // Forbidden: User does not have permission.
        console.error('Permission denied.');
      } else if (response.status >= 500) {
        // Server error
        console.error('Server error:', response.status, response.data);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Network error: No response received from server.', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }

    // Propagate the error so it can be caught by the calling code (.catch block)
    // Return a structured error object for easier handling in components.
    return Promise.reject(response?.data || { message: error.message });
  }
);

/**
 * A helper function to extract the `data` property from an Axios response.
 * @param {import('axios').AxiosResponse} response - The Axios response object.
 * @returns {any} The data from the response.
 */
const handleResponse = (response) => response.data;

/**
 * A collection of API methods, organized by resource.
 * Each method returns a promise that resolves with the response data.
 */
const api = {
  auth: {
    /**
     * Logs in a user.
     * @param {{email: string, password: string}} credentials - The user's credentials.
     * @returns {Promise<{token: string, user: object}>}
     */
    login: (credentials) => apiClient.post('/auth/login', credentials).then(handleResponse),

    /**
     * Registers a new user.
     * @param {object} userData - The user's registration data.
     * @returns {Promise<{token: string, user: object}>}
     */
    register: (userData) => apiClient.post('/auth/register', userData).then(handleResponse),

    /**
     * Fetches the profile of the currently authenticated user.
     * @returns {Promise<object>} The user profile data.
     */
    getProfile: () => apiClient.get('/auth/profile').then(handleResponse),
  },

  products: {
    /**
     * Fetches a list of products with optional filtering and pagination.
     * @param {object} [params] - Query parameters.
     * @param {number} [params.page=1] - The page number.
     * @param {number} [params.limit=10] - The number of items per page.
     * @param {string} [params.category] - Filter by category.
     * @param {string} [params.vendorId] - Filter by vendor.
     * @param {string} [params.sortBy] - Sorting criteria (e.g., 'price_asc').
     * @returns {Promise<{products: Array<object>, totalPages: number, currentPage: number}>}
     */
    getAll: (params) => apiClient.get('/products', { params }).then(handleResponse),

    /**
     * Fetches a single product by its ID.
     * @param {string} productId - The ID of the product.
     * @returns {Promise<object>} The product data.
     */
    getById: (productId) => apiClient.get(`/products/${productId}`).then(handleResponse),

    /**
     * Creates a new product (vendor-only).
     * @param {FormData} productData - The product data, likely as FormData for image uploads.
     * @returns {Promise<object>} The newly created product.
     */
    create: (productData) => apiClient.post('/products', productData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(handleResponse),
  },

  vendors: {
    /**
     * Fetches a list of all vendors.
     * @returns {Promise<Array<object>>} A list of vendors.
     */
    getAll: () => apiClient.get('/vendors').then(handleResponse),

    /**
     * Fetches a single vendor by their ID, including their products.
     * @param {string} vendorId - The ID of the vendor.
     * @returns {Promise<object>} The vendor data.
     */
    getById: (vendorId) => apiClient.get(`/vendors/${vendorId}`).then(handleResponse),
  },

  orders: {
    /**
     * Creates a new order.
     * @param {object} orderData - The order details.
     * @param {Array<{productId: string, quantity: number}>} orderData.items - The items in the order.
     * @param {string} orderData.shippingAddressId - The ID of the shipping address.
     * @returns {Promise<object>} The newly created order.
     */
    create: (orderData) => apiClient.post('/orders', orderData).then(handleResponse),

    /**
     * Fetches the orders for the currently authenticated user.
     * @returns {Promise<Array<object>>} A list of the user's orders.
     */
    getMyOrders: () => apiClient.get('/orders/my-orders').then(handleResponse),

    /**
     * Fetches a single order by its ID.
     * @param {string} orderId - The ID of the order.
     * @returns {Promise<object>} The order data.
     */
    getById: (orderId) => apiClient.get(`/orders/${orderId}`).then(handleResponse),
  },

  // Add other resource endpoints as needed (e.g., categories, reviews, etc.)
};

export default api;