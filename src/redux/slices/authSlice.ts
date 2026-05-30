import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  isAuthenticated: boolean;
}

const clearBusinessSettingsShown = (): void => {
  localStorage.removeItem('businessSettingsShown');
};

// Load initial state from localStorage
const loadAuthFromStorage = (): boolean => {
  return localStorage.getItem('isAuthenticated') === 'true';
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
      localStorage.setItem('isAuthenticated', 'true');
    },
    logout: (state) => {
      state.isAuthenticated = false;
      clearBusinessSettingsShown();
      localStorage.removeItem('isAuthenticated');
    },
  },
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;

