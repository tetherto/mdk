import { forwardRef, type MouseEventHandler, useState } from 'react'
import { cn } from '../../utils'

const icons: Record<AlertType, React.ReactNode> = {
  success: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  info: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
  warning: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  error: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6M9 9l6 6" />
    </svg>
  ),
}

const CloseIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)

export type AlertType = 'success' | 'info' | 'warning' | 'error'

export type AlertProps = {
  /**
   * Controls the color scheme and default icon
   * @default 'info'
   */
  type?: AlertType
  /**
   * ARIA role for the wrapper, which decides whether screen readers announce it.
   * `'alert'` is an assertive live region — it interrupts whatever the reader is saying.
   * Right for a message that appears in response to something the user just did, wrong for
   * a banner that is simply part of the page: that one is re-announced on every mount, so it
   * interrupts on every navigation. `'status'` announces politely; `'none'` renders no live
   * region at all (the attribute is omitted).
   * @default 'alert'
   */
  role?: 'alert' | 'status' | 'none'
  /** Main message */
  title?: React.ReactNode
  /** Secondary/detail content shown below the title */
  description?: React.ReactNode
  /**
   * Renders the type icon (or the `icon` override) before the content
   * @default false
   */
  showIcon?: boolean
  /** Custom icon (used when showIcon is true) */
  icon?: React.ReactNode
  /**
   * Shows an ✕ button; clicking it hides the alert
   * @default false
   */
  closable?: boolean
  /** Called when close button is clicked */
  onClose?: React.MouseEventHandler<HTMLButtonElement>
  /**
   * Display as full-width banner (no border radius, no margin)
   * @default false
   */
  banner?: boolean
  /** Action element rendered to the right */
  action?: React.ReactNode
  /** Custom className */
  className?: string
  /** Custom styles */
  style?: React.CSSProperties
}

/**
 * Inline alert banner with type-based icon, optional description, dismissible
 * close button, and trailing action slot.
 *
 * Announced assertively by default, which suits a message that appears in
 * response to something the user just did. A banner that is simply part of the
 * page should pass `role` to say so — see the prop's docs.
 *
 * @category feedback
 *
 * @example
 * ```tsx
 * <Alert type="warning" title="Connection lost" showIcon closable />
 * ```
 * @domain generic
 * @tier agent-ready
 */
const Alert = forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      type = 'info',
      role = 'alert',
      title,
      description,
      showIcon = false,
      icon,
      closable = false,
      onClose,
      banner = false,
      action,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const [closed, setClosed] = useState(false)

    const handleClose: MouseEventHandler<HTMLButtonElement> = (e) => {
      setClosed(true)
      onClose?.(e)
    }

    if (closed) return null

    return (
      <div
        ref={ref}
        role={role === 'none' ? undefined : role}
        aria-live={role === 'none' ? undefined : role === 'status' ? 'polite' : 'assertive'}
        className={cn(
          'mdk-alert',
          `mdk-alert--${type}`,
          banner && 'mdk-alert--banner',
          description && 'mdk-alert--with-description',
          className,
        )}
        // oxlint-disable-next-line react/forbid-dom-props -- forwards the consumer's style prop
        style={style}
        {...props}
      >
        {showIcon && <span className="mdk-alert__icon">{icon ?? icons[type]}</span>}

        <div className="mdk-alert__content">
          {title && <div className="mdk-alert__title">{title}</div>}
          {description && <div className="mdk-alert__description">{description}</div>}
        </div>

        {action && <div className="mdk-alert__action">{action}</div>}

        {closable && (
          <button
            type="button"
            className="mdk-alert__close"
            onClick={handleClose}
            aria-label="close"
          >
            <CloseIcon />
          </button>
        )}
      </div>
    )
  },
)

Alert.displayName = 'Alert'

export { Alert }
