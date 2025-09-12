import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { userAPI } from '../../services/api';
import { User } from '../../types';

interface UserModalProps {
  user: User;
  onClose: () => void;
  onUpdate: () => void;
}

interface UserFormData {
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  role: string;
  is_active: boolean;
  email_verified: boolean;
}

interface PasswordFormData {
  new_password: string;
  confirm_password: string;
}

const UserModal: React.FC<UserModalProps> = ({ user, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'password'>('details');
  const [loading, setLoading] = useState(false);

  const { register: registerUser, handleSubmit: handleSubmitUser, formState: { errors: userErrors } } = useForm<UserFormData>({
    defaultValues: {
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      country: user.country || '',
      postal_code: user.postal_code || '',
      role: user.role,
      is_active: user.is_active,
      email_verified: user.email_verified
    }
  });

  const { register: registerPassword, handleSubmit: handleSubmitPassword, formState: { errors: passwordErrors }, watch, reset: resetPassword } = useForm<PasswordFormData>();

  const onSubmitUser = async (data: UserFormData) => {
    try {
      setLoading(true);
      await userAPI.updateUser(user.id, {
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        address: data.address,
        city: data.city,
        country: data.country,
        postal_code: data.postal_code,
        role: data.role,
        is_active: data.is_active,
        email_verified: data.email_verified
      });
      alert('User updated successfully');
      onUpdate();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitPassword = async (data: PasswordFormData) => {
    try {
      setLoading(true);
      await userAPI.changeUserPassword(user.id, data.new_password);
      alert('Password updated successfully');
      resetPassword();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const watchPassword = watch('new_password');

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'auto',
        margin: '1rem'
      }}>
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: '#111827'
          }}>
            Edit User: {user.first_name} {user.last_name}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <button
            onClick={() => setActiveTab('details')}
            style={{
              flex: 1,
              padding: '1rem',
              background: activeTab === 'details' ? '#3b82f6' : 'transparent',
              color: activeTab === 'details' ? 'white' : '#6b7280',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            User Details
          </button>
          <button
            onClick={() => setActiveTab('password')}
            style={{
              flex: 1,
              padding: '1rem',
              background: activeTab === 'password' ? '#3b82f6' : 'transparent',
              color: activeTab === 'password' ? 'white' : '#6b7280',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Change Password
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {activeTab === 'details' && (
            <form onSubmit={handleSubmitUser(onSubmitUser)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                    First Name *
                  </label>
                  <input
                    {...registerUser('first_name', { required: 'First name is required' })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.875rem'
                    }}
                  />
                  {userErrors.first_name && (
                    <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {userErrors.first_name.message}
                    </p>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                    Last Name *
                  </label>
                  <input
                    {...registerUser('last_name', { required: 'Last name is required' })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.875rem'
                    }}
                  />
                  {userErrors.last_name && (
                    <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {userErrors.last_name.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                  Email
                </label>
                <input
                  value={user.email}
                  disabled
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    background: '#f9fafb',
                    color: '#6b7280'
                  }}
                />
                <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Email cannot be changed
                </p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                  Phone
                </label>
                <input
                  {...registerUser('phone')}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                  Address
                </label>
                <input
                  {...registerUser('address')}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                    City
                  </label>
                  <input
                    {...registerUser('city')}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                    Country
                  </label>
                  <input
                    {...registerUser('country')}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                    Postal Code
                  </label>
                  <input
                    {...registerUser('postal_code')}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                  Role *
                </label>
                <select
                  {...registerUser('role', { required: 'Role is required' })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                {userErrors.role && (
                  <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {userErrors.role.message}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '2rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500', color: '#374151' }}>
                  <input
                    type="checkbox"
                    {...registerUser('is_active')}
                  />
                  Account Active
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500', color: '#374151' }}>
                  <input
                    type="checkbox"
                    {...registerUser('email_verified')}
                  />
                  Email Verified
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: loading ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handleSubmitPassword(onSubmitPassword)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                  New Password *
                </label>
                <input
                  type="password"
                  {...registerPassword('new_password', { 
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' }
                  })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                />
                {passwordErrors.new_password && (
                  <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {passwordErrors.new_password.message}
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                  Confirm Password *
                </label>
                <input
                  type="password"
                  {...registerPassword('confirm_password', { 
                    required: 'Please confirm password',
                    validate: value => value === watchPassword || 'Passwords do not match'
                  })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '0.875rem'
                  }}
                />
                {passwordErrors.confirm_password && (
                  <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {passwordErrors.confirm_password.message}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    background: loading ? '#9ca3af' : '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserModal;
