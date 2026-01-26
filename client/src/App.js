```javascript
import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  Outlet,
  useLocation
} from 'react-router-dom';

// Import global styles. A basic CSS file should be created for this.
// import './App.css';

// Import page components
import ProductListingPage from './pages/ProductListingPage';

// --- Placeholder Components (for demonstration and routing setup) ---
// In a real application, each of these would be in its own file.
const HomePage = () => <div className="container"><h2>Home Page</h2><p>Welcome to the Multi-Vendor Marketplace!</p></div>;
const ProductDetailPage = () => <div className="container"><h2>Product Detail Page</h2></div>;
const CartPage = () => <div className="container"><h2>Shopping Cart</h2></div>;
const CheckoutPage = () => <div className="container"><h2>Checkout</h2></div>;
const LoginPage = () => <div className="container"><h2>Login Page</h2></div>;
const RegisterPage = () => <div className="container"><h2>Register Page</h2></div>;
const UserProfilePage = () => <div className="container"><h2>User Profile</h2></div>;
const VendorDashboard = () => <div className="container"><h2>Vendor Dashboard</h2></div>;
const NotFoundPage = () => <div className="container"><h2>404 - Page Not Found</h2></div>;

// --- Layout Components ---
const Header = () => {
    const { user, logout } = useAuth();
    return (
        <header className="app-header">
            <nav className="container">
                <Link to="/" className="brand-logo">Marketplace</Link>
                <div className="nav-links">
                    <Link to="/products">Products</Link>
                    <Link to="/cart">Cart</Link>
                    {user ? (
                        <>
                            <Link to="/profile">Profile</Link>
                            {user.role === 'vendor' && <Link to="/vendor/dashboard">Dashboard</Link>}
                            <button onClick={logout} className="logout-button">Logout</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login">Login</Link>
                            <Link to="/register">Register</Link>
                        </>
                    )}
                </div>
            </nav>
        </header>
    );
};

const Footer = () => (
  <footer className="app-footer">
    <div className="container">
        <p>&copy; {new Date().getFullYear()} Multi-Vendor Marketplace. All rights reserved.</p>
    </div>
  </footer>
);

// --- Authentication Context & Provider ---
const AuthContext = createContext(null);

/**
 * Provides authentication state and functions to its children components.
 * Manages user session, token, and loading state.
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The child components to be rendered.
 */
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('authToken'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validateToken = async () => {
      if (token) {
        try {
          // In a real app, this would be an API call to an endpoint like `/api/auth/me`
          // to verify the token and fetch the user's data.
          console.log("Validating token...");
          // Mocking an API call with a delay
          await new Promise(resolve => setTimeout(resolve, 500));
          // Mock user data based on a dummy token.
          const mockUser = { id: '123', email: 'user@example.com', role: 'customer' }; // or 'vendor'
          setUser(mockUser);
        } catch (error) {
          console.error("Token validation failed:", error);
          localStorage.removeItem('authToken');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    validateToken();
  }, [token]);

  const login = (newToken, userData) => {
    localStorage.setItem('authToken', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
  };

  // Memoize the context value to prevent unnecessary re-renders of consumers.
  const value = React.useMemo(() => ({
    user,
    token,
    isLoading,
    login,
    logout,
  }), [user, token, isLoading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for easy consumption of the AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};

// --- Protected Route Component ---

/**
 * A wrapper for routes that require authentication.
 * It checks the user's authentication status and role before rendering the route.
 * @param {object} props - The component props.
 * @param {string[]} [props.allowedRoles] - An array of roles allowed to access the route. If not provided, any authenticated user is allowed.
 */
const ProtectedRoute = ({ allowedRoles }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Render a loading indicator while authentication status is being checked.
    return <div className="container"><h2>Loading...</h2></div>;
  }

  if (!user) {
    // Redirect unauthenticated users to the login page, saving the location they were trying to access.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect authorized users with insufficient permissions to an "unauthorized" page or home.
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If authenticated and authorized, render the child route component.
  return <Outlet />;
};


/**
 * The root component of the React application.
 * It sets up the global context providers and defines the application's routing structure.
 */
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Header />
          <main className="main-content">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/products" element={<ProductListingPage />} />
              <Route path="/products/:productId" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />

              {/* Protected Routes for any authenticated user */}
              <Route element={<ProtectedRoute />}>
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/profile" element={<UserProfilePage />} />
              </Route>

              {/* Protected Routes for vendors only */}
              <Route element={<ProtectedRoute allowedRoles={['vendor']} />}>
                <Route path="/vendor/dashboard" element={<VendorDashboard />} />
              </Route>

              {/* Fallback Route for 404 Not Found */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
```