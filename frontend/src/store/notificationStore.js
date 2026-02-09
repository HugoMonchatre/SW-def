import { create } from 'zustand';
import api from '../services/api';

export const useNotificationStore = create((set, get) => ({
  unreadCount: 0,

  // Fetch unread count from API
  fetchUnreadCount: async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      set({ unreadCount: response.data.count });
    } catch (error) {
      console.error('Erreur lors du chargement du compteur de notifications:', error);
    }
  },

  // Decrement unread count (when marking as read)
  decrementUnreadCount: () => {
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) }));
  },

  // Reset unread count to 0 (when marking all as read)
  resetUnreadCount: () => {
    set({ unreadCount: 0 });
  }
}));
