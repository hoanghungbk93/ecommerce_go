import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { ShippingAddress, Order, PaymentProvider } from '../../types';
import { ordersAPI, paymentAPI } from '../../services/api';

interface CheckoutState {
  shippingAddress: Omit<ShippingAddress, 'id' | 'order_id'> | null;
  paymentMethod: 'vnpay' | 'cod' | null;
  notes: string;
  isLoading: boolean;
  error: string | null;
  currentOrder: Order | null;
}

const initialState: CheckoutState = {
  shippingAddress: null,
  paymentMethod: 'cod',
  notes: '',
  isLoading: false,
  error: null,
  currentOrder: null,
};

export const paymentProviders: PaymentProvider[] = [
  {
    id: 'cod',
    name: 'Cash on Delivery',
    description: 'Pay when you receive your order',
    icon: '💵',
    enabled: true,
  },
  {
    id: 'vnpay',
    name: 'VNPay',
    description: 'Pay online with VNPay gateway',
    icon: '💳',
    enabled: false,
  },
];

export const createOrder = createAsyncThunk(
  'checkout/createOrder',
  async (orderData: {
    items: { product_id: number; quantity: number }[];
    shipping_address: Omit<ShippingAddress, 'id' | 'order_id'>;
    payment_method: 'vnpay' | 'cod';
    notes?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await ordersAPI.createOrder(orderData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create order');
    }
  }
);

export const processVNPayPayment = createAsyncThunk(
  'checkout/processVNPayPayment',
  async (orderId: number, { rejectWithValue }) => {
    try {
      const response = await paymentAPI.createVNPayPayment(orderId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to process payment');
    }
  }
);

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    setShippingAddress: (state, action: PayloadAction<Omit<ShippingAddress, 'id' | 'order_id'>>) => {
      state.shippingAddress = action.payload;
    },
    setPaymentMethod: (state, action: PayloadAction<'vnpay' | 'cod'>) => {
      state.paymentMethod = action.payload;
    },
    setNotes: (state, action: PayloadAction<string>) => {
      state.notes = action.payload;
    },
    clearCheckout: (state) => {
      state.shippingAddress = null;
      state.paymentMethod = 'cod';
      state.notes = '';
      state.error = null;
      state.currentOrder = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createOrder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentOrder = action.payload;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(processVNPayPayment.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(processVNPayPayment.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(processVNPayPayment.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setShippingAddress,
  setPaymentMethod,
  setNotes,
  clearCheckout,
  clearError,
} = checkoutSlice.actions;

export default checkoutSlice.reducer;
