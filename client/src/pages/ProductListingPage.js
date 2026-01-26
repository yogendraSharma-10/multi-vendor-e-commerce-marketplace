```javascript
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../services/apiClient';
import './ProductListingPage.css'; // Assuming a corresponding CSS file for styling

// --- Reusable UI Components ---
// In a larger application, these would be in their own files (e.g., /src/components/)

/**
 * A simple loading spinner component.
 */
const Spinner = () => (
  <div className="spinner-container">
    <div className="spinner"></div>
    <p>Loading Products...</p>
  </div>
);

/**
 * A component to display an error message.
 * @param {{ message: string }} props
 */
const ErrorMessage = ({ message }) => (
  <div className="error-message">
    <h3>Oops! Something went wrong.</h3>
    <p>{message || 'We could not load the products. Please try again later.'}</p>
  </div>
);

/**
 * A component to display a single product card.
 * @param {{ product: object }} props - The product data to display.
 */
const ProductCard = ({ product }) => (
  <div className="product-card">
    <Link to={`/products/${product.id}`} className="product-card-link">
      <div className="product-image-container">
        <img 
          src={product.imageUrl || 'https://via.placeholder.com/300x300.png?text=No+Image'} 
          alt={product.name} 
          className="product-image" 
        />
      </div>
      <div className="product-info">
        <h3 className="product-name" title={product.name}>{product.name}</h3>
        {product.vendor && <p className="product-vendor">Sold by: {product.vendor.name}</p>}
        <p className="product-price">${product.price.toFixed(2)}</p>
      </div>
    </Link>
  </div>
);

/**
 * Pagination controls component.
 * @param {{ currentPage: number, totalPages: number, onPageChange: (page: number) => void }} props
 */
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) {
    return null;
  }

  const handlePageClick = (page) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav className="pagination">
      <button onClick={() => handlePageClick(currentPage - 1)} disabled={currentPage === 1}>
        &laquo; Prev
      </button>
      {pageNumbers.map(page => (
        <button
          key={page}
          onClick={() => handlePageClick(page)}
          className={currentPage === page ? 'active' : ''}
        >
          {page}
        </button>
      ))}
      <button onClick={() => handlePageClick(currentPage + 1)} disabled={currentPage === totalPages}>
        Next &raquo;
      </button>
    </nav>
  );
};

// --- Main Page Component ---

/**
 * Renders the Product Listing Page.
 * This page fetches and displays a grid of products from the marketplace,
 * providing users with filtering and pagination capabilities.
 */
const ProductListingPage = () => {
  // Core state for data, loading, and errors
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for filtering criteria
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'createdAt:desc', // Default sort
  });

  // State for pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0,
  });

  // State for available categories, fetched once
  const [categories, setCategories] = useState([]);

  /**
   * Fetches products from the API based on current filters and pagination.
   * Memoized with useCallback to prevent re-creation on every render,
   * making it a stable dependency for the main useEffect hook.
   */
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Construct query parameters, removing any empty values
      const params = {
        page: pagination.currentPage,
        limit: 16, // Number of products per page
        ...filters,
      };
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null) {
          delete params[key];
        }
      });

      const response = await apiClient.get('/products', { params });
      
      setProducts(response.data.products || []);
      setPagination({
        currentPage: response.data.currentPage,
        totalPages: response.data.totalPages,
        totalProducts: response.data.totalProducts,
      });

    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'An unexpected error occurred.';
      setError(errorMessage);
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.currentPage]);

  // Effect to fetch products whenever filters or the current page change.
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Effect to fetch categories for the filter dropdown, runs only once on mount.
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiClient.get('/categories');
        setCategories(response.data || []);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        // This is a non-critical failure, so we don't set a page-level error.
      }
    };
    fetchCategories();
  }, []);

  /**
   * Handles changes in any filter input field.
   * @param {React.ChangeEvent<HTMLInputElement | HTMLSelectElement>} e The input change event.
   */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: value,
    }));
  };

  /**
   * Applies the current filters and resets pagination to the first page.
   * This is triggered by a form submission or button click.
   * @param {React.FormEvent<HTMLFormElement>} e The form submission event.
   */
  const handleFilterSubmit = (e) => {
    e.preventDefault();
    // Resetting to page 1 is a standard UX pattern when filters change.
    if (pagination.currentPage !== 1) {
      setPagination(prev => ({ ...prev, currentPage: 1 }));
    } else {
      // If already on page 1, the useEffect won't re-trigger, so we fetch manually.
      fetchProducts();
    }
  };

  return (
    <div className="product-listing-page">
      <aside className="filters-sidebar">
        <h2>Filters</h2>
        <form onSubmit={handleFilterSubmit}>
          <div className="filter-group">
            <label htmlFor="search">Search</label>
            <input
              type="text"
              id="search"
              name="search"
              placeholder="Product name..."
              value={filters.search}
              onChange={handleFilterChange}
            />
          </div>
          <div className="filter-group">
            <label htmlFor="category">Category</label>
            <select id="category" name="category" value={filters.category} onChange={handleFilterChange}>
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.slug}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Price Range</label>
            <div className="price-inputs">
              <input type="number" name="minPrice" placeholder="Min" min="0" value={filters.minPrice} onChange={handleFilterChange} />
              <span>-</span>
              <input type="number" name="maxPrice" placeholder="Max" min="0" value={filters.maxPrice} onChange={handleFilterChange} />
            </div>
          </div>
          <button type="submit" className="apply-filters-btn">Apply</button>
        </form>
      </aside>

      <main className="products-main-content">
        <header className="products-header">
          <h1>Marketplace</h1>
          {!loading && !error && (
            <p>Showing {products.length} of {pagination.totalProducts} results</p>
          )}
        </header>
        
        {loading && <Spinner />}
        {error && <ErrorMessage message={error} />}
        
        {!loading && !error && (
          <>
            {products.length > 0 ? (
              <div className="products-grid">
                {products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="no-products-found">
                <h3>No Products Found</h3>
                <p>Try adjusting your search or filter criteria.</p>
              </div>
            )}
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={(page) => setPagination(p => ({ ...p, currentPage: page }))}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default ProductListingPage;
```