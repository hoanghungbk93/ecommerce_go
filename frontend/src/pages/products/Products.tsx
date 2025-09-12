import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchProducts } from '../../store/slices/productsSlice';
import { addToCart } from '../../store/slices/cartSlice';
import { Product } from '../../types';

const Products: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { products, loading, error } = useSelector((state: RootState) => state.products);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;

  useEffect(() => {
    dispatch(fetchProducts({ 
      search: searchTerm,
      category: selectedCategory || undefined,
      page: currentPage,
      limit: 50 // Fetch more for client-side filtering
    }));
  }, [dispatch, searchTerm, selectedCategory, currentPage]);

  const handleAddToCart = (product: Product) => {
    dispatch(addToCart({ product, quantity: 1 }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const categories = [
    { id: '', name: 'All Categories' },
    { id: '1', name: 'Electronics' },
    { id: '2', name: 'Clothing' },
    { id: '3', name: 'Books' },
    { id: '4', name: 'Home & Garden' },
    { id: '5', name: 'Sports' },
  ];

  // Filter and sort products
  let filteredProducts = [...products];
  
  if (sortBy === 'price-low') {
    filteredProducts.sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price-high') {
    filteredProducts.sort((a, b) => b.price - a.price);
  } else if (sortBy === 'name') {
    filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + productsPerPage);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem' }}>Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ color: 'red', fontSize: '1.2rem' }}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>
          Our Products
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#6b7280' }}>
          Discover our wide range of quality products
        </p>
      </div>

      {/* Search and Filters */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        alignItems: 'center',
        padding: '1rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Search */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', flex: '1', minWidth: '200px' }}>
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '1rem'
            }}
          />
          <button
            type="submit"
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500'
            }}
          >
            Search
          </button>
        </form>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '1rem',
            minWidth: '150px'
          }}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '1rem',
            minWidth: '120px'
          }}
        >
          <option value="name">Sort by Name</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
        </select>
      </div>

      {/* Products Grid */}
      {paginatedProducts.length > 0 ? (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
            marginBottom: '3rem'
          }}>
            {paginatedProducts.map((product) => (
              <div key={product.id} style={{
                border: '1px solid #e5e5e5',
                borderRadius: '12px',
                padding: '1.5rem',
                backgroundColor: 'white',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                transition: 'transform 0.3s, box-shadow 0.3s',
                position: 'relative'
              }}>
                {product.is_featured && (
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    FEATURED
                  </div>
                )}
                
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  style={{
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                  }}
                />
                
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ 
                    marginBottom: '0.5rem', 
                    fontSize: '1.3rem', 
                    color: '#111827',
                    height: '2.6rem',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {product.name}
                  </h3>
                  
                  <p style={{ 
                    color: '#6b7280', 
                    marginBottom: '1rem', 
                    fontSize: '0.9rem',
                    height: '2.7rem',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {product.short_description || product.description?.substring(0, 100) + '...'}
                  </p>
                  
                  {product.brand && (
                    <p style={{ 
                      color: '#9ca3af', 
                      fontSize: '0.85rem', 
                      marginBottom: '0.5rem',
                      fontWeight: '500'
                    }}>
                      Brand: {product.brand}
                    </p>
                  )}
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <span style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: 'bold', 
                      color: '#059669'
                    }}>
                      ${product.price}
                    </span>
                    {product.sale_price && (
                      <span style={{ 
                        fontSize: '1.1rem', 
                        textDecoration: 'line-through', 
                        color: '#9ca3af',
                        marginLeft: '0.5rem'
                      }}>
                        ${product.sale_price}
                      </span>
                    )}
                  </div>
                  
                  <div style={{ 
                    fontSize: '0.85rem', 
                    color: product.stock > 10 ? '#059669' : product.stock > 0 ? '#f59e0b' : '#dc2626',
                    marginBottom: '1.5rem',
                    fontWeight: '500'
                  }}>
                    {product.stock > 10 ? 'In Stock' : product.stock > 0 ? `Only ${product.stock} left` : 'Out of Stock'}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <Link to={`/products/${product.id}`} style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      padding: '0.75rem 1rem',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      flex: 1,
                      textAlign: 'center'
                    }}>
                      View Details
                    </Link>
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                      style={{
                        backgroundColor: product.stock > 0 ? '#059669' : '#9ca3af',
                        color: 'white',
                        padding: '0.75rem 1rem',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: product.stock > 0 ? 'pointer' : 'not-allowed',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        flex: 1
                      }}
                    >
                      {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: currentPage === page ? '#3b82f6' : 'white',
                    color: currentPage === page ? 'white' : '#111827',
                    cursor: 'pointer'
                  }}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: currentPage === totalPages ? '#f3f4f6' : 'white',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <h3 style={{ fontSize: '1.5rem', color: '#6b7280', marginBottom: '1rem' }}>
            No products found
          </h3>
          <p style={{ color: '#9ca3af' }}>
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
};

export default Products;
