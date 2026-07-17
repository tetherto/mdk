import { createStore } from 'zustand/vanilla'

export type NotificationState = {
  count: number
}

export type NotificationActions = {
  increment: () => void
  decrement: () => void
  reset: () => void
}

export type NotificationStore = NotificationState & NotificationActions

const initialState: NotificationState = { count: 0 }

/**
 * Factory for an isolated `notificationStore`. Tests and SSR should use
 * this; runtime code should bind to the singleton {@link notificationStore}.
 *
 * @category notifications
 */
export const createNotificationStore = () =>
  createStore<NotificationStore>((set) => ({
    ...initialState,
    increment: () => set((s) => ({ count: s.count + 1 })),
    decrement: () => set((s) => ({ count: Math.max(0, s.count - 1) })),
    reset: () => set({ count: 0 }),
  }))

/**
 * Module-level singleton exposing the unread-notification counter that
 * drives header badges and the toast viewport. Increment/decrement from
 * anywhere; React subscribers re-render automatically.
 *
 * @category notifications
 */
export const notificationStore = createNotificationStore()
