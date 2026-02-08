import { create } from 'zustand';
import api from '../services/api';
import { useThemeStore } from './themeStore';

export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  checkAuth: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        set({ isAuthenticated: false, user: null });
        return;
      }

      const response = await api.get('/auth/me');
      const user = response.data.user;

      if (user?.theme) {
        useThemeStore.getState().applyUserTheme(user.theme);
      }

      set({
        user,
        isAuthenticated: true,
        error: null
      });
    } catch (error) {
      localStorage.removeItem('token');
      set({ isAuthenticated: false, user: null });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', {
        email,
        password
      });

      localStorage.setItem('token', response.data.token);

      if (response.data.user?.theme) {
        useThemeStore.getState().applyUserTheme(response.data.user.theme);
      }

      set({
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      return true;
    } catch (error) {
      set({
        error: error.response?.data?.error || 'Login failed',
        isLoading: false
      });
      return false;
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/register', {
        name,
        email,
        password
      });

      localStorage.setItem('token', response.data.token);

      if (response.data.user?.theme) {
        useThemeStore.getState().applyUserTheme(response.data.user.theme);
      }

      set({
        user: response.data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      return true;
    } catch (error) {
      set({
        error: error.response?.data?.error || 'Registration failed',
        isLoading: false
      });
      return false;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      set({ user: null, isAuthenticated: false, error: null });
    }
  },

  setUser: (user) => set({ user }),

  clearError: () => set({ error: null })
}));
