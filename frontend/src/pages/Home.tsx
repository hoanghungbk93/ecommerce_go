import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchProducts } from '../store/slices/productsSlice';
import { addToCart } from '../store/slices/cartSlice';
import { Product } from '../types';

const Home: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { products, loading } = useSelector((state: RootState) => state.products);

  useEffect(() => {
    dispatch(fetchProducts({ limit: 8 }));
  }, [dispatch]);

  const handleAddToCart = (product: Product) => {
    dispatch(addToCart({ product, quantity: 1 }));
  };

  const featuredProducts = products.filter(product => product.is_featured).slice(0, 4);
  const recentProducts = products.slice(0, 8);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero Section */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white', 
        padding: '6rem 2rem',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          fontSize: '3rem', 
          fontWeight: 'bold',
          marginBottom: '2rem'
        }}>
          Welcome to E-Shop
        </h1>
        <p style={{ 
          fontSize: '1.25rem',
          marginBottom: '3rem',
          maxWidth: '600px',
          margin: '0 auto 3rem auto',
          opacity: 0.9
        }}>
          Discover amazing products at unbeatable prices. Shop with confidence 
          and enjoy fast delivery to your doorstep.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/products"
            style={{
              background: '#ff6b6b',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '1.125rem',
              fontWeight: '600',
              transition: 'all 0.3s'
            }}
          >
            Shop Now
          </Link>
          <Link
            to="/register"
            style={{
              background: 'transparent',
              color: 'white',
              border: '2px solid white',
              padding: '1rem 2rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '1.125rem',
              fontWeight: '600'
            }}
          >
            Sign Up
          </Link>
        </div>
      </div>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <div style={{ padding: '4rem 2rem', background: 'white' }}>
          <h2 style={{ 
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '3rem',
            color: '#111827',
            textAlign: 'center'
          }}>
            Featured Products
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            {featuredProducts.map((product) => (
              <div key={product.id} style={{
                border: '1px solid #e5e5e5',
                borderRadius: '12px',
                padding: '1.5rem',
                textAlign: 'center',
                backgroundColor: 'white',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                transition: 'transform 0.3s, box-shadow 0.3s'
              }}>
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
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.3rem', color: '#111827' }}>{product.name}</h3>
                <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.95rem', lineHeight: '1.4' }}>
                  {product.short_description || product.description?.substring(0, 100) + '...'}
                </p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669', marginBottom: '1.5rem' }}>
                  ${product.price}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <Link to={`/products/${product.id}`} style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    padding: '0.75rem 1rem',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}>View Details</Link>
                  <button
                    onClick={() => handleAddToCart(product)}
                    style={{
                      backgroundColor: '#059669',
                      color: 'white',
                      padding: '0.75rem 1rem',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500'
                    }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Products */}
      {recentProducts.length > 0 && (
        <div style={{ padding: '4rem 2rem', background: '#f9fafb' }}>
          <h2 style={{ 
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '3rem',
            color: '#111827',
            textAlign: 'center'
          }}>
            Our Products
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem',
            maxWidth: '1200px',
            margin: '0 auto'
          }}>
            {recentProducts.map((product) => (
              <div key={product.id} style={{
                border: '1px solid #e5e5e5',
                borderRadius: '8px',
                padding: '1rem',
                textAlign: 'center',
                backgroundColor: 'white',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}>
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  style={{
                    width: '100%',
                    height: '180px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    marginBottom: '1rem'
                  }}
                />
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem', color: '#111827' }}>{product.name}</h3>
                <p style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#059669', marginBottom: '1rem' }}>
                  ${product.price}
                </p>
                <Link to={`/products/${product.id}`} style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontWeight: '500'
                }}>View Product</Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Features */}
      <div style={{ 
        padding: '4rem 2rem',
        background: 'white',
        textAlign: 'center'
      }}>
        <h2 style={{ 
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          color: '#111827'
        }}>
          Why Choose E-Shop?
        </h2>
        <p style={{ 
          fontSize: '1.125rem',
          color: '#6b7280',
          marginBottom: '4rem'
        }}>
          We provide the best shopping experience with these features
        </p>

        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '3rem',
              marginBottom: '1rem'
            }}>
              📦
            </div>
            <h3 style={{ 
              fontSize: '1.25rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#111827'
            }}>
              Wide Selection
            </h3>
            <p style={{ color: '#6b7280' }}>
              Thousands of products across multiple categories
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '3rem',
              marginBottom: '1rem'
            }}>
              🔒
            </div>
            <h3 style={{ 
              fontSize: '1.25rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#111827'
            }}>
              Secure Payment
            </h3>
            <p style={{ color: '#6b7280' }}>
              Safe and secure payment processing with VNPay
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              fontSize: '3rem',
              marginBottom: '1rem'
            }}>
              🚚
            </div>
            <h3 style={{ 
              fontSize: '1.25rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#111827'
            }}>
              Fast Delivery
            </h3>
            <p style={{ color: '#6b7280' }}>
              Quick and reliable delivery to your location
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
