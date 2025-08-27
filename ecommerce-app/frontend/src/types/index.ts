export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
  avatar_url?: string;
  role: 'user' | 'admin';
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  image_url?: string;
  parent_id?: number;
  parent?: Category;
  children?: Category[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  products?: Product[];
}

export interface ProductImage {
  id: number;
  product_id: number;
  image_url: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order: number;
}

export interface ProductReview {
  id: number;
  product_id: number;
  user_id: number;
  user?: User;
  rating: number;
  title?: string;
  comment?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  price: number;
  sale_price?: number;
  sku?: string;
  stock: number;
  min_stock?: number;
  weight?: number;
  dimensions?: string;
  image_url: string;
  images?: ProductImage[];
  category_id?: number;
  category?: Category;
  brand?: string;
  tags?: string;
  is_featured: boolean;
  is_active: boolean;
  view_count?: number;
  rating?: number;
  review_count?: number;
  reviews?: ProductReview[];
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: number;
  cart_id: number;
  product_id: number;
  product: Product;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Cart {
  id: number;
  user_id: number;
  items: CartItem[];
  total: number;
  created_at: string;
  updated_at: string;
}

export interface ShippingAddress {
  id?: number;
  order_id?: number;
  first_name: string;
  last_name: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  phone?: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Payment {
  id: number;
  order_id: number;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  transaction_id?: string;
  gateway_response?: string;
  processed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: number;
  order_number: string;
  user_id: number;
  user?: User;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method?: string;
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
  discount_amount: number;
  total: number;
  currency: string;
  notes?: string;
  shipping_address?: ShippingAddress;
  items: OrderItem[];
  payments?: Payment[];
  order_date: string;
  shipped_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
}

export interface GoogleLoginRequest {
  id_token: string;
}

export interface GoogleLoginResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface UpdateProfileRequest {
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  postal_code?: string;
}

export interface CreateOrderRequest {
  items: { product_id: number; quantity: number }[];
  shipping_address: Omit<ShippingAddress, 'id' | 'order_id'>;
  payment_method: 'vnpay' | 'cod';
  notes?: string;
}

export interface PaymentProvider {
  id: 'vnpay' | 'cod';
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
}

export interface ProductFilters {
  category?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  brand?: string;
  featured?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface ProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface Partner {
  id: number;
  name: string;
  email: string;
  api_key: string;
  webhook_url?: string;
  is_active: boolean;
  commission_rate: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePartnerRequest {
  name: string;
  email: string;
  webhook_url?: string;
  commission_rate?: number;
}

export interface UpdatePartnerRequest {
  name?: string;
  email?: string;
  webhook_url?: string;
  commission_rate?: number;
  is_active?: boolean;
}

export interface ApiError {
  error: string;
}
