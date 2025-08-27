import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Partner, CreatePartnerRequest, UpdatePartnerRequest } from '../../types';
import { partnersAPI } from '../../services/api';

export interface PartnersState {
  partners: Partner[];
  selectedPartner: Partner | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

const initialState: PartnersState = {
  partners: [],
  selectedPartner: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
  },
};

// Async Thunks
export const fetchPartners = createAsyncThunk(
  'partners/fetchPartners',
  async (params: { page?: number; limit?: number; search?: string } = {}, { rejectWithValue }) => {
    try {
      const response = await partnersAPI.getPartners(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch partners');
    }
  }
);

export const fetchPartnerById = createAsyncThunk(
  'partners/fetchPartnerById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await partnersAPI.getPartner(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch partner');
    }
  }
);

export const createPartner = createAsyncThunk(
  'partners/createPartner',
  async (partnerData: CreatePartnerRequest, { rejectWithValue }) => {
    try {
      const response = await partnersAPI.createPartner(partnerData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create partner');
    }
  }
);

export const updatePartner = createAsyncThunk(
  'partners/updatePartner',
  async ({ id, data }: { id: number; data: UpdatePartnerRequest }, { rejectWithValue }) => {
    try {
      const response = await partnersAPI.updatePartner(id, data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update partner');
    }
  }
);

export const deletePartner = createAsyncThunk(
  'partners/deletePartner',
  async (id: number, { rejectWithValue }) => {
    try {
      await partnersAPI.deletePartner(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete partner');
    }
  }
);

export const togglePartnerStatus = createAsyncThunk(
  'partners/togglePartnerStatus',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await partnersAPI.togglePartnerStatus(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to toggle partner status');
    }
  }
);

export const regenerateApiKeys = createAsyncThunk(
  'partners/regenerateApiKeys',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await partnersAPI.regenerateApiKey(id);
      return { id, keys: response.data };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to regenerate API keys');
    }
  }
);

const partnersSlice = createSlice({
  name: 'partners',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedPartner: (state, action: PayloadAction<Partner | null>) => {
      state.selectedPartner = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Partners
      .addCase(fetchPartners.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPartners.fulfilled, (state, action) => {
        state.isLoading = false;
        state.partners = action.payload.partners;
        if (action.payload.pagination) {
          state.pagination = action.payload.pagination;
        }
      })
      .addCase(fetchPartners.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Fetch Partner by ID
      .addCase(fetchPartnerById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPartnerById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedPartner = action.payload;
      })
      .addCase(fetchPartnerById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Create Partner
      .addCase(createPartner.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createPartner.fulfilled, (state, action) => {
        state.isLoading = false;
        state.partners.push(action.payload);
      })
      .addCase(createPartner.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Update Partner
      .addCase(updatePartner.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updatePartner.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.partners.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.partners[index] = action.payload;
        }
        if (state.selectedPartner?.id === action.payload.id) {
          state.selectedPartner = action.payload;
        }
      })
      .addCase(updatePartner.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Delete Partner
      .addCase(deletePartner.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deletePartner.fulfilled, (state, action) => {
        state.isLoading = false;
        state.partners = state.partners.filter(p => p.id !== action.payload);
        if (state.selectedPartner?.id === action.payload) {
          state.selectedPartner = null;
        }
      })
      .addCase(deletePartner.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Toggle Partner Status
      .addCase(togglePartnerStatus.fulfilled, (state, action) => {
        const index = state.partners.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.partners[index] = action.payload;
        }
        if (state.selectedPartner?.id === action.payload.id) {
          state.selectedPartner = action.payload;
        }
      })

      // Regenerate API Keys
      .addCase(regenerateApiKeys.fulfilled, (state, action) => {
        const index = state.partners.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.partners[index].api_key = action.payload.keys.api_key;
        }
        if (state.selectedPartner?.id === action.payload.id) {
          state.selectedPartner.api_key = action.payload.keys.api_key;
        }
      });
  },
});

export const { clearError, setSelectedPartner } = partnersSlice.actions;

export default partnersSlice.reducer;
