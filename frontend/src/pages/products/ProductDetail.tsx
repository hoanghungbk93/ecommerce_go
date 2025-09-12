import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchProductById } from '../../store/slices/productsSlice';
import { addToCart } from '../../store/slices/cartSlice';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { selectedProduct: product, loading, error } = useSelector((state: RootState) => state.products);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (id) {
      dispatch(fetchProductById(parseInt(id)));
    }
  }, [dispatch, id]);

  const handleAddToCart = () => {
    if (product) {
      dispatch(addToCart({ product, quantity }));
      // Show a success message or navigate to cart
      alert(`Added ${quantity} ${product.name}(s) to cart!`);
    }
  };

  const handleBuyNow = () => {
    if (product) {
      dispatch(addToCart({ product, quantity }));
      navigate('/cart');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem' }}>Loading product details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <div style={{ color: 'red', fontSize: '1.2rem', marginBottom: '1rem' }}>Error: {error}</div>
        <button
          onClick={() => navigate('/products')}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Back to Products
        </button>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <div style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Product not found</div>
        <button
          onClick={() => navigate('/products')}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Back to Products
        </button>
      </div>
    );
  }

  const images = product.image_url ? [product.image_url] : [];
  // Add additional product images if they exist
  if (product.images && product.images.length > 0) {
    images.push(...product.images.map(img => img.image_url));
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Breadcrumb */}
        <nav style={{ marginBottom: '2rem', fontSize: '0.9rem', color: '#6b7280' }}>
          <button 
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer' }}
          >
            Home
          </button>
          {' > '}
          <button 
            onClick={() => navigate('/products')}
            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer' }}
          >
            Products
          </button>
          {' > '}
          <span style={{ color: '#111827' }}>{product.name}</span>
        </nav>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', marginBottom: '4rem' }}>
          {/* Product Images */}
          <div>
            {product.is_featured && (
              <div style={{
                backgroundColor: '#f59e0b',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                marginBottom: '1rem',
                display: 'inline-block'
              }}>
                FEATURED PRODUCT
              </div>
            )}
            
            <div style={{ marginBottom: '1rem' }}>
              <img 
                src={images[selectedImage] || product.image_url} 
                alt={product.name}
                style={{
                  width: '100%',
                  height: '400px',
                  objectFit: 'cover',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb'
                }}
              />
            </div>
            
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
                {images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    onClick={() => setSelectedImage(index)}
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: selectedImage === index ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem' }}>
              {product.name}
            </h1>
            
            {product.brand && (
              <p style={{ fontSize: '1.1rem', color: '#6b7280', marginBottom: '1rem' }}>
                Brand: <span style={{ fontWeight: '500' }}>{product.brand}</span>
              </p>
            )}
            
            <div style={{ marginBottom: '2rem' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#059669' }}>
                ${product.price}
              </span>
              {product.sale_price && (
                <span style={{ 
                  fontSize: '1.5rem', 
                  textDecoration: 'line-through', 
                  color: '#9ca3af',
                  marginLeft: '1rem'
                }}>
                  ${product.sale_price}
                </span>
              )}
            </div>
            
            <div style={{
              fontSize: '1rem',
              color: product.stock > 10 ? '#059669' : product.stock > 0 ? '#f59e0b' : '#dc2626',
              marginBottom: '2rem',
              fontWeight: '600'
            }}>
              {product.stock > 10 ? '✓ In Stock' : product.stock > 0 ? `⚠ Only ${product.stock} left in stock` : '✗ Out of Stock'}
            </div>
            
            <p style={{ 
              fontSize: '1.1rem', 
              lineHeight: '1.7', 
              color: '#374151', 
              marginBottom: '2rem',
              padding: '1rem',
              backgroundColor: 'white',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              {product.description}
            </p>
            
            {/* Product Details */}
            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              marginBottom: '2rem'
            }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>
                Product Details
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {product.sku && (
                  <div>
                    <span style={{ fontWeight: '500', color: '#6b7280' }}>SKU: </span>
                    <span style={{ color: '#111827' }}>{product.sku}</span>
                  </div>
                )}
                {product.weight && (
                  <div>
                    <span style={{ fontWeight: '500', color: '#6b7280' }}>Weight: </span>
                    <span style={{ color: '#111827' }}>{product.weight} kg</span>
                  </div>
                )}
                {product.dimensions && (
                  <div>
                    <span style={{ fontWeight: '500', color: '#6b7280' }}>Dimensions: </span>
                    <span style={{ color: '#111827' }}>{product.dimensions}</span>
                  </div>
                )}
                <div>
                  <span style={{ fontWeight: '500', color: '#6b7280' }}>Category: </span>
                  <span style={{ color: '#111827' }}>{product.category_id}</span>
                </div>
              </div>
            </div>
            
            {/* Quantity and Actions */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '1rem', 
                  fontWeight: '500', 
                  color: '#111827',
                  marginBottom: '0.5rem'
                }}>
                  Quantity:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    style={{
                      backgroundColor: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      width: '40px',
                      height: '40px',
                      cursor: 'pointer',
                      fontSize: '1.2rem'
                    }}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1)))}
                    min="1"
                    max={product.stock}
                    style={{
                      width: '80px',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      textAlign: 'center',
                      fontSize: '1rem'
                    }}
                  />
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    style={{
                      backgroundColor: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      width: '40px',
                      height: '40px',
                      cursor: 'pointer',
                      fontSize: '1.2rem'
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  style={{
                    backgroundColor: product.stock > 0 ? '#059669' : '#9ca3af',
                    color: 'white',
                    padding: '1rem 2rem',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: product.stock > 0 ? 'pointer' : 'not-allowed',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    flex: 1
                  }}
                >
                  {product.stock > 0 ? '🛒 Add to Cart' : 'Out of Stock'}
                </button>
                
                <button
                  onClick={handleBuyNow}
                  disabled={product.stock === 0}
                  style={{
                    backgroundColor: product.stock > 0 ? '#dc2626' : '#9ca3af',
                    color: 'white',
                    padding: '1rem 2rem',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: product.stock > 0 ? 'pointer' : 'not-allowed',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    flex: 1
                  }}
                >
                  {product.stock > 0 ? '⚡ Buy Now' : 'Out of Stock'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#111827' }}>
            Additional Information
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#111827' }}>
                🚚 Shipping Information
              </h3>
              <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
                Free shipping on orders over $50. Standard delivery takes 3-5 business days.
                Express delivery available for an additional fee.
              </p>
            </div>
            
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#111827' }}>
                🔄 Return Policy
              </h3>
              <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
                30-day return policy. Items must be in original condition with tags attached.
                Return shipping costs may apply.
              </p>
            </div>
            
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#111827' }}>
                🛡️ Warranty
              </h3>
              <p style={{ color: '#6b7280', lineHeight: '1.6' }}>
                1-year manufacturer warranty included. Extended warranty options available
                at checkout.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
