import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useThemeStore = create(
  persist(
    (set) => ({
      isDarkMode: false,
      toggleTheme: () => set((state) => {
        const newMode = !state.isDarkMode;
        // Update document class
        if (newMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        return { isDarkMode: newMode };
      }),
      initTheme: () => set((state) => {
        // Apply theme on load
        if (state.isDarkMode) {
          document.documentElement.classList.add('dark');
        }
        return state;
      })
    }),
    {
      name: 'theme-storage'
    }
  )
);
