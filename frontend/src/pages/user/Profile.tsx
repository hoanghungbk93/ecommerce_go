import React, { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '../../hooks/redux';
import { userAPI } from '../../services/api';
const Profile: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    postal_code: '',
    avatar_url: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        country: user.country || '',
        postal_code: user.postal_code || '',
        avatar_url: user.avatar_url || ''
      });
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setSuccessMessage('');
    
    try {
      await userAPI.updateProfile({
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        country: formData.country || undefined,
        postal_code: formData.postal_code || undefined,
      });
      
      // Update local user data (you might want to dispatch an action to update Redux state)
      setSuccessMessage('Profile updated successfully!');
      setIsEditing(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrors({ general: 'Failed to update profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      setErrors({ avatar: 'Please select an image file' });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setErrors({ avatar: 'Image size must be less than 5MB' });
      return;
    }

    setUploadingAvatar(true);
    setErrors({});
    
    try {
      console.log('Attempting to upload avatar:', file.name, file.size);
      const response = await userAPI.uploadAvatar(file);
      console.log('Avatar upload response:', response.data);
      setFormData(prev => ({ ...prev, avatar_url: response.data.avatar_url }));
      setSuccessMessage('Avatar updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // Show more specific error message
      const errorMessage = error.response?.data?.message || error.message || 'Failed to upload avatar';
      setErrors({ avatar: `Upload failed: ${errorMessage}. You can paste an image URL below instead.` });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getAvatarDisplay = () => {
    if (formData.avatar_url) {
      return (
        <img
          src={formData.avatar_url}
          alt="Profile Avatar"
          style={{
            width: '120px',
            height: '120px',
            objectFit: 'cover',
            borderRadius: '50%',
            border: '4px solid white',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}
        />
      );
    }
    
    // Default avatar with user initials
    const initials = `${formData.first_name.charAt(0)}${formData.last_name.charAt(0)}`.toUpperCase();
    return (
      <div style={{
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        backgroundColor: '#3b82f6',
        border: '4px solid white',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2.5rem',
        fontWeight: 'bold',
        color: 'white'
      }}>
        {initials || '👤'}
      </div>
    );
  };

  if (!user) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <p style={{ fontSize: '1.1rem', color: '#6b7280' }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            color: '#111827', 
            marginBottom: '0.5rem' 
          }}>
            My Profile
          </h1>
          <p style={{ fontSize: '1.1rem', color: '#6b7280' }}>
            Manage your account information and preferences
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div style={{
            background: '#d1fae5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '2rem'
          }}>
            {successMessage}
          </div>
        )}

        {/* Main Profile Card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          {/* Avatar Section */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '3rem 2rem',
            textAlign: 'center',
            position: 'relative'
          }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {getAvatarDisplay()}
              
              {/* Camera Icon for Upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#3b82f6',
                  border: '3px solid white',
                  cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  opacity: uploadingAvatar ? 0.6 : 1
                }}
                title="Upload new avatar"
              >
                {uploadingAvatar ? '⏳' : '📷'}
              </button>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              style={{ display: 'none' }}
            />
            
            <h2 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: 'white',
              marginTop: '1.5rem',
              marginBottom: '0.5rem'
            }}>
              {formData.first_name} {formData.last_name}
            </h2>
            
            <p style={{
              fontSize: '1.1rem',
              color: 'rgba(255, 255, 255, 0.9)',
              marginBottom: '0'
            }}>
              {formData.email}
            </p>
            
            {user.role === 'admin' && (
              <span style={{
                display: 'inline-block',
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}>
                👑 Administrator
              </span>
            )}
            
            {errors.avatar && (
              <div style={{ 
                color: '#fca5a5', 
                fontSize: '0.9rem', 
                marginTop: '1rem',
                textAlign: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: '0.75rem',
                borderRadius: '8px'
              }}>
                {errors.avatar}
              </div>
            )}
            
            {/* Avatar URL Input as Fallback */}
            <div style={{
              marginTop: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              alignItems: 'center'
            }}>
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.8rem',
                margin: 0
              }}>
                Or paste image URL:
              </p>
              <input
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={formData.avatar_url}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, avatar_url: e.target.value }));
                  setErrors(prev => ({ ...prev, avatar: '' }));
                }}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '0.8rem',
                  width: '250px',
                  textAlign: 'center'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (formData.avatar_url) {
                      setSuccessMessage('Avatar URL updated!');
                      setTimeout(() => setSuccessMessage(''), 3000);
                    }
                  }
                }}
              />
              <p style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.7rem',
                margin: 0,
                textAlign: 'center'
              }}>
                Press Enter to apply
              </p>
            </div>
          </div>

          {/* Profile Information */}
          <div style={{ padding: '2rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                Personal Information
              </h3>
              
              <button
                onClick={() => {
                  setIsEditing(!isEditing);
                  setErrors({});
                  setSuccessMessage('');
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: isEditing ? '#6b7280' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {isEditing ? '✕ Cancel' : '✏️ Edit Profile'}
              </button>
            </div>

            {errors.general && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                color: '#dc2626',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '2rem'
              }}>
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '2rem'
              }}>
                {/* First Name */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    First Name *
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: errors.first_name ? '2px solid #ef4444' : '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '1rem'
                      }}
                    />
                  ) : (
                    <p style={{
                      padding: '0.75rem',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      color: '#111827',
                      margin: 0
                    }}>
                      {formData.first_name || 'Not provided'}
                    </p>
                  )}
                  {errors.first_name && (
                    <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                      {errors.first_name}
                    </p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Last Name *
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: errors.last_name ? '2px solid #ef4444' : '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '1rem'
                      }}
                    />
                  ) : (
                    <p style={{
                      padding: '0.75rem',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      color: '#111827',
                      margin: 0
                    }}>
                      {formData.last_name || 'Not provided'}
                    </p>
                  )}
                  {errors.last_name && (
                    <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                      {errors.last_name}
                    </p>
                  )}
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Email Address
                  </label>
                  <p style={{
                    padding: '0.75rem',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    color: '#6b7280',
                    margin: 0
                  }}>
                    {formData.email} (Cannot be changed)
                  </p>
                </div>

                {/* Phone */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '1rem'
                      }}
                      placeholder="(555) 123-4567"
                    />
                  ) : (
                    <p style={{
                      padding: '0.75rem',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      color: '#111827',
                      margin: 0
                    }}>
                      {formData.phone || 'Not provided'}
                    </p>
                  )}
                </div>

                {/* Address */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Address
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '1rem'
                      }}
                      placeholder="123 Main Street"
                    />
                  ) : (
                    <p style={{
                      padding: '0.75rem',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      color: '#111827',
                      margin: 0
                    }}>
                      {formData.address || 'Not provided'}
                    </p>
                  )}
                </div>

                {/* City */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    City
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '1rem'
                      }}
                      placeholder="New York"
                    />
                  ) : (
                    <p style={{
                      padding: '0.75rem',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      color: '#111827',
                      margin: 0
                    }}>
                      {formData.city || 'Not provided'}
                    </p>
                  )}
                </div>

                {/* Country */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Country
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '1rem'
                      }}
                      placeholder="United States"
                    />
                  ) : (
                    <p style={{
                      padding: '0.75rem',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      color: '#111827',
                      margin: 0
                    }}>
                      {formData.country || 'Not provided'}
                    </p>
                  )}
                </div>

                {/* Postal Code */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Postal Code
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '1rem'
                      }}
                      placeholder="10001"
                    />
                  ) : (
                    <p style={{
                      padding: '0.75rem',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      color: '#111827',
                      margin: 0
                    }}>
                      {formData.postal_code || 'Not provided'}
                    </p>
                  )}
                </div>
              </div>

              {/* Save Button */}
              {isEditing && (
                <div style={{
                  marginTop: '2rem',
                  paddingTop: '2rem',
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      padding: '1rem 2rem',
                      backgroundColor: loading ? '#9ca3af' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {loading ? '💾 Saving...' : '✅ Save Changes'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
