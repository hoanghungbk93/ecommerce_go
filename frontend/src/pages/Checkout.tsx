import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState, AppDispatch } from '../store';
import {
  setShippingAddress,
  setPaymentMethod,
  setNotes,
  createOrder,
  processVNPayPayment,
  clearError,
  paymentProviders,
} from '../store/slices/checkoutSlice';
import { clearCart } from '../store/slices/cartSlice';
import { ShippingAddress } from '../types';

const Checkout: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const { items, totalAmount } = useSelector((state: RootState) => state.cart);
  const {
    shippingAddress,
    paymentMethod,
    notes,
    isLoading,
    error,
    currentOrder,
  } = useSelector((state: RootState) => state.checkout);

  const [formData, setFormData] = useState<Omit<ShippingAddress, 'id' | 'order_id'>>({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    company: '',
    address1: user?.address || '',
    address2: '',
    city: user?.city || '',
    state: '',
    postal_code: user?.postal_code || '',
    country: user?.country || 'Vietnam',
    phone: user?.phone || '',
  });

  const [currentStep, setCurrentStep] = useState<'shipping' | 'payment' | 'review' | 'success'>('shipping');

  useEffect(() => {
    if (items.length === 0 && currentStep !== 'success') {
      navigate('/cart');
    }
  }, [items.length, currentStep, navigate]);

  useEffect(() => {
    if (currentOrder && currentStep === 'review') {
      if (paymentMethod === 'cod') {
        dispatch(clearCart());
        setCurrentStep('success');
      } else if (paymentMethod === 'vnpay') {
        dispatch(processVNPayPayment(currentOrder.id))
          .unwrap()
          .then((paymentData) => {
            if (paymentData.payment_url) {
              window.location.href = paymentData.payment_url;
            }
          })
          .catch((err) => {
            console.error('VNPay payment failed:', err);
          });
      }
    }
  }, [currentOrder, currentStep, paymentMethod, dispatch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNextStep = () => {
    if (currentStep === 'shipping') {
      dispatch(setShippingAddress(formData));
      setCurrentStep('payment');
    } else if (currentStep === 'payment') {
      setCurrentStep('review');
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 'payment') {
      setCurrentStep('shipping');
    } else if (currentStep === 'review') {
      setCurrentStep('payment');
    }
  };

  const handlePlaceOrder = async () => {
    if (!shippingAddress || !paymentMethod) return;

    const orderData = {
      items: items.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
      })),
      shipping_address: shippingAddress,
      payment_method: paymentMethod,
      notes,
    };

    try {
      await dispatch(createOrder(orderData)).unwrap();
    } catch (error) {
      console.error('Order creation failed:', error);
    }
  };

  const calculateTax = () => totalAmount * 0.08;
  const calculateShipping = () => totalAmount >= 50 ? 0 : 9.99;
  const calculateTotal = () => totalAmount + calculateTax() + calculateShipping();

  const isShippingValid = () => {
    return formData.first_name && formData.last_name && formData.address1 && 
           formData.city && formData.postal_code && formData.country;
  };

  if (currentStep === 'success' && currentOrder) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            backgroundColor: 'white',
            padding: '4rem 2rem',
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '2rem', color: '#059669' }}>✅</div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem' }}>
              Order Confirmed!
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#6b7280', marginBottom: '2rem' }}>
              Thank you for your order. Your order number is <strong>#{currentOrder.order_number}</strong>
            </p>
            <div style={{
              backgroundColor: '#f0f9ff',
              padding: '1.5rem',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
              marginBottom: '2rem',
              textAlign: 'left'
            }}>
              <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#1e40af' }}>Order Details</h3>
              <p><strong>Payment Method:</strong> {paymentMethod === 'cod' ? 'Cash on Delivery' : 'VNPay'}</p>
              <p><strong>Total Amount:</strong> ${currentOrder.total.toFixed(2)}</p>
              <p><strong>Status:</strong> {currentOrder.status}</p>
              {paymentMethod === 'cod' && (
                <p style={{ color: '#059669', fontWeight: '600', marginTop: '0.5rem' }}>
                  💵 You will pay when you receive your order
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => navigate('/orders')}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '1rem 2rem',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                View Orders
              </button>
              <button
                onClick={() => navigate('/products')}
                style={{
                  backgroundColor: 'transparent',
                  color: '#3b82f6',
                  padding: '1rem 2rem',
                  border: '2px solid #3b82f6',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '2rem' }}>
          Checkout
        </h1>

        {/* Progress Steps */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '3rem',
          position: 'relative'
        }}>
          {['shipping', 'payment', 'review'].map((step, index) => {
            const stepNames = { shipping: 'Shipping', payment: 'Payment', review: 'Review' };
            const isActive = currentStep === step;
            const isCompleted = ['shipping', 'payment', 'review'].indexOf(currentStep) > index;
            
            return (
              <div key={step} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                flex: 1
              }}>
                {index > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '-50%',
                    width: '100%',
                    height: '2px',
                    backgroundColor: isCompleted ? '#059669' : '#e5e7eb',
                    zIndex: 1
                  }} />
                )}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: isActive ? '#3b82f6' : isCompleted ? '#059669' : '#e5e7eb',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  zIndex: 2,
                  position: 'relative'
                }}>
                  {isCompleted ? '✓' : index + 1}
                </div>
                <span style={{
                  marginTop: '0.5rem',
                  fontSize: '0.9rem',
                  color: isActive ? '#3b82f6' : isCompleted ? '#059669' : '#6b7280',
                  fontWeight: isActive ? '600' : 'normal'
                }}>
                  {stepNames[step as keyof typeof stepNames]}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          {/* Main Content */}
          <div>
            {/* Error Display */}
            {error && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>{error}</span>
                <button
                  onClick={() => dispatch(clearError())}
                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1.2rem' }}
                >
                  ×
                </button>
              </div>
            )}

            {/* Shipping Address Step */}
            {currentStep === 'shipping' && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                padding: '2rem'
              }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
                  Shipping Address
                </h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Company (Optional)
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Address Line 1 *
                  </label>
                  <input
                    type="text"
                    name="address1"
                    value={formData.address1}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    name="address2"
                    value={formData.address2}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      State/Province
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      name="postal_code"
                      value={formData.postal_code}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      Country *
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleNextStep}
                    disabled={!isShippingValid()}
                    style={{
                      backgroundColor: isShippingValid() ? '#059669' : '#d1d5db',
                      color: 'white',
                      padding: '0.75rem 2rem',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: isShippingValid() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Continue to Payment
                  </button>
                </div>
              </div>
            )}

            {/* Payment Method Step */}
            {currentStep === 'payment' && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                padding: '2rem'
              }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
                  Payment Method
                </h2>
                
                <div style={{ marginBottom: '2rem' }}>
                  {paymentProviders.map((provider) => (
                    <div key={provider.id} style={{ marginBottom: '1rem' }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '1.5rem',
                        border: paymentMethod === provider.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        backgroundColor: paymentMethod === provider.id ? '#f0f9ff' : 'white',
                        cursor: provider.enabled ? 'pointer' : 'not-allowed',
                        opacity: provider.enabled ? 1 : 0.5,
                        transition: 'all 0.2s'
                      }}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={provider.id}
                          checked={paymentMethod === provider.id}
                          onChange={(e) => dispatch(setPaymentMethod(e.target.value as 'vnpay' | 'cod'))}
                          disabled={!provider.enabled}
                          style={{ marginRight: '1rem', accentColor: '#3b82f6' }}
                        />
                        <div style={{ fontSize: '2rem', marginRight: '1rem' }}>{provider.icon}</div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                            {provider.name}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                            {provider.description}
                          </div>
                          {!provider.enabled && (
                            <div style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '0.25rem' }}>
                              Currently unavailable
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Order Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => dispatch(setNotes(e.target.value))}
                    placeholder="Any special instructions for your order..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button
                    onClick={handlePrevStep}
                    style={{
                      backgroundColor: 'transparent',
                      color: '#6b7280',
                      padding: '0.75rem 2rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNextStep}
                    disabled={!paymentMethod}
                    style={{
                      backgroundColor: paymentMethod ? '#059669' : '#d1d5db',
                      color: 'white',
                      padding: '0.75rem 2rem',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: paymentMethod ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Review Order
                  </button>
                </div>
              </div>
            )}

            {/* Review Order Step */}
            {currentStep === 'review' && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                padding: '2rem'
              }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
                  Review Your Order
                </h2>
                
                {/* Shipping Address Review */}
                <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>Shipping Address</h3>
                  <div style={{ fontSize: '0.9rem', color: '#6b7280', lineHeight: '1.5' }}>
                    <p>{shippingAddress?.first_name} {shippingAddress?.last_name}</p>
                    {shippingAddress?.company && <p>{shippingAddress.company}</p>}
                    <p>{shippingAddress?.address1}</p>
                    {shippingAddress?.address2 && <p>{shippingAddress.address2}</p>}
                    <p>{shippingAddress?.city}, {shippingAddress?.state} {shippingAddress?.postal_code}</p>
                    <p>{shippingAddress?.country}</p>
                    {shippingAddress?.phone && <p>Phone: {shippingAddress.phone}</p>}
                  </div>
                </div>

                {/* Payment Method Review */}
                <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>Payment Method</h3>
                  <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', color: '#6b7280' }}>
                    <span style={{ fontSize: '1.5rem', marginRight: '0.5rem' }}>
                      {paymentProviders.find(p => p.id === paymentMethod)?.icon}
                    </span>
                    <span>{paymentProviders.find(p => p.id === paymentMethod)?.name}</span>
                  </div>
                </div>

                {/* Order Notes */}
                {notes && (
                  <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                    <h3 style={{ fontWeight: '600', marginBottom: '1rem', color: '#111827' }}>Order Notes</h3>
                    <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>{notes}</p>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button
                    onClick={handlePrevStep}
                    style={{
                      backgroundColor: 'transparent',
                      color: '#6b7280',
                      padding: '0.75rem 2rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={isLoading}
                    style={{
                      backgroundColor: isLoading ? '#d1d5db' : '#059669',
                      color: 'white',
                      padding: '0.75rem 2rem',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {isLoading && <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>}
                    {isLoading ? 'Processing...' : 'Place Order'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              padding: '2rem',
              position: 'sticky',
              top: '2rem'
            }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
                Order Summary
              </h3>

              {/* Cart Items */}
              <div style={{ marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                {items.map((item) => (
                  <div key={item.id} style={{
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '1rem',
                    padding: '1rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px'
                  }}>
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      style={{
                        width: '60px',
                        height: '60px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                        {item.product.name}
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                        Qty: {item.quantity}
                      </p>
                      <p style={{ fontSize: '0.9rem', fontWeight: '600', color: '#111827' }}>
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                  fontSize: '1rem'
                }}>
                  <span style={{ color: '#6b7280' }}>Subtotal</span>
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
                    color: calculateShipping() === 0 ? '#059669' : '#111827',
                    fontWeight: '500'
                  }}>
                    {calculateShipping() === 0 ? 'FREE' : `$${calculateShipping().toFixed(2)}`}
                  </span>
                </div>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                  fontSize: '1rem'
                }}>
                  <span style={{ color: '#6b7280' }}>Tax</span>
                  <span style={{ color: '#111827', fontWeight: '500' }}>${calculateTax().toFixed(2)}</span>
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
                  <span style={{ color: '#111827' }}>${calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              {/* Security Notice */}
              <div style={{
                padding: '1rem',
                backgroundColor: '#f0f9ff',
                borderRadius: '8px',
                border: '1px solid #bfdbfe',
                fontSize: '0.85rem',
                color: '#1e40af',
                textAlign: 'center'
              }}>
                🔒 Your order information is secure and encrypted
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
