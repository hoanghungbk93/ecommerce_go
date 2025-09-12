import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  loading: boolean;
  sidebarOpen: boolean;
  mobileMenuOpen: boolean;
  notifications: Notification[];
  theme: 'light' | 'dark';
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

const initialState: UIState = {
  loading: false,
  sidebarOpen: false,
  mobileMenuOpen: false,
  notifications: [],
  theme: 'light',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleMobileMenu: (state) => {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },
    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileMenuOpen = action.payload;
    },
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
      };
      state.notifications.push(notification);
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (notification) => notification.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },
  },
});

export const {
  setLoading,
  toggleSidebar,
  setSidebarOpen,
  toggleMobileMenu,
  setMobileMenuOpen,
  addNotification,
  removeNotification,
  clearNotifications,
  setTheme,
  toggleTheme,
} = uiSlice.actions;

export default uiSlice.reducer;
