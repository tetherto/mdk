/**
 * Component-specific prop types
 */

/**
 * Button variant options
 */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'tertiary'
  | 'link'
  | 'nav-link'
  | 'icon'
  | 'outline'
  | 'ghost'

/**
 * Button icon position
 */
export type ButtonIconPosition = 'left' | 'right'

/**
 * Toast/notification variant options
 */
export type NotificationVariant = 'success' | 'error' | 'warning' | 'info'

/**
 * Badge status options
 */
export type BadgeStatus = 'success' | 'processing' | 'error' | 'warning' | 'default'

/**
 * Typography color options (includes muted variant)
 */
export type TypographyColor = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'muted'
