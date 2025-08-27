import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CartItem, Product } from '../../types';

interface CartState {
  items: CartItem[];
  total: number;
  totalAmount: number;
  totalItems: number;
}

const calculateTotal = (items: CartItem[]): number => {
  return items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
};

const calculateTotalItems = (items: CartItem[]): number => {
  return items.reduce((sum, item) => sum + item.quantity, 0);
};

const initialItems = localStorage.getItem('cart') ? JSON.parse(localStorage.getItem('cart')!) : [];

const initialState: CartState = {
  items: initialItems,
  total: calculateTotal(initialItems),
  totalAmount: calculateTotal(initialItems),
  totalItems: calculateTotalItems(initialItems),
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<{ product: Product; quantity: number }>) => {
      const { product, quantity } = action.payload;
      const existingItem = state.items.find(item => item.product.id === product.id);

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        const newItem: CartItem = {
          id: Date.now(), // temporary ID
          cart_id: 0, // will be set by server
          product_id: product.id,
          product,
          quantity,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        state.items.push(newItem);
      }

      state.total = calculateTotal(state.items);
      state.totalAmount = calculateTotal(state.items);
      state.totalItems = calculateTotalItems(state.items);
      localStorage.setItem('cart', JSON.stringify(state.items));
    },
    removeFromCart: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter(item => item.product.id !== action.payload);
      state.total = calculateTotal(state.items);
      state.totalAmount = calculateTotal(state.items);
      state.totalItems = calculateTotalItems(state.items);
      localStorage.setItem('cart', JSON.stringify(state.items));
    },
    updateQuantity: (state, action: PayloadAction<{ productId: number; quantity: number }>) => {
      const { productId, quantity } = action.payload;
      const item = state.items.find(item => item.product.id === productId);

      if (item) {
        if (quantity <= 0) {
          state.items = state.items.filter(item => item.product.id !== productId);
        } else {
          item.quantity = quantity;
        }
      }

      state.total = calculateTotal(state.items);
      state.totalAmount = calculateTotal(state.items);
      state.totalItems = calculateTotalItems(state.items);
      localStorage.setItem('cart', JSON.stringify(state.items));
    },
    clearCart: (state) => {
      state.items = [];
      state.total = 0;
      state.totalAmount = 0;
      state.totalItems = 0;
      localStorage.removeItem('cart');
    },
  },
});

export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
