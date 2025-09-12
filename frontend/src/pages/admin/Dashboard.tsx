import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { deleteProduct } from '../../store/slices/productsSlice';
import { fetchCategories, deleteCategory } from '../../store/slices/categoriesSlice';
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import ProductModal from '../../components/admin/ProductModal';
import CategoryModal from '../../components/admin/CategoryModal';
import Partners from './Partners';
import AddPartner from './AddPartner';
import ProductApprovals from './ProductApprovals';
import Users from './Users';
import { Product, Category } from '../../types';
import { productsAPI, ordersAPI } from '../../services/api';

const AdminDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { products } = useSelector((state: RootState) => state.products);
  const { orders: ordersArray } = useSelector((state: RootState) => state.orders);
  const { categories } = useSelector((state: RootState) => state.categories);
  const { user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'categories' | 'partners' | 'users' | 'approvals'>('dashboard');
  
  // Modal states
  const [productModal, setProductModal] = useState<{ isOpen: boolean; product: Product | null }>({ isOpen: false, product: null });
  const [categoryModal, setCategoryModal] = useState<{ isOpen: boolean; category: Category | null }>({ isOpen: false, category: null });
  
  
  // Admin orders state
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const productsPerPage = 50;

  // Load products with pagination
  const loadProducts = useCallback(async (page: number) => {
    try {
      const response = await productsAPI.getProducts({ 
        page, 
        limit: productsPerPage 
      });
      
      // Update Redux store with current page products
      dispatch({
        type: 'products/fetchProducts/fulfilled',
        payload: response.data.products || []
      });
      
      // Update pagination state
      setCurrentPage(page);
      setTotalProducts(response.data.pagination?.total || response.data.products?.length || 0);
      setTotalPages(Math.ceil((response.data.pagination?.total || response.data.products?.length || 0) / productsPerPage));
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }, [dispatch, productsPerPage]);

  // Load all orders for admin
  const loadAdminOrders = useCallback(async () => {
    try {
      console.log('🔄 Starting to load admin orders...');
      setOrdersLoading(true);
      const response = await ordersAPI.getAllOrders();
      console.log('📦 Raw API response:', response);
      console.log('📦 Response data:', response.data);
      console.log('📦 Response data structure:', typeof response.data, Object.keys(response.data || {}));
      
      // Extract orders array from response data structure: { orders: [...], pagination: {...} }
      const ordersData = response.data?.orders || [];
      console.log('📦 Extracted orders array:', ordersData);
      console.log('📦 Is ordersData an array?', Array.isArray(ordersData));
      console.log('📦 Number of orders:', ordersData.length);
      setAdminOrders(ordersData);
    } catch (error: any) {
      console.error('❌ Error loading admin orders:', error);
      console.error('❌ Error details:', error.response || error.message);
      setAdminOrders([]);
    } finally {
      setOrdersLoading(false);
      console.log('✅ Finished loading admin orders');
    }
  }, []);

  useEffect(() => {
    // Check if user is admin
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    loadProducts(1); // Load first page
    console.log('🚀 Loading admin orders on component mount...');
    loadAdminOrders(); // Load all orders for admin
    dispatch(fetchCategories());
  }, [dispatch, user, navigate, loadProducts, loadAdminOrders]);

  useEffect(() => {
    // Set active tab based on current route
    const path = location.pathname;
    if (path.includes('/admin/partners') || path.includes('/admin/add-partner')) {
      setActiveTab('partners');
    } else if (path === '/admin/products') {
      setActiveTab('products');
    } else if (path === '/admin/orders') {
      setActiveTab('orders');
    } else if (path === '/admin/categories') {
      setActiveTab('categories');
    } else if (path === '/admin/approvals') {
      setActiveTab('approvals');
    } else if (path === '/admin/users') {
      setActiveTab('users');
    } else {
      setActiveTab('dashboard');
    }
  }, [location]);

  if (!user || user.role !== 'admin') {
    return (
      <div style={{ padding: '4rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', color: '#dc2626', marginBottom: '1rem' }}>Access Denied</h1>
        <p style={{ color: '#6b7280' }}>You don't have permission to access this page.</p>
      </div>
    );
  }

  // Calculate stats - ensure ordersArray is an array
  const orders = Array.isArray(ordersArray) ? ordersArray : [];
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const lowStockProducts = products.filter(p => p.stock < 10).length;
  const featuredProducts = products.filter(p => p.is_featured).length;
  const outOfStockProducts = products.filter(p => p.stock === 0).length;

  const recentOrders = orders.slice(0, 5);

  // Handler functions
  const handleDeleteProduct = async (productId: number) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await dispatch(deleteProduct(productId));
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await dispatch(deleteCategory(categoryId));
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };


  // Update order status
  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      console.log(`🔄 Updating order ${orderId} status to ${newStatus}`);
      await ordersAPI.updateOrderStatus(orderId, newStatus);
      console.log(`✅ Successfully updated order ${orderId} status`);
      loadAdminOrders(); // Refresh orders after update
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      alert('Failed to update order status. Please try again.');
    }
  };

  const handleModalSuccess = () => {
    // Refresh data after successful create/update
    loadProducts(currentPage); // Reload current page
    dispatch(fetchCategories());
  };

  const renderDashboard = () => (
    <div>
      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3rem' }}>📦</div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>{totalProducts}</div>
              <div style={{ color: '#6b7280' }}>Total Products</div>
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3rem' }}>🛍️</div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>{totalOrders}</div>
              <div style={{ color: '#6b7280' }}>Total Orders</div>
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3rem' }}>💰</div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>${totalRevenue.toFixed(2)}</div>
              <div style={{ color: '#6b7280' }}>Total Revenue</div>
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '3rem' }}>⚠️</div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc2626' }}>{lowStockProducts}</div>
              <div style={{ color: '#6b7280' }}>Low Stock Items</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Recent Orders */}
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#111827' }}>
            Recent Orders
          </h3>
          {recentOrders.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recentOrders.map((order: any) => (
                <div key={order.id} style={{
                  padding: '1rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontWeight: '500', color: '#111827' }}>Order #{order.id}</div>
                    <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                      {order.user_id ? `User ID: ${order.user_id}` : 'Guest Order'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600', color: '#059669' }}>${order.total.toFixed(2)}</div>
                    <div style={{
                      fontSize: '0.8rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      backgroundColor: order.status === 'delivered' ? '#d1fae5' : 
                                     order.status === 'pending' ? '#fef3c7' : '#fecaca',
                      color: order.status === 'delivered' ? '#065f46' : 
                             order.status === 'pending' ? '#92400e' : '#991b1b'
                    }}>
                      {order.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No recent orders</p>
          )}
        </div>

        {/* Product Stats */}
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#111827' }}>
            Product Overview
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#6b7280' }}>Featured Products</span>
              <span style={{ fontWeight: '600', color: '#059669' }}>{featuredProducts}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#6b7280' }}>Out of Stock</span>
              <span style={{ fontWeight: '600', color: '#dc2626' }}>{outOfStockProducts}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#6b7280' }}>Low Stock (&lt; 10)</span>
              <span style={{ fontWeight: '600', color: '#f59e0b' }}>{lowStockProducts}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProducts = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>Product Management</h3>
        <button 
          onClick={() => setProductModal({ isOpen: true, product: null })}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          + Add New Product
        </button>
      </div>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Image</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Name</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Price</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Stock</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, index) => (
                <tr key={product.id} style={{ borderBottom: index < products.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <td style={{ padding: '1rem' }}>
                    <img
                      src={product.image_url}
                      alt={product.name}
                      style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px' }}
                    />
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: '500', color: '#111827' }}>{product.name}</div>
                    <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>SKU: {product.sku}</div>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: '500', color: '#111827' }}>
                    ${product.price}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      color: product.stock > 10 ? '#059669' : product.stock > 0 ? '#f59e0b' : '#dc2626',
                      fontWeight: '500'
                    }}>
                      {product.stock}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '16px',
                      fontSize: '0.8rem',
                      fontWeight: '500',
                      backgroundColor: product.is_featured ? '#dbeafe' : '#f3f4f6',
                      color: product.is_featured ? '#1d4ed8' : '#6b7280'
                    }}>
                      {product.is_featured ? 'Featured' : 'Regular'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => setProductModal({ isOpen: true, product })}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                        title="Edit Product"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fca5a5',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          color: '#dc2626'
                        }}
                        title="Delete Product"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#f9fafb',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              Showing page {currentPage} of {totalPages} ({totalProducts} total products)
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={() => loadProducts(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
                  color: currentPage === 1 ? '#9ca3af' : '#374151',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Previous
              </button>
              
              {/* Page Numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => loadProducts(pageNum)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: currentPage === pageNum ? '#3b82f6' : 'white',
                      color: currentPage === pageNum ? 'white' : '#374151',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: currentPage === pageNum ? '600' : '400'
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => loadProducts(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: currentPage === totalPages ? '#f3f4f6' : 'white',
                  color: currentPage === totalPages ? '#9ca3af' : '#374151',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' };
      case 'confirmed': return { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' };
      case 'processing': return { bg: '#e0e7ff', text: '#5b21b6', border: '#8b5cf6' };
      case 'shipped': return { bg: '#ede9fe', text: '#7c3aed', border: '#a855f7' };
      case 'delivered': return { bg: '#d1fae5', text: '#065f46', border: '#10b981' };
      case 'cancelled': return { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' };
      default: return { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' };
    }
  };

  const renderOrders = () => {
    console.log('🎨 Rendering orders tab...');
    console.log('🎨 adminOrders state:', adminOrders);
    console.log('🎨 adminOrders length:', adminOrders.length);
    console.log('🎨 ordersLoading state:', ordersLoading);
    
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>Order Management</h3>
          <button 
            onClick={() => {
              console.log('🔄 Refresh button clicked!');
              loadAdminOrders();
            }}
            disabled={ordersLoading}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '8px',
              cursor: ordersLoading ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              opacity: ordersLoading ? 0.6 : 1
            }}
          >
            {ordersLoading ? '🔄 Refreshing...' : '🔄 Refresh Orders'}
          </button>
        </div>

        {ordersLoading ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '3rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <p style={{ color: '#6b7280' }}>Loading orders...</p>
          </div>
        ) : adminOrders.length === 0 ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '3rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📦</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
              No Orders Found
            </h3>
            <p style={{ color: '#6b7280' }}>
              No orders have been placed yet. Orders will appear here once customers start placing them.
            </p>
          </div>
        ) : (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                Total Orders: {adminOrders.length}
              </div>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Order #</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Customer</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Items</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Total</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Payment</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Status</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Date</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminOrders.map((order: any, index: number) => {
                    const statusStyle = getOrderStatusColor(order.status);
                    return (
                      <tr key={order.id} style={{ borderBottom: index < adminOrders.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                        <td style={{ padding: '1rem', fontWeight: '500', color: '#111827' }}>
                          #{order.order_number || order.id}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ color: '#111827', fontWeight: '500' }}>
                            {order.user?.first_name && order.user?.last_name 
                              ? `${order.user.first_name} ${order.user.last_name}`
                              : `User #${order.user_id || 'Guest'}`
                            }
                          </div>
                          {order.user?.email && (
                            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{order.user.email}</div>
                          )}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ color: '#111827' }}>{order.items?.length || 0} items</div>
                          {order.items?.length > 0 && (
                            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                              {order.items.slice(0, 2).map((item: any) => item.product?.name || 'Product').join(', ')}
                              {order.items.length > 2 && '...'}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem', fontWeight: '600', color: '#059669' }}>
                          ${Number(order.total).toFixed(2)}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            fontWeight: '500',
                            backgroundColor: order.payment_status === 'paid' ? '#d1fae5' : '#fef3c7',
                            color: order.payment_status === 'paid' ? '#065f46' : '#92400e'
                          }}>
                            {order.payment_method === 'cod' ? '💵 COD' : '💳 Online'}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>
                            {order.payment_status || 'pending'}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                            style={{
                              padding: '0.5rem',
                              border: `1px solid ${statusStyle.border}`,
                              borderRadius: '6px',
                              backgroundColor: statusStyle.bg,
                              color: statusStyle.text,
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              fontWeight: '500'
                            }}
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td style={{ padding: '1rem', color: '#6b7280' }}>
                          <div>{new Date(order.created_at).toLocaleDateString()}</div>
                          <div style={{ fontSize: '0.8rem' }}>
                            {new Date(order.created_at).toLocaleTimeString()}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                            {order.status === 'pending' && (
                              <button 
                                onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}
                                style={{
                                  padding: '0.4rem 0.8rem',
                                  backgroundColor: '#3b82f6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  fontWeight: '500'
                                }}
                              >
                                ✅ Approve
                              </button>
                            )}
                            {['confirmed', 'processing'].includes(order.status) && (
                              <button 
                                onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                                style={{
                                  padding: '0.4rem 0.8rem',
                                  backgroundColor: '#10b981',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.8rem',
                                  fontWeight: '500'
                                }}
                              >
                                ✅ Mark Done
                              </button>
                            )}
                            <button 
                              onClick={() => navigate(`/orders/${order.id}`)}
                              style={{
                                padding: '0.4rem 0.8rem',
                                backgroundColor: '#f3f4f6',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.8rem'
                              }}
                            >
                              👁️ View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCategories = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>Category Management</h3>
        <button 
          onClick={() => setCategoryModal({ isOpen: true, category: null })}
          style={{
            backgroundColor: '#10b981',
            color: 'white',
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          + Add New Category
        </button>
      </div>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Name</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Parent</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Products</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category, index) => (
                <tr key={category.id} style={{ borderBottom: index < categories.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {category.image_url && (
                        <img
                          src={category.image_url}
                          alt={category.name}
                          style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px' }}
                        />
                      )}
                      <div>
                        <div style={{ fontWeight: '500', color: '#111827' }}>{category.name}</div>
                        {category.description && (
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {category.description.substring(0, 50)}{category.description.length > 50 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: '#6b7280' }}>
                    {category.parent ? category.parent.name : '-'}
                  </td>
                  <td style={{ padding: '1rem', color: '#6b7280' }}>
                    {category.products?.length || 0}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '16px',
                      fontSize: '0.8rem',
                      fontWeight: '500',
                      backgroundColor: category.is_active ? '#d1fae5' : '#fef2f2',
                      color: category.is_active ? '#065f46' : '#dc2626'
                    }}>
                      {category.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => setCategoryModal({ isOpen: true, category })}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                        title="Edit Category"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(category.id)}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fca5a5',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          color: '#dc2626'
                        }}
                        title="Delete Category"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' }}>
            Admin Dashboard
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#6b7280' }}>
            Welcome back, {user?.first_name}! Here's what's happening with your store.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '3rem',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '1rem',
          flexWrap: 'wrap'
        }}>
          {[
            { key: 'dashboard', label: '📊 Dashboard', icon: '📊', path: '/admin' },
            { key: 'products', label: '📦 Products', icon: '📦', path: '/admin/products' },
            { key: 'categories', label: '📂 Categories', icon: '📂', path: '/admin/categories' },
            { key: 'approvals', label: '✅ Approvals', icon: '✅', path: '/admin/approvals' },
            { key: 'partners', label: '🤝 Partners', icon: '🤝', path: '/admin/partners' },
            { key: 'orders', label: '🛍️ Orders', icon: '🛍️', path: '/admin/orders' },
            { key: 'users', label: '👥 Users', icon: '👥', path: '/admin/users' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as any);
                if (tab.key === 'partners') {
                  navigate('/admin/partners');
                } else if (tab.key !== 'dashboard') {
                  navigate(tab.path);
                } else {
                  navigate('/admin');
                }
              }}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                backgroundColor: activeTab === tab.key ? '#3b82f6' : 'transparent',
                color: activeTab === tab.key ? 'white' : '#6b7280',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content - Use routing for partners */}
        <Routes>
          <Route path="/partners" element={<Partners />} />
          <Route path="/add-partner" element={<AddPartner />} />
          <Route path="/*" element={
            <>
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'products' && renderProducts()}
              {activeTab === 'categories' && renderCategories()}
              {activeTab === 'orders' && renderOrders()}
              {activeTab === 'approvals' && <ProductApprovals />}
              {activeTab === 'users' && <Users />}
            </>
          } />
        </Routes>
      </div>
      
      {/* Modals */}
      <ProductModal
        isOpen={productModal.isOpen}
        onClose={() => setProductModal({ isOpen: false, product: null })}
        product={productModal.product}
        onSuccess={handleModalSuccess}
      />
      
      <CategoryModal
        isOpen={categoryModal.isOpen}
        onClose={() => setCategoryModal({ isOpen: false, category: null })}
        category={categoryModal.category}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default AdminDashboard;
