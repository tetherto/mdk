// hooks/useNotification/useNotification.tsx
import type { ToastPosition, ToastVariant } from '@tetherto/mdk-core-ui'
import * as React from 'react'
import { useDispatch } from 'react-redux'
import { decrement, increment } from '../state/slices/notification-slice'
import { addToast } from '../utils/notification-utils'

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
 * Custom hook for showing notifications with Redux integration.
 * Uses @tetherto/mdk-core-ui Toast and Toaster components.
 *
 * @example
 * ```tsx
 * const { notifySuccess, notifyError } = useNotification()
 *
 * notifySuccess('Success', 'Your changes were saved.')
 * notifyError('Error', 'Something went wrong.', { dontClose: true })
 * ```
 */
export const useNotification = (): {
  notifySuccess: (message: string, description?: string, options?: NotificationOptions) => void
  notifyError: (message: string, description?: string, options?: NotificationOptions) => void
  notifyInfo: (message: string, description?: string, options?: NotificationOptions) => void
  notifyWarning: (message: string, description?: string, options?: NotificationOptions) => void
} => {
  const dispatch = useDispatch()

  const notify = React.useCallback(
    (
      variant: ToastVariant,
      message: string,
      description?: string,
      options?: NotificationOptions,
    ) => {
      dispatch(increment())

      const duration = options?.dontClose ? 0 : (options?.duration ?? 3000)

      addToast({
        variant,
        title: message,
        description,
        duration,
        position: options?.position ?? 'top-left',
        onClose() {
          dispatch(decrement())
        },
      })
    },
    [dispatch],
  )

  const notifySuccess = React.useCallback(
    (message: string, description?: string, options?: NotificationOptions) => {
      notify('success', message, description, options)
    },
    [notify],
  )

  const notifyError = React.useCallback(
    (message: string, description?: string, options?: NotificationOptions) => {
      notify('error', message, description, options)
    },
    [notify],
  )

  const notifyInfo = React.useCallback(
    (message: string, description?: string, options?: NotificationOptions) => {
      notify('info', message, description, options)
    },
    [notify],
  )

  const notifyWarning = React.useCallback(
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
