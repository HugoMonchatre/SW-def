import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

axios.defaults.withCredentials = true;

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

      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      set({
        user: response.data.user,
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
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      localStorage.setItem('token', response.data.token);

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
      const response = await axios.post(`${API_URL}/auth/register`, {
        name,
        email,
        password
      });

      localStorage.setItem('token', response.data.token);

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
      const token = localStorage.getItem('token');
      if (token) {
        await axios.post(`${API_URL}/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      set({ user: null, isAuthenticated: false, error: null });
    }
  },

  clearError: () => set({ error: null })
}));
