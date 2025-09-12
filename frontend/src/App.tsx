import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import Navbar from './components/common/Navbar';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Products from './pages/products/Products';
import ProductDetail from './pages/products/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Profile from './pages/user/Profile';
import Orders from './pages/orders/Orders';
import OrderDetail from './pages/orders/OrderDetail';
import AdminDashboard from './pages/admin/Dashboard';
import Partners from './pages/admin/Partners';
import AddPartner from './pages/admin/AddPartner';
import PrivateRoute from './components/common/PrivateRoute';
import AdminRoute from './components/common/AdminRoute';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route
                path="/checkout"
                element={
                  <PrivateRoute>
                    <Checkout />
                  </PrivateRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <PrivateRoute>
                    <Orders />
                  </PrivateRoute>
                }
              />
              <Route
                path="/orders/:id"
                element={
                  <PrivateRoute>
                    <OrderDetail />
                  </PrivateRoute>
                }
              />
              <Route
                path="/admin/*"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
            </Routes>
          </main>
        </div>
      </Router>
    </Provider>
  );
}

export default App;
