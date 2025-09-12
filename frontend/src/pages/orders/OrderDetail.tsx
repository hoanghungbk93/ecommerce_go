import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { ordersAPI } from '../../services/api';
import { Order } from '../../types';

const OrderDetail: React.FC = () => {
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'shipping'>('details');

  useEffect(() => {
    const fetchOrderDetail = async () => {
      if (!orderId) return;
      
      try {
        setLoading(true);
        setError(null);
        const response = await ordersAPI.getOrder(parseInt(orderId));
        setOrder(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [orderId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' };
      case 'confirmed': return { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' };
      case 'shipped': return { bg: '#e0e7ff', text: '#5b21b6', border: '#8b5cf6' };
      case 'delivered': return { bg: '#d1fae5', text: '#065f46', border: '#10b981' };
      case 'cancelled': return { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' };
      default: return { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' };
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return { bg: '#d1fae5', text: '#065f46', border: '#10b981' };
      case 'pending': return { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' };
      case 'failed': return { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' };
      case 'refunded': return { bg: '#e0e7ff', text: '#1e40af', border: '#3b82f6' };
      default: return { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusTimeline = () => {
    if (!order) return [];
    
    const timeline = [
      {
        status: 'pending',
        label: 'Order Placed',
        date: order.created_at,
        completed: true,
        icon: '📝'
      },
      {
        status: 'confirmed',
        label: 'Order Confirmed',
        date: order.status === 'confirmed' || order.status === 'shipped' || order.status === 'delivered' ? order.created_at : null,
        completed: ['confirmed', 'shipped', 'delivered'].includes(order.status),
        icon: '✅'
      },
      {
        status: 'shipped',
        label: 'Order Shipped',
        date: order.shipped_at,
        completed: ['shipped', 'delivered'].includes(order.status),
        icon: '🚚'
      },
      {
        status: 'delivered',
        label: 'Order Delivered',
        date: order.delivered_at,
        completed: order.status === 'delivered',
        icon: '📦'
      }
    ];

    if (order.status === 'cancelled') {
      timeline.push({
        status: 'cancelled',
        label: 'Order Cancelled',
        date: order.cancelled_at,
        completed: true,
        icon: '❌'
      });
    }

    return timeline;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', paddingTop: '4rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
          <h2 style={{ fontSize: '1.5rem', color: '#6b7280' }}>Loading order details...</h2>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', paddingTop: '4rem' }}>
          <div style={{
            backgroundColor: 'white',
            padding: '3rem',
            borderRadius: '12px',
            border: '1px solid #fee2e2'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#dc2626' }}>⚠️</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '1rem' }}>
              Order Not Found
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
              {error || 'The order you are looking for could not be found.'}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => navigate('/orders')}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '0.75rem 2rem',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Back to Orders
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusStyle = getStatusColor(order.status);
  const paymentStyle = getPaymentStatusColor(order.payment_status);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <Link
                to="/orders"
                style={{
                  color: '#6b7280',
                  textDecoration: 'none',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                ← Back to Orders
              </Link>
            </div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
              Order #{order.order_number}
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#6b7280' }}>
              Placed on {formatDate(order.created_at)}
            </p>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                backgroundColor: statusStyle.bg,
                color: statusStyle.text,
                border: `1px solid ${statusStyle.border}`,
                borderRadius: '9999px',
                fontSize: '0.9rem',
                fontWeight: '600',
                textTransform: 'capitalize'
              }}>
                {order.status}
              </span>
            </div>
            <div>
              <span style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                backgroundColor: paymentStyle.bg,
                color: paymentStyle.text,
                border: `1px solid ${paymentStyle.border}`,
                borderRadius: '9999px',
                fontSize: '0.9rem',
                fontWeight: '600',
                textTransform: 'capitalize'
              }}>
                Payment: {order.payment_status}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px 12px 0 0',
          border: '1px solid #e5e7eb',
          borderBottom: 'none',
          padding: '0'
        }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
            {[
              { id: 'details', label: 'Order Details', icon: '📋' },
              { id: 'timeline', label: 'Order Timeline', icon: '🕐' },
              { id: 'shipping', label: 'Shipping Info', icon: '🚚' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '1rem 2rem',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                  borderBottom: activeTab === tab.id ? '3px solid #3b82f6' : '3px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s'
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0 0 12px 12px',
          border: '1px solid #e5e7eb',
          borderTop: 'none'
        }}>
          {/* Order Details Tab */}
          {activeTab === 'details' && (
            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                {/* Order Items */}
                <div>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: '600', color: '#111827', marginBottom: '1.5rem' }}>
                    Order Items ({order.items.length})
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          gap: '1rem',
                          padding: '1.5rem',
                          backgroundColor: '#f9fafb',
                          borderRadius: '12px',
                          border: '1px solid #f3f4f6'
                        }}
                      >
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          style={{
                            width: '80px',
                            height: '80px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            flexShrink: 0
                          }}
                        />
                        
                        <div style={{ flex: 1 }}>
                          <h4 style={{
                            fontSize: '1.1rem',
                            fontWeight: '600',
                            color: '#111827',
                            marginBottom: '0.5rem'
                          }}>
                            {item.product.name}
                          </h4>
                          
                          {item.product.brand && (
                            <p style={{
                              fontSize: '0.9rem',
                              color: '#6b7280',
                              marginBottom: '0.5rem'
                            }}>
                              Brand: {item.product.brand}
                            </p>
                          )}
                          
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '1rem'
                          }}>
                            <div>
                              <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                                Quantity: {item.quantity}
                              </p>
                              <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                                Unit Price: ${item.unit_price.toFixed(2)}
                              </p>
                            </div>
                            
                            <div style={{ textAlign: 'right' }}>
                              <p style={{
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                                color: '#111827'
                              }}>
                                ${item.total_price.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Notes */}
                  {order.notes && (
                    <div style={{
                      marginTop: '2rem',
                      padding: '1.5rem',
                      backgroundColor: '#f0f9ff',
                      borderRadius: '12px',
                      border: '1px solid #bfdbfe'
                    }}>
                      <h4 style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#1e40af',
                        marginBottom: '0.5rem'
                      }}>
                        Order Notes
                      </h4>
                      <p style={{ fontSize: '0.9rem', color: '#1e40af' }}>
                        {order.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Order Summary */}
                <div>
                  <div style={{
                    padding: '1.5rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '12px',
                    border: '1px solid #f3f4f6',
                    marginBottom: '1.5rem'
                  }}>
                    <h4 style={{
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '1rem'
                    }}>
                      Order Summary
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Subtotal:</span>
                        <span style={{ fontWeight: '500' }}>${order.subtotal.toFixed(2)}</span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Shipping:</span>
                        <span style={{ fontWeight: '500' }}>${order.shipping_cost.toFixed(2)}</span>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Tax:</span>
                        <span style={{ fontWeight: '500' }}>${order.tax_amount.toFixed(2)}</span>
                      </div>
                      
                      {order.discount_amount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#6b7280' }}>Discount:</span>
                          <span style={{ fontWeight: '500', color: '#059669' }}>-${order.discount_amount.toFixed(2)}</span>
                        </div>
                      )}
                      
                      <div style={{
                        borderTop: '1px solid #e5e7eb',
                        paddingTop: '0.75rem',
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#111827' }}>Total:</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#111827' }}>${order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div style={{
                    padding: '1.5rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '12px',
                    border: '1px solid #f3f4f6'
                  }}>
                    <h4 style={{
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '1rem'
                    }}>
                      Payment Information
                    </h4>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>
                        {order.payment_method === 'cod' ? '💵' : '💳'}
                      </span>
                      <span style={{ fontWeight: '500' }}>
                        {order.payment_method === 'cod' ? 'Cash on Delivery' : 'VNPay'}
                      </span>
                    </div>
                    
                    {order.payment_method === 'cod' && order.payment_status === 'pending' && (
                      <p style={{
                        fontSize: '0.9rem',
                        color: '#059669',
                        fontWeight: '500',
                        marginTop: '0.5rem'
                      }}>
                        💡 You will pay when you receive your order
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '600', color: '#111827', marginBottom: '2rem' }}>
                Order Timeline
              </h3>
              
              <div style={{ position: 'relative' }}>
                {getStatusTimeline().map((step, index) => (
                  <div
                    key={step.status}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: index < getStatusTimeline().length - 1 ? '2rem' : '0',
                      position: 'relative'
                    }}
                  >
                    {/* Timeline Line */}
                    {index < getStatusTimeline().length - 1 && (
                      <div style={{
                        position: 'absolute',
                        left: '30px',
                        top: '60px',
                        width: '2px',
                        height: '2rem',
                        backgroundColor: step.completed ? '#10b981' : '#e5e7eb'
                      }} />
                    )}
                    
                    {/* Timeline Icon */}
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      backgroundColor: step.completed ? '#d1fae5' : '#f3f4f6',
                      border: `3px solid ${step.completed ? '#10b981' : '#e5e7eb'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      marginRight: '1.5rem',
                      zIndex: 1,
                      position: 'relative'
                    }}>
                      {step.icon}
                    </div>
                    
                    {/* Timeline Content */}
                    <div style={{ flex: 1 }}>
                      <h4 style={{
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        color: step.completed ? '#111827' : '#6b7280',
                        marginBottom: '0.25rem'
                      }}>
                        {step.label}
                      </h4>
                      <p style={{
                        fontSize: '0.9rem',
                        color: '#6b7280'
                      }}>
                        {step.date ? formatDate(step.date) : 'Pending'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shipping Tab */}
          {activeTab === 'shipping' && (
            <div style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '600', color: '#111827', marginBottom: '2rem' }}>
                Shipping Information
              </h3>
              
              {order.shipping_address ? (
                <div style={{
                  padding: '2rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '12px',
                  border: '1px solid #f3f4f6'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                    <div>
                      <h4 style={{
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: '1rem'
                      }}>
                        Delivery Address
                      </h4>
                      <div style={{ fontSize: '0.95rem', color: '#374151', lineHeight: '1.6' }}>
                        <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                          {order.shipping_address.first_name} {order.shipping_address.last_name}
                        </p>
                        {order.shipping_address.company && (
                          <p style={{ marginBottom: '0.5rem' }}>{order.shipping_address.company}</p>
                        )}
                        <p style={{ marginBottom: '0.5rem' }}>{order.shipping_address.address1}</p>
                        {order.shipping_address.address2 && (
                          <p style={{ marginBottom: '0.5rem' }}>{order.shipping_address.address2}</p>
                        )}
                        <p style={{ marginBottom: '0.5rem' }}>
                          {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                        </p>
                        <p style={{ marginBottom: '0.5rem' }}>{order.shipping_address.country}</p>
                        {order.shipping_address.phone && (
                          <p style={{ color: '#6b7280' }}>Phone: {order.shipping_address.phone}</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 style={{
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        color: '#111827',
                        marginBottom: '1rem'
                      }}>
                        Shipping Details
                      </h4>
                      <div style={{ fontSize: '0.95rem', color: '#374151', lineHeight: '1.6' }}>
                        <p style={{ marginBottom: '0.5rem' }}>
                          <strong>Shipping Cost:</strong> ${order.shipping_cost.toFixed(2)}
                        </p>
                        <p style={{ marginBottom: '0.5rem' }}>
                          <strong>Estimated Delivery:</strong> 3-7 business days
                        </p>
                        {order.shipped_at && (
                          <p style={{ marginBottom: '0.5rem' }}>
                            <strong>Shipped Date:</strong> {formatDate(order.shipped_at)}
                          </p>
                        )}
                        {order.delivered_at && (
                          <p style={{ marginBottom: '0.5rem', color: '#059669' }}>
                            <strong>Delivered Date:</strong> {formatDate(order.delivered_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '3rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '12px',
                  border: '1px solid #f3f4f6',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📋</div>
                  <p style={{ color: '#6b7280' }}>No shipping information available for this order.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{
          marginTop: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }}>
          <div>
            <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>
              Need help with this order? <Link to="/contact" style={{ color: '#3b82f6' }}>Contact Support</Link>
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            {order.status === 'pending' && (
              <button
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#fee2e2',
                  color: '#991b1b',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel Order
              </button>
            )}
            
            <button
              onClick={() => window.print()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'transparent',
                color: '#3b82f6',
                border: '1px solid #3b82f6',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Print Order
            </button>
            
            <button
              onClick={() => navigate('/orders')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Back to Orders
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
