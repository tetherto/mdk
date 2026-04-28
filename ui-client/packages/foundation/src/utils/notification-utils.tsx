// services/notificationService.ts
import type { ToastPosition, ToastVariant } from '@tetherto/core'
import { Toast, Toaster } from '@tetherto/core'
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { store } from '../state'
import { decrement, increment } from '../state/slices/notification-slice'

const TOAST_DURATION = 3_000
/**
 * This service uses static notification API which cannot consume React context.
 * For React components and hooks, use the `useNotification` hook instead.
 * This service is kept only for utility functions that cannot use React hooks.
 */

type ToastItem = {
  id: string
  title: string
  duration: number
  description?: string
  variant: ToastVariant
  onClose: VoidFunction
  position: ToastPosition
}

// Global toast container management
let toastContainer: HTMLDivElement | null = null
let toastRoot: ReturnType<typeof createRoot> | null = null
let toasts: ToastItem[] = []
let setToastsCallback: ((toasts: ToastItem[]) => void) | null = null

const getToastContainer = (): HTMLDivElement => {
  if (!toastContainer) {
    toastContainer = document.createElement('div')
    toastContainer.id = 'notification-service-container'
    document.body.appendChild(toastContainer)
  }
  return toastContainer
}

const ToastContainer = ({
  position = 'top-left',
}: {
  position?: ToastPosition
}): React.ReactElement => {
  const [currentToasts, setCurrentToasts] = React.useState<ToastItem[]>(toasts)

  React.useEffect(() => {
    setToastsCallback = setCurrentToasts
    return () => {
      setToastsCallback = null
    }
  }, [])

  const removeToast = (id: string): void => {
    toasts = toasts.filter((toast) => toast.id !== id)
    setToastsCallback?.(toasts)
  }

  return (
    <Toaster position={position}>
      {currentToasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.variant}
          title={toast.title}
          description={toast.description}
          duration={toast.duration}
          onOpenChange={(open) => {
            if (!open) {
              removeToast(toast.id)
              toast.onClose()
            }
          }}
        />
      ))}
    </Toaster>
  )
}

export const addToast = (toast: Omit<ToastItem, 'id'>): void => {
  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  const newToast = { ...toast, id }

  toasts = [...toasts, newToast]

  // Initialize container on first toast
  if (!toastRoot) {
    const container = getToastContainer()
    toastRoot = createRoot(container)
  }

  toastRoot.render(<ToastContainer position={toast.position} />)
  setToastsCallback?.(toasts)
}

const openNotification = (
  variant: ToastVariant,
  message: string,
  description: string,
  duration: number,
  position: ToastPosition,
): void => {
  store.dispatch(increment())

  addToast({
    variant,
    title: message,
    duration,
    description,
    position,
    onClose() {
      store.dispatch(decrement())
    },
  })
}

export const notifySuccess = (message: string, description: string): void => {
  openNotification('success', message, description, TOAST_DURATION, 'top-left')
}

export const notifyError = (message: string, description: string, dontClose?: boolean): void => {
  openNotification('error', message, description, dontClose ? 0 : TOAST_DURATION, 'top-left')
}

export const notifyInfo = (message: string, description: string): void => {
  openNotification('info', message, description, TOAST_DURATION, 'top-left')
}

export const notifyWarning = (message: string, description: string): void => {
  openNotification('warning', message, description, TOAST_DURATION, 'top-left')
}
