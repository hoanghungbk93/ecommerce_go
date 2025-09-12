import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import {
  fetchPartners,
  deletePartner,
  togglePartnerStatus,
  regenerateApiKeys,
  clearError
} from '../../store/slices/partnersSlice';
import { Partner } from '../../types';

const Partners: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { partners, isLoading, error, pagination } = useAppSelector((state) => state.partners);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<{ api_key: string; secret_key: string } | null>(null);

  useEffect(() => {
    dispatch(fetchPartners({ page: currentPage, limit: 20, search: searchTerm }));
  }, [dispatch, currentPage, searchTerm]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleDeletePartner = async () => {
    if (!selectedPartner) return;
    
    try {
      await dispatch(deletePartner(selectedPartner.id));
      setShowDeleteModal(false);
      setSelectedPartner(null);
      // Refresh the list
      dispatch(fetchPartners({ page: currentPage, limit: 20, search: searchTerm }));
    } catch (error) {
      console.error('Error deleting partner:', error);
    }
  };

  const handleToggleStatus = async (partner: Partner) => {
    try {
      await dispatch(togglePartnerStatus(partner.id));
      // Refresh the list
      dispatch(fetchPartners({ page: currentPage, limit: 20, search: searchTerm }));
    } catch (error) {
      console.error('Error toggling partner status:', error);
    }
  };

  const handleRegenerateKeys = async (partner: Partner) => {
    try {
      const result = await dispatch(regenerateApiKeys(partner.id));
      if (regenerateApiKeys.fulfilled.match(result)) {
        setGeneratedKeys(result.payload.keys);
        setSelectedPartner(partner);
        setShowApiKeyModal(true);
      }
    } catch (error) {
      console.error('Error regenerating API keys:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span style={{
        padding: '0.25rem 0.75rem',
        borderRadius: '12px',
        fontSize: '0.8rem',
        fontWeight: '500',
        backgroundColor: isActive ? '#d1fae5' : '#fee2e2',
        color: isActive ? '#065f46' : '#dc2626'
      }}>
        {isActive ? '✅ Active' : '❌ Inactive'}
      </span>
    );
  };

  const filteredPartners = partners.filter(partner =>
    partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold', 
              color: '#111827', 
              marginBottom: '0.5rem',
              margin: 0
            }}>
              Partners Management
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#6b7280', margin: 0 }}>
              Manage partner accounts and API access
            </p>
          </div>
          
          <button
            onClick={() => navigate('/admin/add-partner')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
          >
            ➕ Add New Partner
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            color: '#dc2626',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>❌ {error}</span>
            <button
              onClick={() => dispatch(clearError())}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc2626',
                cursor: 'pointer',
                fontSize: '1.2rem'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Search and Filters */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <input
                type="text"
                placeholder="Search partners by name or email..."
                value={searchTerm}
                onChange={handleSearch}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              {filteredPartners.length} partner{filteredPartners.length !== 1 ? 's' : ''} found
            </div>
          </div>
        </div>

        {/* Partners Table */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          {isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{
                display: 'inline-block',
                width: '32px',
                height: '32px',
                border: '3px solid #f3f4f6',
                borderTop: '3px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading partners...</p>
            </div>
          ) : filteredPartners.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤝</div>
              <h3 style={{ color: '#374151', marginBottom: '0.5rem' }}>No partners found</h3>
              <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
                {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first partner'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => navigate('/admin/add-partner')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Add First Partner
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Partner</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>API Key</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Commission</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Status</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Created</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPartners.map((partner, index) => (
                    <tr key={partner.id} style={{ borderTop: index > 0 ? '1px solid #e5e7eb' : 'none' }}>
                      <td style={{ padding: '1rem' }}>
                        <div>
                          <div style={{ fontWeight: '600', color: '#111827' }}>{partner.name}</div>
                          <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>{partner.email}</div>
                          {partner.webhook_url && (
                            <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                              🔗 Webhook configured
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <code style={{
                            backgroundColor: '#f3f4f6',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            fontFamily: 'monospace'
                          }}>
                            {partner.api_key.substring(0, 8)}...
                          </code>
                          <button
                            onClick={() => copyToClipboard(partner.api_key)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '1rem',
                              color: '#6b7280'
                            }}
                            title="Copy API Key"
                          >
                            📋
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          fontWeight: '600',
                          color: partner.commission_rate > 0 ? '#059669' : '#6b7280'
                        }}>
                          {partner.commission_rate}%
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {getStatusBadge(partner.is_active)}
                      </td>
                      <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
                        {formatDate(partner.created_at)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleToggleStatus(partner)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: partner.is_active ? '#f59e0b' : '#059669',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '500',
                              cursor: 'pointer'
                            }}
                            title={partner.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {partner.is_active ? '⏸️' : '▶️'}
                          </button>
                          
                          <button
                            onClick={() => handleRegenerateKeys(partner)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: '#6366f1',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '500',
                              cursor: 'pointer'
                            }}
                            title="Regenerate API Keys"
                          >
                            🔄
                          </button>
                          
                          <button
                            onClick={() => {
                              setSelectedPartner(partner);
                              setShowDeleteModal(true);
                            }}
                            style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: '500',
                              cursor: 'pointer'
                            }}
                            title="Delete Partner"
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
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedPartner && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <h3 style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '1.5rem' }}>
                ⚠️ Delete Partner
              </h3>
              <p style={{ color: '#374151', marginBottom: '1.5rem' }}>
                Are you sure you want to delete <strong>{selectedPartner.name}</strong>? 
                This action cannot be undone and will revoke their API access immediately.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedPartner(null);
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeletePartner}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Delete Partner
                </button>
              </div>
            </div>
          </div>
        )}

        {/* API Keys Modal */}
        {showApiKeyModal && selectedPartner && generatedKeys && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <h3 style={{ color: '#059669', marginBottom: '1rem', fontSize: '1.5rem' }}>
                🔑 New API Keys Generated
              </h3>
              
              <div style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem',
                color: '#92400e'
              }}>
                <strong>⚠️ Important:</strong> These keys will only be shown once. Make sure to copy and securely store them before closing this dialog.
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                  API Key:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <code style={{
                    flex: 1,
                    backgroundColor: '#f3f4f6',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all'
                  }}>
                    {generatedKeys.api_key}
                  </code>
                  <button
                    onClick={() => copyToClipboard(generatedKeys.api_key)}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                    title="Copy API Key"
                  >
                    📋
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>
                  Secret Key:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <code style={{
                    flex: 1,
                    backgroundColor: '#f3f4f6',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all'
                  }}>
                    {generatedKeys.secret_key}
                  </code>
                  <button
                    onClick={() => copyToClipboard(generatedKeys.secret_key)}
                    style={{
                      padding: '0.5rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                    title="Copy Secret Key"
                  >
                    📋
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowApiKeyModal(false);
                    setSelectedPartner(null);
                    setGeneratedKeys(null);
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  ✅ I've Saved the Keys
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add spinning animation */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default Partners;
