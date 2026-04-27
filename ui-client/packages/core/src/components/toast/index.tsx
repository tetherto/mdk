import * as ToastPrimitives from '@radix-ui/react-toast'
import * as React from 'react'

import type { NotificationVariant } from '../../types'
import { cn } from '../../utils'

// TODO Update this to use the correct icons
const TOAST_ICON_MAP = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
} as const

type ToastRootProps = React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root>
type ToastProviderProps = React.ComponentPropsWithoutRef<typeof ToastPrimitives.Provider>
type ToastViewportProps = React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>

type ToastVariant = NotificationVariant
type ToastPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-center'
  | 'bottom-center'

const TOAST_POSITIONS: ToastPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
]

type ToastProps = ToastRootProps & {
  title: string
  description?: string
  variant?: ToastVariant
  icon?: React.JSX.Element
}

export const Toast = React.forwardRef<HTMLLIElement, ToastProps>(
  ({ title, description, variant = 'info', icon, className, ...props }, ref) => {
    const iconContent = icon ?? TOAST_ICON_MAP[variant]

    return (
      <ToastPrimitives.Root ref={ref} className={cn('mdk_toast', className)} {...props}>
        <div className="mdk_toast__header">
          <div className="mdk_toast__variant">{iconContent}</div>
          <div className="mdk_toast__header-content">
            <ToastPrimitives.Title className="mdk_toast__title">{title}</ToastPrimitives.Title>
            {/* // TODO Update this to use the correct icon */}
            <ToastPrimitives.Close className="mdk_toast__close">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M4.8 4.79999L11.2 11.2M4.8 11.2L11.2 4.79999"
                  stroke="white"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </ToastPrimitives.Close>
          </div>
        </div>

        {description && (
          <div className="mdk_toast__body">
            <ToastPrimitives.Description className="mdk_toast__description">
              {description}
            </ToastPrimitives.Description>
          </div>
        )}
      </ToastPrimitives.Root>
    )
  },
)

Toast.displayName = 'Toast'

export const ToastProvider = (props: ToastProviderProps): React.JSX.Element => (
  <ToastPrimitives.Provider {...props} />
)

ToastProvider.displayName = 'ToastProvider'

type ToastViewportPropsExtended = ToastViewportProps & {
  position?: ToastPosition
}

/**
 * ToastViewport - Container for rendering toasts
 *
 * @example
 * ```tsx
 * <ToastProvider>
 *   <Toast title="Hello" />
 *   <ToastViewport position="bottom-right" />
 * </ToastProvider>
 * ```
 */
export const ToastViewport = ({
  className,
  position = 'top-left',
  ...props
}: ToastViewportPropsExtended): React.JSX.Element => (
  <ToastPrimitives.Viewport
    className={cn('mdk_toast__viewport', `mdk_toast__viewport--${position}`, className)}
    {...props}
  />
)

ToastViewport.displayName = 'ToastViewport'

/**
 * Toaster - A convenience wrapper that includes Provider and Viewport
 *
 * @example
 * ```tsx
 * <Toaster position="bottom-right">
 *   <Toast title="Success" description="Your changes were saved." variant="success" />
 * </Toaster>
 * ```
 */
type ToasterProps = ToastProviderProps & {
  children: React.ReactNode
  position?: ToastPosition
}

export const Toaster = ({
  children,
  position = 'top-left',
  ...props
}: ToasterProps): React.JSX.Element => (
  <ToastPrimitives.Provider {...props}>
    {children}
    <ToastPrimitives.Viewport
      className={cn('mdk_toast__viewport', `mdk_toast__viewport--${position}`)}
    />
  </ToastPrimitives.Provider>
)

Toaster.displayName = 'Toaster'

export { TOAST_POSITIONS }
export type { ToastPosition, ToastVariant }
