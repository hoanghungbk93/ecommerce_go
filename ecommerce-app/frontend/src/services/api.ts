import axios, { AxiosResponse } from 'axios';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  GoogleLoginRequest,
  GoogleLoginResponse,
  Product,
  ProductsResponse,
  User,
  Order,
  Cart,
  Category,
  Partner,
  CreatePartnerRequest,
  UpdatePartnerRequest,
  ShippingAddress,
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && localStorage.getItem('refresh_token')) {
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        
        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);
        
        error.config.headers.Authorization = `Bearer ${access_token}`;
        return api.request(error.config);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data: LoginRequest): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/login', data),
  
  register: (data: RegisterRequest): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/register', data),
  
  googleLogin: (data: GoogleLoginRequest): Promise<AxiosResponse<GoogleLoginResponse>> =>
    api.post('/auth/google', data),
  
  logout: (refreshToken: string): Promise<AxiosResponse<{ message: string }>> =>
    api.post('/auth/logout', { refresh_token: refreshToken }),
  
  refreshToken: (refreshToken: string): Promise<AxiosResponse<{ access_token: string; user: User }>> =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),
};

export const userAPI = {
  getProfile: (): Promise<AxiosResponse<User>> =>
    api.get('/users/profile'),
  
  updateProfile: (data: Partial<User>): Promise<AxiosResponse<User>> =>
    api.put('/users/profile', data),
    
  uploadAvatar: (file: File): Promise<AxiosResponse<{ avatar_url: string }>> => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Admin functions
  getAllUsers: (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<AxiosResponse<{ users: User[]; pagination: { page: number; limit: number; total: number } }>> =>
    api.get('/admin/users', { params }),
  
  getUser: (id: number): Promise<AxiosResponse<{ user: User }>> =>
    api.get(`/admin/users/${id}`),
  
  updateUser: (id: number, data: {
    first_name: string;
    last_name: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    postal_code?: string;
    role?: string;
    is_active?: boolean;
    email_verified?: boolean;
  }): Promise<AxiosResponse<{ message: string; user: User }>> =>
    api.put(`/admin/users/${id}`, data),
  
  changeUserPassword: (id: number, newPassword: string): Promise<AxiosResponse<{ message: string }>> =>
    api.put(`/admin/users/${id}/password`, { new_password: newPassword }),
  
  deleteUser: (id: number): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/admin/users/${id}`),
};

export const productsAPI = {
  getProducts: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category_id?: number;
  }): Promise<AxiosResponse<ProductsResponse>> =>
    api.get('/products', { params }),
  
  getProduct: (id: number): Promise<AxiosResponse<Product>> =>
    api.get(`/products/${id}`),
  
  createProduct: (data: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<AxiosResponse<Product>> =>
    api.post('/admin/products', data),
  
  updateProduct: (id: number, data: Partial<Product>): Promise<AxiosResponse<Product>> =>
    api.put(`/admin/products/${id}`, data),
  
  deleteProduct: (id: number): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/admin/products/${id}`),
  
  // Product approval endpoints
  getPendingProducts: (params?: {
    page?: number;
    limit?: number;
  }): Promise<AxiosResponse<ProductsResponse>> =>
    api.get('/admin/products/pending', { params }),
  
  approveProduct: (id: number): Promise<AxiosResponse<{ message: string; product: Product }>> =>
    api.post(`/admin/products/${id}/approve`),
};

export const ordersAPI = {
  getUserOrders: (): Promise<AxiosResponse<Order[]>> =>
    api.get('/orders'),
  
  getOrder: (id: number): Promise<AxiosResponse<Order>> =>
    api.get(`/orders/${id}`),
  
  createOrder: (data: {
    items: { product_id: number; quantity: number }[];
    shipping_address: Omit<ShippingAddress, 'id' | 'order_id'>;
    payment_method: 'vnpay' | 'cod';
    notes?: string;
  }): Promise<AxiosResponse<Order>> =>
    api.post('/orders', data),
  
  getAllOrders: (): Promise<AxiosResponse<{ orders: Order[]; pagination: { page: number; limit: number; total: number } }>> =>
    api.get('/admin/orders'),
  
  updateOrderStatus: (id: number, status: string): Promise<AxiosResponse<Order>> =>
    api.put(`/admin/orders/${id}/status`, { status }),
};

export const paymentAPI = {
  createVNPayPayment: (orderId: number): Promise<AxiosResponse<{ payment_url: string }>> =>
    api.post('/payments/vnpay/create', { order_id: orderId }),
  
  vnpayReturn: (params: Record<string, string>): Promise<AxiosResponse<{ status: string; message: string }>> =>
    api.get('/payments/vnpay/return', { params }),
};

export const cartAPI = {
  getCart: (): Promise<AxiosResponse<{ cart: Cart; total: number }>> =>
    api.get('/cart'),
  
  addToCart: (productId: number, quantity: number): Promise<AxiosResponse<{ message: string }>> =>
    api.post('/cart/add', { product_id: productId, quantity }),
  
  updateCartItem: (itemId: number, quantity: number): Promise<AxiosResponse<{ message: string }>> =>
    api.put(`/cart/items/${itemId}`, { quantity }),
  
  removeFromCart: (itemId: number): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/cart/items/${itemId}`),
  
  clearCart: (): Promise<AxiosResponse<{ message: string }>> =>
    api.delete('/cart/clear'),
};

export const categoriesAPI = {
  getCategories: (): Promise<AxiosResponse<{ categories: Category[] }>> =>
    api.get('/categories'),
  
  createCategory: (data: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<AxiosResponse<Category>> =>
    api.post('/admin/categories', data),
  
  updateCategory: (id: number, data: Partial<Category>): Promise<AxiosResponse<Category>> =>
    api.put(`/admin/categories/${id}`, data),
  
  deleteCategory: (id: number): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/admin/categories/${id}`),
};

export const partnersAPI = {
  getPartners: (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<AxiosResponse<{ partners: Partner[]; pagination?: { page: number; limit: number; total: number } }>> =>
    api.get('/admin/partners', { params }),
  
  getPartner: (id: number): Promise<AxiosResponse<Partner>> =>
    api.get(`/admin/partners/${id}`),
  
  createPartner: (data: CreatePartnerRequest): Promise<AxiosResponse<Partner>> =>
    api.post('/admin/partners', data),
  
  updatePartner: (id: number, data: UpdatePartnerRequest): Promise<AxiosResponse<Partner>> =>
    api.put(`/admin/partners/${id}`, data),
  
  deletePartner: (id: number): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/admin/partners/${id}`),
  
  togglePartnerStatus: (id: number): Promise<AxiosResponse<Partner>> =>
    api.patch(`/admin/partners/${id}/toggle-status`),
  
  regenerateApiKey: (id: number): Promise<AxiosResponse<{ api_key: string; secret_key: string }>> =>
    api.post(`/admin/partners/${id}/regenerate-keys`),
};

export default api;
