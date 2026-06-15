import { useNotifications } from '@tetherto/mdk-react-adapter'
import { useCallback } from 'react'

import type { ToastPosition, ToastVariant } from '@core'
import { addToast } from './notification-utils'

export type NotificationOptions = {
  /**
   * Duration in milliseconds (0 = no auto-close)
   * @default 3000
   */
  duration?: number
  /**
   * Toast position on screen
   * @default 'top-left'
   */
  position?: ToastPosition
  /**
   * Prevent auto-close (keeps toast open until manually closed)
   * @default false
   */
  dontClose?: boolean
}

/**
 * Custom hook for showing notifications backed by the headless `notificationStore`.
 * Uses `@tetherto/mdk-react-devkit/core` Toast and Toaster components.
 *
 * @example
 * ```tsx
 * const { notifySuccess, notifyError } = useNotification()
 *
 * notifySuccess('Success', 'Your changes were saved.')
 * notifyError('Error', 'Something went wrong.', { dontClose: true })
 * ```
 * @category feedback
 * @domain generic
 * @tier agent-ready
 */
export const useNotification = (): {
  notifySuccess: (message: string, description?: string, options?: NotificationOptions) => void
  notifyError: (message: string, description?: string, options?: NotificationOptions) => void
  notifyInfo: (message: string, description?: string, options?: NotificationOptions) => void
  notifyWarning: (message: string, description?: string, options?: NotificationOptions) => void
} => {
  const { increment, decrement } = useNotifications()

  const notify = useCallback(
    (
      variant: ToastVariant,
      message: string,
      description?: string,
      options?: NotificationOptions,
    ) => {
      increment()

      const duration = options?.dontClose ? 0 : (options?.duration ?? 3000)

      addToast({
        variant,
        title: message,
        description,
        duration,
        position: options?.position ?? 'top-left',
        onClose() {
          decrement()
        },
      })
    },
    [increment, decrement],
  )

  const notifySuccess = useCallback(
    (message: string, description?: string, options?: NotificationOptions) => {
      notify('success', message, description, options)
    },
    [notify],
  )

  const notifyError = useCallback(
    (message: string, description?: string, options?: NotificationOptions) => {
      notify('error', message, description, options)
    },
    [notify],
  )

  const notifyInfo = useCallback(
    (message: string, description?: string, options?: NotificationOptions) => {
      notify('info', message, description, options)
    },
    [notify],
  )

  const notifyWarning = useCallback(
    (message: string, description?: string, options?: NotificationOptions) => {
      notify('warning', message, description, options)
    },
    [notify],
  )

  return {
    notifySuccess,
    notifyError,
    notifyInfo,
    notifyWarning,
  }
}
