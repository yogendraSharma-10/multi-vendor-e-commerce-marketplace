import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import global styles
import './App.css';

// Import core layout components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Spinner from './components/common/Spinner'; // A loading spinner for Suspense fallback

// Import context providers
import { AuthProvider } from './contexts/AuthContext';

// Import custom route handlers
import ProtectedRoute from './components/routing/ProtectedRoute';
import VendorRoute from './components/routing/VendorRoute';

// Lazy load page components for better performance (code splitting)
const HomePage = lazy(() => import('./pages/HomePage'));
const ProductListingPage = lazy(() => import('./pages/ProductListingPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'));
const OrderHistoryPage = lazy(() => import('./pages/OrderHistoryPage'));
const VendorDashboardPage = lazy(() => import('./pages/vendor/VendorDashboardPage'));
const VendorProductsPage = lazy(() => import('./pages/vendor/VendorProductsPage'));
const VendorOrdersPage = lazy(() => import('./pages/vendor/VendorOrdersPage'));
const VendorRegistrationPage = lazy(() => import('./pages/VendorRegistrationPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

/**
 * The main application component.
 * It sets up the router, global context providers, and defines the application's routes.
 *
 * @returns {JSX.Element} The rendered App component.
 */
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Header />
          <main className="main-content">
            <Suspense fallback={<Spinner />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/products" element={<ProductListingPage />} />
                <Route path="/products/:productId" element={<ProductDetailPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/vendor/register" element={<VendorRegistrationPage />} />

                {/* Protected Routes for Authenticated Users */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <UserProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cart"
                  element={
                    <ProtectedRoute>
                      <CartPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checkout"
                  element={
                    <ProtectedRoute>
                      <CheckoutPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute>
                      <OrderHistoryPage />
                    </ProtectedRoute>
                  }
                />

                {/* Protected Routes for Vendors */}
                <Route
                  path="/vendor/dashboard"
                  element={
                    <VendorRoute>
                      <VendorDashboardPage />
                    </VendorRoute>
                  }
                />
                <Route
                  path="/vendor/products"
                  element={
                    <VendorRoute>
                      <VendorProductsPage />
                    </VendorRoute>
                  }
                />
                <Route
                  path="/vendor/orders"
                  element={
                    <VendorRoute>
                      <VendorOrdersPage />
                    </VendorRoute>
                  }
                />

                {/* Catch-all 404 Route */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;