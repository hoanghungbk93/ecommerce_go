import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { productsAPI } from '../../services/api';

const ProductApprovals: React.FC = () => {
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Approve a product
  const handleApproveProduct = async (productId: number) => {
    if (!window.confirm('Are you sure you want to approve this product? It will become visible to customers.')) {
      return;
    }

    try {
      setApproving(productId);
      await productsAPI.approveProduct(productId);
      
      // Remove the approved product from the list
      setPendingProducts(prev => prev.filter(p => p.id !== productId));
      
      // Show success message
      alert('Product approved successfully! It is now visible to customers.');
    } catch (error: any) {
      console.error('Error approving product:', error);
      alert('Failed to approve product: ' + (error.response?.data?.error || 'Unknown error'));
    } finally {
      setApproving(null);
    }
  };

  // Manual refresh function for buttons
  const refreshProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Refreshing pending products...');
      const response = await productsAPI.getPendingProducts({ limit: 50 });
      console.log('API response:', response.data);
      setPendingProducts(response.data.products || []);
    } catch (error: any) {
      console.error('Error fetching pending products:', error);
      console.error('Error details:', error.response?.data);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load pending products';
      setError(errorMessage);
      setPendingProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only run once when component mounts
    if (!initialized) {
      console.log('Component mounted, fetching products...');
      setInitialized(true);
      
      const fetchData = async () => {
        try {
          setLoading(true);
          setError(null);
          console.log('Initial fetch of pending products...');
          const response = await productsAPI.getPendingProducts({ limit: 50 });
          console.log('Initial API response:', response.data);
          setPendingProducts(response.data.products || []);
        } catch (error: any) {
          console.error('Error in initial fetch:', error);
          console.error('Error details:', error.response?.data);
          const errorMessage = error.response?.data?.error || error.message || 'Failed to load pending products';
          setError(errorMessage);
          setPendingProducts([]);
        } finally {
          setLoading(false);
        }
      };
      
      fetchData();
    }
  }, [initialized]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <div style={{ 
          fontSize: '1.2rem', 
          color: '#6b7280' 
        }}>
          Loading pending products...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
            Product Approvals
          </h3>
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
            Review and approve products submitted by partners before they appear in the store
          </p>
        </div>
        <button 
          onClick={refreshProducts}
          disabled={loading}
          style={{
            backgroundColor: '#6b7280',
            color: 'white',
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '500',
            fontSize: '0.9rem'
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {error ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #fca5a5',
          padding: '4rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
          <h4 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#dc2626', marginBottom: '0.5rem' }}>
            Error Loading Products
          </h4>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            {error}
          </p>
          <button 
            onClick={refreshProducts}
            style={{
              backgroundColor: '#dc2626',
              color: 'white',
              padding: '0.75rem 1.5rem',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Try Again
          </button>
        </div>
      ) : pendingProducts.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '4rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h4 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '0.5rem' }}>
            All Caught Up!
          </h4>
          <p style={{ color: '#6b7280' }}>
            There are no products pending approval at the moment.
          </p>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          <div style={{ 
            backgroundColor: '#fef3c7', 
            padding: '1rem', 
            borderBottom: '1px solid #e5e7eb' 
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              color: '#92400e',
              fontWeight: '500'
            }}>
              ⚠️ {pendingProducts.length} product{pendingProducts.length !== 1 ? 's' : ''} pending approval
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Image</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Product Details</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Price</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Stock</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Category</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Submitted</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingProducts.map((product, index) => (
                  <tr key={product.id} style={{ 
                    borderBottom: index < pendingProducts.length - 1 ? '1px solid #f3f4f6' : 'none',
                    backgroundColor: approving === product.id ? '#fef3c7' : 'transparent'
                  }}>
                    <td style={{ padding: '1rem' }}>
                      <img
                        src={product.image_url || '/api/placeholder/60/60'}
                        alt={product.name}
                        style={{ 
                          width: '60px', 
                          height: '60px', 
                          objectFit: 'cover', 
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb'
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/api/placeholder/60/60';
                        }}
                      />
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                        {product.name}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                        SKU: {product.sku}
                      </div>
                      {product.brand && (
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          Brand: {product.brand}
                        </div>
                      )}
                      {product.description && (
                        <div style={{ 
                          fontSize: '0.875rem', 
                          color: '#6b7280', 
                          marginTop: '0.5rem',
                          maxWidth: '300px'
                        }}>
                          {product.description.length > 100 
                            ? `${product.description.substring(0, 100)}...` 
                            : product.description
                          }
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: '600', color: '#059669', fontSize: '1.1rem' }}>
                        ${product.price?.toFixed(2) || '0.00'}
                      </div>
                      {product.sale_price && (
                        <div style={{ fontSize: '0.875rem', color: '#dc2626', textDecoration: 'line-through' }}>
                          ${product.sale_price.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        color: (product.stock || 0) > 10 ? '#059669' : (product.stock || 0) > 0 ? '#f59e0b' : '#dc2626',
                        fontWeight: '600'
                      }}>
                        {product.stock || 0}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#6b7280' }}>
                      {product.category?.name || 'No category'}
                    </td>
                    <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                      {product.created_at ? new Date(product.created_at).toLocaleDateString() : 'Unknown'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <button 
                        onClick={() => handleApproveProduct(product.id)}
                        disabled={approving === product.id}
                        style={{
                          backgroundColor: approving === product.id ? '#6b7280' : '#059669',
                          color: 'white',
                          padding: '0.5rem 1rem',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: approving === product.id ? 'not-allowed' : 'pointer',
                          fontWeight: '500',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        {approving === product.id ? (
                          <>⏳ Approving...</>
                        ) : (
                          <>✅ Approve</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductApprovals;
