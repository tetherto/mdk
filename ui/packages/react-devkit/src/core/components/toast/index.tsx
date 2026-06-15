import * as ToastPrimitives from '@radix-ui/react-toast'

import type { NotificationVariant } from '../../types'
import { cn } from '../../utils'
import { type ComponentPropsWithoutRef, forwardRef, type JSX, type ReactNode } from 'react'

// TODO Update this to use the correct icons
const TOAST_ICON_MAP = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
} as const

type ToastRootProps = ComponentPropsWithoutRef<typeof ToastPrimitives.Root>
type ToastProviderProps = ComponentPropsWithoutRef<typeof ToastPrimitives.Provider>
type ToastViewportProps = ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>

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
  icon?: JSX.Element
}

/**
 * Single transient notification rendered inside the `<Toaster>` viewport.
 * Use `variant` to convey intent (`default`, `success`, `error`, `warning`,
 * `info`); pair with `<ToastTitle>` and `<ToastDescription>` for structured
 * content, or wrap a `<ToastAction>` for a single inline call-to-action. Most
 * apps will trigger toasts imperatively via the `useToast` hook rather than
 * mounting `<Toast>` directly.
 *
 * @category feedback
 * @domain generic
 * @tier agent-ready
 */
export const Toast = forwardRef<HTMLLIElement, ToastProps>(
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

/**
 * Headless provider that hosts the toast state machine — wrap your app with this plus a `<Toaster>` viewport.
 *
 * @category feedback
 * @domain generic
 * @tier internal
 */
export const ToastProvider = (props: ToastProviderProps): JSX.Element => (
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
 * @category feedback
 * @domain generic
 * @tier internal
 */
export const ToastViewport = ({
  className,
  position = 'top-left',
  ...props
}: ToastViewportPropsExtended): JSX.Element => (
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
  children: ReactNode
  position?: ToastPosition
}

/**
 * Top-level provider + viewport that hosts every toast triggered via
 * `useToast`. Mount once near the root of your app (typically inside
 * `<MdkProvider>`). Without a `<Toaster>` in the tree, `useToast` calls are
 * no-ops. Position and visual stacking are controlled by CSS tokens; no props
 * are required for the default bottom-right placement.
 *
 * @category feedback
 * @domain generic
 * @tier agent-ready
 */
export const Toaster = ({
  children,
  position = 'top-left',
  ...props
}: ToasterProps): JSX.Element => (
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
