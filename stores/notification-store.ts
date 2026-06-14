// stores/notification-store.ts — Bildirim state management
import { create } from 'zustand'

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  read: boolean
  link?: string
  createdAt: string
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  showPanel: boolean

  addNotification: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
  markRead: (id: string) => void
  markAllRead: () => void
  removeNotification: (id: string) => void
  setShowPanel: (v: boolean) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  showPanel: false,

  addNotification: (n) => set((s) => {
    const notification: Notification = {
      ...n,
      id: crypto.randomUUID(),
      read: false,
      createdAt: new Date().toISOString(),
    }
    const notifications = [notification, ...s.notifications].slice(0, 100)
    return { notifications, unreadCount: s.unreadCount + 1 }
  }),

  markRead: (id) => set((s) => {
    const notifications = s.notifications.map(n => n.id === id ? { ...n, read: true } : n)
    return { notifications, unreadCount: notifications.filter(n => !n.read).length }
  }),

  markAllRead: () => set((s) => ({
    notifications: s.notifications.map(n => ({ ...n, read: true })),
    unreadCount: 0,
  })),

  removeNotification: (id) => set((s) => {
    const notifications = s.notifications.filter(n => n.id !== id)
    return { notifications, unreadCount: notifications.filter(n => !n.read).length }
  }),

  setShowPanel: (showPanel) => set({ showPanel }),
}))
