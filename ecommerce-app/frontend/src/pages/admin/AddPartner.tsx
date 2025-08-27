import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { createPartner, clearError } from '../../store/slices/partnersSlice';
import { CreatePartnerRequest } from '../../types';

const AddPartner: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.partners);

  const [formData, setFormData] = useState<CreatePartnerRequest>({
    name: '',
    email: '',
    webhook_url: '',
    commission_rate: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Clear any existing errors when component mounts
    dispatch(clearError());
  }, [dispatch]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Partner name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.webhook_url && !/^https?:\/\/.+/.test(formData.webhook_url)) {
      newErrors.webhook_url = 'Please enter a valid URL (starting with http:// or https://)';
    }

    if (formData.commission_rate && (formData.commission_rate < 0 || formData.commission_rate > 100)) {
      newErrors.commission_rate = 'Commission rate must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      const result = await dispatch(createPartner(formData));
      
      if (createPartner.fulfilled.match(result)) {
        setSuccessMessage('Partner created successfully!');
        setTimeout(() => {
          navigate('/admin/partners');
        }, 2000);
      }
    } catch (error) {
      console.error('Error creating partner:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'commission_rate' ? parseFloat(value) || 0 : value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate('/admin/partners')}
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
            title="Back to Partners"
          >
            ← 
          </button>
          <div>
            <h1 style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold', 
              color: '#111827', 
              marginBottom: '0.5rem',
              margin: 0
            }}>
              Add New Partner
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#6b7280', margin: 0 }}>
              Create a new partner account with API access
            </p>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div style={{
            background: '#d1fae5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>✅</span>
            {successMessage}
          </div>
        )}

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
            gap: '0.5rem'
          }}>
            <span>❌</span>
            {error}
          </div>
        )}

        {/* Form Card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
          padding: '2rem'
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem'
            }}>
              {/* Partner Name */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Partner Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., TechCorp Solutions"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: errors.name ? '2px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    if (!errors.name) {
                      e.target.style.borderColor = '#3b82f6';
                    }
                  }}
                  onBlur={(e) => {
                    if (!errors.name) {
                      e.target.style.borderColor = '#d1d5db';
                    }
                  }}
                />
                {errors.name && (
                  <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="contact@techcorp.com"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: errors.email ? '2px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    if (!errors.email) {
                      e.target.style.borderColor = '#3b82f6';
                    }
                  }}
                  onBlur={(e) => {
                    if (!errors.email) {
                      e.target.style.borderColor = '#d1d5db';
                    }
                  }}
                />
                {errors.email && (
                  <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Commission Rate */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  name="commission_rate"
                  value={formData.commission_rate}
                  onChange={handleInputChange}
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: errors.commission_rate ? '2px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    if (!errors.commission_rate) {
                      e.target.style.borderColor = '#3b82f6';
                    }
                  }}
                  onBlur={(e) => {
                    if (!errors.commission_rate) {
                      e.target.style.borderColor = '#d1d5db';
                    }
                  }}
                />
                {errors.commission_rate && (
                  <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>
                    {errors.commission_rate}
                  </p>
                )}
                <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>
                  Percentage of commission for this partner (0-100%)
                </p>
              </div>

              {/* Webhook URL */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  Webhook URL (Optional)
                </label>
                <input
                  type="url"
                  name="webhook_url"
                  value={formData.webhook_url}
                  onChange={handleInputChange}
                  placeholder="https://api.techcorp.com/webhooks/ecommerce"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: errors.webhook_url ? '2px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    if (!errors.webhook_url) {
                      e.target.style.borderColor = '#3b82f6';
                    }
                  }}
                  onBlur={(e) => {
                    if (!errors.webhook_url) {
                      e.target.style.borderColor = '#d1d5db';
                    }
                  }}
                />
                {errors.webhook_url && (
                  <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>
                    {errors.webhook_url}
                  </p>
                )}
                <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>
                  URL where we'll send webhook notifications for this partner
                </p>
              </div>
            </div>

            {/* Important Notice */}
            <div style={{
              marginTop: '2rem',
              padding: '1rem',
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '8px',
              color: '#92400e'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>
                🔑 Important:
              </h4>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                After creating the partner, API keys will be automatically generated. Make sure to securely share these keys with the partner as they won't be displayed again in their full form.
              </p>
            </div>

            {/* Form Actions */}
            <div style={{
              marginTop: '2rem',
              paddingTop: '2rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={() => navigate('/admin/partners')}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = '#3b82f6';
                  }
                }}
              >
                {isLoading ? (
                  <>
                    <span style={{ 
                      display: 'inline-block',
                      width: '16px',
                      height: '16px',
                      border: '2px solid #ffffff',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Creating...
                  </>
                ) : (
                  <>
                    ✅ Create Partner
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
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

export default AddPartner;
