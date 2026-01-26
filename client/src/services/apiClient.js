import axios from 'axios';

// --- Configuration ---

/**
 * The base URL for the API.
 * It's recommended to use environment variables for production builds.
 * For development, it defaults to a local server instance.
 * @type {string}
 */
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Creates a configured instance of axios for API requests.
 * This instance includes the base URL and standard headers.
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Interceptors ---

/**
 * Axios request interceptor.
 * This function is called before every request is sent.
 * It retrieves the auth token from local storage and adds it to the
 * 'Authorization' header if it exists.
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
    // This will handle errors that occur before the request is sent
    return Promise.reject(error);
  }
);

/**
 * Axios response interceptor.
 * This function handles global responses and errors.
 * It's particularly useful for handling authentication errors (e.g., 401 Unauthorized)
 * which might indicate an expired token.
 */
apiClient.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    // Simply return the response data
    return response.data;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      if (error.response.status === 401) {
        // Handle unauthorized access, e.g., token expired
        // Clear user session and redirect to login
        localStorage.removeItem('authToken');
        // This check prevents errors during server-side rendering
        if (typeof window !== 'undefined') {
          // A custom event can be dispatched to notify the app to redirect
          window.dispatchEvent(new Event('auth-error'));
        }
      }
      // Return a structured error from the server's response
      return Promise.reject(error.response.data || { message: error.message });
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser
      return Promise.reject({ message: 'Network Error: No response from server.' });
    } else {
      // Something happened in setting up the request that triggered an Error
      return Promise.reject({ message: error.message });
    }
  }
);

// --- API Service Definitions ---

/**
 * A collection of API calls related to authentication.
 */
const authService = {
  /**
   * Logs in a user.
   * @param {{email: string, password: string}} credentials - The user's credentials.
   * @returns {Promise<{token: string, user: object}>} The auth token and user object.
   */
  login: (credentials) => apiClient.post('/auth/login', credentials),

  /**
   * Registers a new user.
   * @param {object} userData - The user's registration data.
   * @returns {Promise<{token: string, user: object}>} The auth token and user object.
   */
  register: (userData) => apiClient.post('/auth/register', userData),

  /**
   * Fetches the profile of the currently authenticated user.
   * @returns {Promise<object>} The user profile data.
   */
  getProfile: () => apiClient.get('/auth/profile'),
};

/**
 * A collection of API calls related to products.
 */
const productService = {
  /**
   * Fetches a paginated and filtered list of products.
   * @param {object} params - Query parameters for filtering and pagination.
   * @param {number} [params.page=1] - The page number to fetch.
   * @param {number} [params.limit=10] - The number of products per page.
   * @param {string} [params.category] - Filter by category ID.
   * @param {string} [params.vendorId] - Filter by vendor ID.
   * @param {string} [params.search] - Search query.
   * @returns {Promise<{products: Array<object>, totalPages: number, currentPage: number}>} The list of products and pagination info.
   */
  getProducts: (params) => apiClient.get('/products', { params }),

  /**
   * Fetches a single product by its ID.
   * @param {string} productId - The ID of the product.
   * @returns {Promise<object>} The product data.
   */
  getProductById: (productId) => apiClient.get(`/products/${productId}`),
};

/**
 * A collection of API calls related to vendors.
 */
const vendorService = {
  /**
   * Fetches a list of all vendors.
   * @returns {Promise<Array<object>>} A list of vendor objects.
   */
  getVendors: () => apiClient.get('/vendors'),

  /**
   * Fetches the details of a single vendor, including their products.
   * @param {string} vendorId - The ID of the vendor.
   * @returns {Promise<object>} The vendor's profile and product list.
   */
  getVendorDetails: (vendorId) => apiClient.get(`/vendors/${vendorId}`),
};

/**
 * A collection of API calls related to orders.
 */
const orderService = {
  /**
   * Creates a new order.
   * @param {object} orderData - The order payload.
   * @param {Array<{productId: string, quantity: number}>} orderData.items - The items in the order.
   * @param {string} orderData.shippingAddressId - The ID of the shipping address.
   * @param {string} orderData.paymentMethod - The payment method used.
   * @returns {Promise<object>} The newly created order object.
   */
  createOrder: (orderData) => apiClient.post('/orders', orderData),

  /**
   * Fetches the order history for the authenticated user.
   * @returns {Promise<Array<object>>} A list of the user's past orders.
   */
  getOrderHistory: () => apiClient.get('/orders/my-orders'),

  /**
   * Fetches the details of a specific order.
   * @param {string} orderId - The ID of the order.
   * @returns {Promise<object>} The detailed order object.
   */
  getOrderById: (orderId) => apiClient.get(`/orders/${orderId}`),
};

// --- Export ---

/**
 * The consolidated API client service object.
 * This object is exported and used throughout the application to interact with the backend API.
 */
const ApiService = {
  auth: authService,
  products: productService,
  vendors: vendorService,
  orders: orderService,
  // You can add other services here as the application grows, e.g., categories, reviews, etc.
};

export default ApiService;