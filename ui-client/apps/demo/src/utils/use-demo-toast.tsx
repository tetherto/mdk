import { useCallback, useState } from 'react'

import type { ToastVariant } from '@tetherto/core'
import { Toast, Toaster } from '@tetherto/core'

type DemoToastItem = {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

type ShowToastOptions = {
  description?: string
  variant?: ToastVariant
}

/**
 * Demo-only helper that replaces native `alert()` calls with a non-blocking
 * MDK `Toast`. Exposes an imperative `showToast(message, options?)` and a
 * `ToasterSlot` component that must be rendered once per page.
 *
 * @example
 * ```tsx
 * const { showToast, ToasterSlot } = useDemoToast()
 * return (
 *   <>
 *     <Button onClick={() => showToast('Saved!', { variant: 'success' })}>Save</Button>
 *     <ToasterSlot />
 *   </>
 * )
 * ```
 */
export const useDemoToast = () => {
  const [toasts, setToasts] = useState<DemoToastItem[]>([])

  const showToast = useCallback((title: string, options: ShowToastOptions = {}) => {
    const { description, variant = 'info' } = options
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `toast-${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, title, description, variant }])
  }, [])

  const ToasterSlot = useCallback(
    () => (
      <Toaster position="top-right">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            title={toast.title}
            description={toast.description}
            variant={toast.variant}
            onOpenChange={(open) => {
              if (!open) {
                setToasts((prev) => prev.filter((item) => item.id !== toast.id))
              }
            }}
          />
        ))}
      </Toaster>
    ),
    [toasts],
  )

  return { showToast, ToasterSlot }
}
