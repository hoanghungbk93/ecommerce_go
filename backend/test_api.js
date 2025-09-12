const axios = require('axios');

const API_BASE_URL = 'http://localhost:8080/api/v1';

async function testAdminOrdersAPI() {
  try {
    console.log('🔄 Testing admin orders API...');
    console.log('🔗 URL:', `${API_BASE_URL}/admin/orders`);
    
    // First, try without authentication
    console.log('\n📦 Testing without authentication (should fail with 401):');
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/orders`);
      console.log('📦 Raw API response:', response.data);
    } catch (error) {
      console.log('❌ Error (expected):', error.response?.status, error.response?.statusText);
      console.log('❌ Error message:', error.response?.data);
    }

    // Test if we can create an admin user or login
    console.log('\n🔐 Testing user registration/login...');
    
    // Try to register an admin user
    try {
      const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
        email: 'admin@test.com',
        password: 'admin123',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin'
      });
      console.log('✅ Registration successful:', registerResponse.data);
    } catch (error) {
      console.log('⚠️ Registration failed (user might already exist):', error.response?.data?.message);
    }

    // Try to login
    try {
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'admin@test.com',
        password: 'admin123'
      });
      
      console.log('✅ Login successful!');
      const token = loginResponse.data.access_token;
      console.log('🔑 Got access token (first 20 chars):', token?.substring(0, 20) + '...');
      
      // Now try the admin orders API with authentication
      console.log('\n📦 Testing admin orders API with authentication:');
      const ordersResponse = await axios.get(`${API_BASE_URL}/admin/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('📦 Raw API response:', ordersResponse.data);
      console.log('📦 Response data type:', Array.isArray(ordersResponse.data) ? 'Array' : typeof ordersResponse.data);
      console.log('📦 Number of orders:', Array.isArray(ordersResponse.data) ? ordersResponse.data.length : 'N/A');
      
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testAdminOrdersAPI();
