import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { logout } from '../../store/slices/authSlice';

const Navbar: React.FC = () => {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const { items } = useAppSelector((state) => state.cart);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await dispatch(logout());
    setIsProfileDropdownOpen(false);
    navigate('/');
  };

  const cartItemsCount = items.reduce((total, item) => total + item.quantity, 0);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <>
      <nav style={{ 
        background: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link to="/" style={{ 
            textDecoration: 'none', 
            color: '#1f2937', 
            fontSize: '1.5rem', 
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            🛒 E-Shop
          </Link>
          <Link to="/products" style={{ 
            textDecoration: 'none', 
            color: '#6b7280',
            fontSize: '1rem',
            fontWeight: '500',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            transition: 'all 0.2s ease'
          }}>
            Products
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link 
            to="/cart" 
            style={{ 
              textDecoration: 'none', 
              color: '#6b7280',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              transition: 'all 0.2s ease',
              fontSize: '1rem',
              fontWeight: '500'
            }}
          >
            🛒 Cart
            {cartItemsCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-8px',
                background: '#dc2626',
                color: 'white',
                borderRadius: '50%',
                minWidth: '20px',
                height: '20px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                {cartItemsCount > 99 ? '99+' : cartItemsCount}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '1rem' }} ref={dropdownRef}>
              {/* Admin Link (if admin) */}
              {user?.role === 'admin' && (
                <Link 
                  to="/admin"
                  style={{
                    textDecoration: 'none',
                    background: '#8b5cf6',
                    color: 'white',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  👨‍💼 Admin
                </Link>
              )}
              
              {/* Profile Dropdown Button */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: isProfileDropdownOpen ? '#f3f4f6' : 'transparent',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#374151',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isProfileDropdownOpen) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isProfileDropdownOpen) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}>
                    {user?.first_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#111827' }}>
                      {user?.first_name} {user?.last_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {user?.email}
                    </div>
                  </div>
                  <svg 
                    style={{
                      width: '12px',
                      height: '12px',
                      transition: 'transform 0.2s ease',
                      transform: isProfileDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                {isProfileDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 0.5rem)',
                    right: 0,
                    width: '220px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                    zIndex: 1001,
                    overflow: 'hidden'
                  }}>
                    {/* User Info Header */}
                    <div style={{
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: '#3b82f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '1rem',
                          fontWeight: '600'
                        }}>
                          {user?.first_name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#111827', fontSize: '0.9rem' }}>
                            {user?.first_name} {user?.last_name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                            {user?.email}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Menu Items */}
                    <div style={{ padding: '0.5rem 0' }}>
                      <Link
                        to="/profile"
                        onClick={() => setIsProfileDropdownOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem 1rem',
                          textDecoration: 'none',
                          color: '#374151',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          transition: 'all 0.2s ease',
                          width: '100%'
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#f9fafb';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>👤</span>
                        <span>My Profile</span>
                      </Link>
                      
                      <Link
                        to="/orders"
                        onClick={() => setIsProfileDropdownOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem 1rem',
                          textDecoration: 'none',
                          color: '#374151',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          transition: 'all 0.2s ease',
                          width: '100%'
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#f9fafb';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>📦</span>
                        <span>My Orders</span>
                      </Link>
                      
                      {/* Divider */}
                      <div style={{
                        height: '1px',
                        backgroundColor: '#e5e7eb',
                        margin: '0.5rem 0'
                      }} />
                      
                      <button
                        onClick={handleLogout}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem 1rem',
                          width: '100%',
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#dc2626',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fef2f2';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                        }}
                      >
                        <span style={{ fontSize: '1.1rem' }}>🚪</span>
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link 
                to="/login"
                style={{ 
                  textDecoration: 'none', 
                  color: '#374151',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid transparent'
                }}
              >
                Login
              </Link>
              <Link 
                to="/register"
                style={{
                  textDecoration: 'none',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                  border: 'none'
                }}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
