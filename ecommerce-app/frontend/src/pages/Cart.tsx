import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { RootState, AppDispatch } from '../store';
import { updateQuantity, removeFromCart, clearCart } from '../store/slices/cartSlice';
import { CartItem } from '../types';

const Cart: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { items, totalAmount, totalItems } = useSelector((state: RootState) => state.cart);

  const handleUpdateQuantity = (id: number, quantity: number) => {
    if (quantity <= 0) {
      dispatch(removeFromCart(id));
    } else {
      dispatch(updateQuantity({ productId: id, quantity }));
    }
  };

  const handleRemoveItem = (id: number) => {
    dispatch(removeFromCart(id));
  };

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      dispatch(clearCart());
    }
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  const shipping = totalAmount >= 50 ? 0 : 9.99;
  const tax = totalAmount * 0.08; // 8% tax
  const finalTotal = totalAmount + shipping + tax;

  if (items.length === 0) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            backgroundColor: 'white',
            padding: '4rem 2rem',
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '2rem' }}>🛒</div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem' }}>
              Your Cart is Empty
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#6b7280', marginBottom: '2rem' }}>
              Looks like you haven't added any items to your cart yet.
            </p>
            <Link
              to="/products"
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '1rem 2rem',
                textDecoration: 'none',
                borderRadius: '8px',
                fontSize: '1.1rem',
                fontWeight: '600',
                display: 'inline-block'
              }}
            >
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
            Shopping Cart
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#6b7280' }}>
            {totalItems} {totalItems === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          {/* Cart Items */}
          <div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              overflow: 'hidden'
            }}>
              {/* Cart Header */}
              <div style={{
                padding: '1.5rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: '600', color: '#111827' }}>
                  Cart Items
                </h2>
                <button
                  onClick={handleClearCart}
                  style={{
                    color: '#dc2626',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    textDecoration: 'underline'
                  }}
                >
                  Clear Cart
                </button>
              </div>

              {/* Cart Items List */}
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {items.map((item: CartItem) => (
                  <div key={item.id} style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid #f3f4f6',
                    display: 'flex',
                    gap: '1rem'
                  }}>
                    {/* Product Image */}
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      style={{
                        width: '100px',
                        height: '100px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        flexShrink: 0
                      }}
                    />

                    {/* Product Details */}
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: '0.5rem'
                      }}>
                        <Link
                          to={`/products/${item.product.id}`}
                          style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                          {item.product.name}
                        </Link>
                      </h3>
                      
                      {item.product.brand && (
                        <p style={{
                          fontSize: '0.9rem',
                          color: '#6b7280',
                          marginBottom: '0.5rem'
                        }}>
                          Brand: {item.product.brand}
                        </p>
                      )}
                      
                      <p style={{
                        fontSize: '0.9rem',
                        color: item.product.stock > 0 ? '#059669' : '#dc2626',
                        marginBottom: '1rem'
                      }}>
                        {item.product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                      </p>

                      {/* Quantity Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                            style={{
                              backgroundColor: '#f3f4f6',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              width: '32px',
                              height: '32px',
                              cursor: 'pointer',
                              fontSize: '1rem'
                            }}
                          >
                            -
                          </button>
                          <span style={{
                            minWidth: '40px',
                            textAlign: 'center',
                            fontSize: '1rem',
                            fontWeight: '500'
                          }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock}
                            style={{
                              backgroundColor: item.quantity >= item.product.stock ? '#f9fafb' : '#f3f4f6',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              width: '32px',
                              height: '32px',
                              cursor: item.quantity >= item.product.stock ? 'not-allowed' : 'pointer',
                              fontSize: '1rem',
                              color: item.quantity >= item.product.stock ? '#9ca3af' : 'inherit'
                            }}
                          >
                            +
                          </button>
                        </div>
                        
                        <button
                          onClick={() => handleRemoveItem(item.product.id)}
                          style={{
                            color: '#dc2626',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            textDecoration: 'underline'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Price */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{
                        fontSize: '1.2rem',
                        fontWeight: 'bold',
                        color: '#111827',
                        marginBottom: '0.5rem'
                      }}>
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                        ${item.product.price} each
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Continue Shopping */}
            <div style={{ marginTop: '1rem' }}>
              <Link
                to="/products"
                style={{
                  color: '#3b82f6',
                  textDecoration: 'none',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                ← Continue Shopping
              </Link>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              padding: '2rem',
              position: 'sticky',
              top: '2rem'
            }}>
              <h2 style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '1.5rem'
              }}>
                Order Summary
              </h2>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                  fontSize: '1rem'
                }}>
                  <span style={{ color: '#6b7280' }}>Subtotal ({totalItems} items)</span>
                  <span style={{ color: '#111827', fontWeight: '500' }}>${totalAmount.toFixed(2)}</span>
                </div>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                  fontSize: '1rem'
                }}>
                  <span style={{ color: '#6b7280' }}>Shipping</span>
                  <span style={{
                    color: shipping === 0 ? '#059669' : '#111827',
                    fontWeight: '500'
                  }}>
                    {shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                
                {shipping > 0 && (
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    marginBottom: '0.5rem',
                    fontStyle: 'italic'
                  }}>
                    Free shipping on orders over $50
                  </div>
                )}
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                  fontSize: '1rem'
                }}>
                  <span style={{ color: '#6b7280' }}>Tax</span>
                  <span style={{ color: '#111827', fontWeight: '500' }}>${tax.toFixed(2)}</span>
                </div>
                
                <div style={{
                  borderTop: '2px solid #e5e7eb',
                  paddingTop: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.2rem',
                  fontWeight: 'bold'
                }}>
                  <span style={{ color: '#111827' }}>Total</span>
                  <span style={{ color: '#111827' }}>${finalTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                style={{
                  width: '100%',
                  backgroundColor: '#059669',
                  color: 'white',
                  padding: '1rem',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '1rem'
                }}
              >
                Proceed to Checkout
              </button>

              {/* Payment Methods */}
              <div style={{
                textAlign: 'center',
                fontSize: '0.85rem',
                color: '#6b7280'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>We accept:</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#e6f3e6',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    color: '#059669',
                    fontWeight: '600'
                  }}>
                    💵 COD
                  </span>
                  <span style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    opacity: 0.6
                  }}>
                    💳 VNPay
                  </span>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
              fontSize: '0.9rem',
              color: '#1e40af'
            }}>
              🔒 Your payment information is encrypted and secure
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
