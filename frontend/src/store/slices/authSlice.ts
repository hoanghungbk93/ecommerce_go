import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, LoginRequest, RegisterRequest, GoogleLoginRequest, AuthResponse, GoogleLoginResponse } from '../../types';
import { authAPI } from '../../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(userData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Registration failed');
    }
  }
);

export const googleLogin = createAsyncThunk(
  'auth/googleLogin',
  async (googleData: GoogleLoginRequest, { rejectWithValue }) => {
    try {
      const response = await authAPI.googleLogin(googleData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Google login failed');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await authAPI.logout(refreshToken);
      }
      return null;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Logout failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
        
        localStorage.setItem('access_token', action.payload.access_token);
        localStorage.setItem('refresh_token', action.payload.refresh_token);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
        
        localStorage.setItem('access_token', action.payload.access_token);
        localStorage.setItem('refresh_token', action.payload.refresh_token);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
      })
      .addCase(googleLogin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(googleLogin.fulfilled, (state, action: PayloadAction<GoogleLoginResponse>) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.error = null;
        
        localStorage.setItem('access_token', action.payload.access_token);
        localStorage.setItem('refresh_token', action.payload.refresh_token);
        localStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.user = null;
      })
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
        
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
      });
  },
});

export const { clearError, setUser } = authSlice.actions;
export default authSlice.reducer;
