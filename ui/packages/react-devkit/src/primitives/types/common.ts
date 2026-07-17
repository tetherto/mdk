/**
 * Common shared types used across components
 */

/**
 * Standard component size variants
 * Used by Button, Badge, Checkbox, Switch, Radio, Spinner, Indicator, EmptyState, Pagination
 */
export type ComponentSize = 'sm' | 'md' | 'lg'

/**
 * Button-specific size including icon-only variant
 */
export type ButtonSize = ComponentSize | 'icon'

/**
 * Border radius variants
 * Used by Checkbox, Switch, Radio
 */
export type BorderRadius = 'none' | 'small' | 'medium' | 'large' | 'full'

/**
 * Color variants for components
 * Comprehensive set including all semantic colors
 */
export type ColorVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'

/**
 * Status variants for state indication
 * Used for badges, notifications, and status indicators
 */
export type StatusVariant = 'success' | 'processing' | 'error' | 'warning' | 'default' | 'idle'

/**
 * Component color options (subset of ColorVariant)
 * Used by form components like Checkbox, Switch, Radio, Typography
 */
export type ComponentColor = 'default' | 'primary' | 'success' | 'warning' | 'error'

/**
 * Position/side options for UI elements
 * Used by Tooltip, Popover, and chart legends
 */
export type Position = 'top' | 'right' | 'bottom' | 'left'

/**
 * Text alignment options
 * Used by Typography component
 */
export type TextAlign = 'left' | 'center' | 'right' | 'justify'

/**
 * Flex/Grid alignment options
 * Used by Popover, charts, and layout components
 */
export type FlexAlign = 'start' | 'center' | 'end'
