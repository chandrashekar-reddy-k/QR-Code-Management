import { createSlice } from '@reduxjs/toolkit';

interface AuthState {
  isAuthenticated: boolean;
}

const clearBusinessSettingsShown = (): void => {
  localStorage.removeItem('businessSettingsShown');
};

// Load initial state from localStorage
const loadAuthFromStorage = (): boolean => {
  return localStorage.getItem('partnerIsAuthenticated') === 'true';
};

const initialState: AuthState = {
  isAuthenticated: loadAuthFromStorage(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state) => {
      state.isAuthenticated = true;
      clearBusinessSettingsShown();
      localStorage.setItem('partnerIsAuthenticated', 'true');
    },
    logout: (state) => {
      state.isAuthenticated = false;
      clearBusinessSettingsShown();
      localStorage.removeItem('partnerIsAuthenticated');
      localStorage.removeItem('partnerToken');
      localStorage.removeItem('partnerRefreshToken');
      localStorage.removeItem('partnerUser');
      localStorage.removeItem('partnerRole');
      localStorage.removeItem('partnerWarehouseId');
    },
  },
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;

