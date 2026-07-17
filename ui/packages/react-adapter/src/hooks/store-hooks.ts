import {
  actionsStore,
  type ActionsStore,
  authStore,
  type AuthStore,
  devicesStore,
  type DevicesStore,
  notificationStore,
  type NotificationStore,
  timezoneStore,
  type TimezoneStore,
} from '@tetherto/mdk-ui-foundation'
import { useStore } from 'zustand'

/**
 * React-bound view of the headless `authStore`.
 * Equivalent of `useStore(authStore)` — exposed as a hook for ergonomic callsites.
 *
 * @category store
 */
export const useAuth = (): AuthStore => useStore(authStore)

/**
 * React-bound view of the headless `devicesStore` (miners, containers, PDUs).
 * @category store
 */
export const useDevices = (): DevicesStore => useStore(devicesStore)

/**
 * React-bound view of the headless `notificationStore` (toast queue + history).
 * @category store
 */
export const useNotifications = (): NotificationStore => useStore(notificationStore)

/**
 * React-bound view of the headless `timezoneStore` (selected IANA zone).
 * @category store
 */
export const useTimezone = (): TimezoneStore => useStore(timezoneStore)

/**
 * React-bound view of the headless `actionsStore` (command queue + lifecycle).
 * @category store
 */
export const useActions = (): ActionsStore => useStore(actionsStore)
