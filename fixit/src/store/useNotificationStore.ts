import { create } from 'zustand';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  createdAt: Date;
  read: boolean;
  type?: 'booking' | 'system';
}

interface NotificationState {
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [
    {
      id: 'init_welcome',
      title: 'Welcome to FixIt! 🎉',
      body: 'Get ready for premium, transparent home maintenance service at your doorstep.',
      createdAt: new Date(),
      read: false,
      type: 'system'
    }
  ],
  addNotification: (notif) => {
    const newNotif: AppNotification = {
      ...notif,
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      read: false
    };
    set((state) => ({
      notifications: [newNotif, ...state.notifications]
    }));
  },
  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
    }));
  },
  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true }))
    }));
  },
  clearAll: () => {
    set({ notifications: [] });
  },
  getUnreadCount: () => {
    return get().notifications.filter((n) => !n.read).length;
  }
}));
