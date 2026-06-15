```javascript
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // Assuming react-router-dom is used for navigation
import apiClient from '../services/apiClient';
// A dedicated CSS file for this page would be created in a real project.
// For now, we can imagine the class names are styled there.
// import './ProductListingPage.css';

// --- Helper Components (In a real application, these would be in their own files) ---

/**
 * A simple loading spinner component.
 */
const LoadingSpinner = () => (
  <div style={styles.spinnerContainer}>
    <div style={styles.spinner}></div>
    <p>Loading products...</p>
  </div>
);

/**
 * Displays an error message.
 * @param {{ message: string }} props
 */
const ErrorDisplay = ({ message }) => (
  <div style={styles.errorDisplay}>
    <p><strong>Oops! Something went wrong.</strong></p>
    <p>{message}</p>
  </div>
);

/**
 * Renders a single product card.
 * @param {{ product: { id: string, name: string, imageUrl: string, vendor: { id: string, name: string }, price: number } }} props
 */
const ProductCard = ({ product }) => (
  <div style={styles.productCard}>
    <Link to={`/products/${product.id}`} style={styles.productLink}>
      <img src={product.imageUrl || 'https://via.placeholder.com/300x300?text=No+Image'} alt={product.name} style={styles.productImage} />
      <div style={styles.productInfo}>
        <h3 style={styles.productName}>{product.name}</h3>
        <p style={styles.productVendor}>Sold by: <Link to={`/vendors/${product.vendor.id}`}>{product.vendor.name}</Link></p>
        <p style={styles.productPrice}>${product.price.toFixed(2)}</p>
      </div>
    </Link>
  </div>
);

/**
 * Renders pagination controls.
 * @param {{ currentPage: number, totalPages: number, onPageChange: (page: number) => void }} props
 */
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav style={styles.pagination}>
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
        &laquo; Prev
      </button>
      {pages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          style={currentPage === page ? styles.activePage : {}}
        >
          {page}
        </button>
      ))}
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
        Next &raquo;
      </button>
    </nav>
  );
};


// --- Main Page Component ---

/**
 * ProductListingPage component
 * Fetches and displays a list of products with filtering, sorting, and pagination.
 */
const ProductListingPage = () => {
  // State for products, loading, and errors
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for filtering and sorting
  const [filters, setFilters] = useState({
    searchTerm: '',
    category: 'all',
    minPrice: '',
    maxPrice: '',
    sortBy: 'createdAt_desc',
  });

  // State for pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    limit: 16, // Number of products per page
  });

  // State for available categories (would be fetched from an API in a real app)
  const [categories, setCategories] = useState(['all', 'Electronics', 'Books', 'Clothing', 'Home Goods', 'Sports']);

  /**
   * Fetches products from the API based on current filters and pagination.
   * Wrapped in useCallback to prevent re-creation on every render, optimizing performance.
   */
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Construct query parameters from state
      const params = {
        page: pagination.currentPage,
        limit: pagination.limit,
        search: filters.searchTerm,
        category: filters.category === 'all' ? '' : filters.category,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        sort: filters.sortBy,
      };

      // Remove empty params to keep the URL clean
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null) {
          delete params[key];
        }
      });

      const response = await apiClient.get('/products', { params });
      
      // Assuming the API returns data in the shape: { products: [], totalPages: number, currentPage: number }
      setProducts(response.data.products);
      setPagination(prev => ({
        ...prev,
        totalPages: response.data.totalPages,
      }));

    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch products. Please try again later.';
      setError(errorMessage);
      console.error("API Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.currentPage, pagination.limit]);

  // Effect to fetch products when filters or page change
  useEffect(() => {
    // Debounce the fetch call to avoid excessive API requests while typing
    const handler = setTimeout(() => {
        fetchProducts();
    }, 500); // 500ms delay

    return () => {
        clearTimeout(handler);
    };
  }, [fetchProducts]);

  /**
   * Handles changes in filter inputs.
   * @param {React.ChangeEvent<HTMLInputElement | HTMLSelectElement>} e - The event object.
   */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      [name]: value,
    }));
    // Reset to the first page whenever filters change to show the most relevant results
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  /**
   * Handles page changes from the pagination component.
   * @param {number} newPage - The new page number.
   */
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }));
      // Scroll to top of the product grid for better UX
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderContent = () => {
    if (loading) {
      return <LoadingSpinner />;
    }
    if (error) {
      return <ErrorDisplay message={error} />;
    }
    if (products.length === 0) {
      return <div style={styles.noProducts}><h2>No products found.</h2><p>Try adjusting your filters.</p></div>;
    }
    return (
      <div style={styles.productGrid}>
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    );
  };

  return (
    <div style={styles.page}>
      <header style={styles.pageHeader}>
        <h1>Explore Our Marketplace</h1>
        <p>Find the best products from thousands of vendors.</p>
      </header>
      <div style={styles.pageContent}>
        <aside style={styles.filtersSidebar}>
          <h2>Filters</h2>
          <div style={styles.filterGroup}>
            <label htmlFor="searchTerm">Search</label>
            <input
              type="text"
              id="searchTerm"
              name="searchTerm"
              placeholder="Product name..."
              value={filters.searchTerm}
              onChange={handleFilterChange}
              style={styles.input}
            />
          </div>
          <div style={styles.filterGroup}>
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              style={styles.input}
            >
              {categories.map(cat => <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
            </select>
          </div>
          <div style={styles.filterGroup}>
            <label>Price Range</label>
            <div style={styles.priceInputs}>
              <input
                type="number"
                name="minPrice"
                placeholder="Min"
                value={filters.minPrice}
                onChange={handleFilterChange}
                min="0"
                style={styles.priceInput}
              />
              <span>-</span>
              <input
                type="number"
                name="maxPrice"
                placeholder="Max"
                value={filters.maxPrice}
                onChange={handleFilterChange}
                min="0"
                style={styles.priceInput}
              />
            </div>
          </div>
        </aside>
        <main style={styles.productsMain}>
          <div style={styles.toolbar}>
            <p>Showing {products.length} results</p>
            <div style={styles.sortControl}>
              <label htmlFor="sortBy">Sort by:</label>
              <select
                id="sortBy"
                name="sortBy"
                value={filters.sortBy}
                onChange={handleFilterChange}
                style={styles.input}
              >
                <option value="createdAt_desc">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name_asc">Name: A to Z</option>
              </select>
            </div>
          </div>
          {renderContent()}
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        </main>
      </div>
    </div>
  );
};

// Basic inline styles for demonstration. In a real project, use CSS modules or a styled-component library.
const styles = {
  page: { fontFamily: 'Arial, sans-serif', color: '#333' },
  pageHeader: { textAlign: 'center', padding: '2rem 1rem', borderBottom: '1px solid #eee' },
  pageContent: { display: 'flex', padding: '1rem' },
  filtersSidebar: { flex: '0 0 250px', padding: '0 1rem' },
  filterGroup: { marginBottom: '1.5rem' },
  input: { width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' },
  priceInputs: { display: 'flex', alignItems: 'center', gap: '8px' },
  priceInput: { width: 'calc(50% - 4px)' },
  productsMain: { flex: '1', paddingLeft: '1rem' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  sortControl: { display: 'flex', alignItems: 'center', gap: '8px' },
  productGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' },
  productCard: { border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', transition: 'transform 0.2s ease-in-out', ':hover': { transform: 'translateY(-5px)' } },
  productLink: { textDecoration: 'none', color: 'inherit' },
  productImage: { width: '100%', height: '200px', objectFit: 'cover', display: 'block' },
  productInfo: { padding: '1rem' },
  productName: { margin: '0 0 0.5rem', fontSize: '1rem' },
  productVendor: { margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#666' },
  productPrice: { margin: '0', fontSize: '1.1rem', fontWeight: 'bold' },
  pagination: { display: 'flex', justifyContent: 'center', padding: '2rem 0', gap: '8px' },
  activePage: { fontWeight: 'bold', border: '2px solid #007bff', backgroundColor: '#e7f3ff' },
  spinnerContainer: { textAlign: 'center', padding: '4rem' },
  errorDisplay: { textAlign: 'center', padding: '4rem', color: 'red', border: '1px solid red', borderRadius: '8px', backgroundColor: '#fff5f5' },
  noProducts: { textAlign: 'center', padding: '4rem' },
};

export default ProductListingPage;
```