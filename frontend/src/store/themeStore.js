import { create } from 'zustand';
import api from '../services/api';

const applyTheme = (isDark) => {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

export const useThemeStore = create((set, get) => ({
  isDarkMode: true,

  // Apply theme from user data (called after login/checkAuth)
  applyUserTheme: (theme) => {
    const isDark = theme !== 'light';
    applyTheme(isDark);
    set({ isDarkMode: isDark });
  },

  // Toggle theme and sync with server
  toggleTheme: async () => {
    const newMode = !get().isDarkMode;
    applyTheme(newMode);
    set({ isDarkMode: newMode });

    try {
      await api.patch('/users/me/theme', { theme: newMode ? 'dark' : 'light' });
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  },

  // Init theme on page load (before auth, use localStorage fallback)
  initTheme: () => {
    const saved = localStorage.getItem('theme');
    const isDark = saved ? saved === 'dark' : true;
    applyTheme(isDark);
    set({ isDarkMode: isDark });
  }
}));

// Keep localStorage in sync as fallback for initial load
useThemeStore.subscribe((state) => {
  localStorage.setItem('theme', state.isDarkMode ? 'dark' : 'light');
});
