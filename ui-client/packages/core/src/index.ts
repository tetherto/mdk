/**
 * @tetherto/core - Core UI components, utilities, types, and theme system
 *
 * This package provides the foundation for all other packages in the monorepo.
 */

// Styled components
export * from './components/accordion'
export * from './components/action-button'
export { Alert as CoreAlert } from './components/alert'
export * from './components/alert-dialog'

// Chart components
export * from './components/area-chart'
export * from './components/avatar'
// Re-export Radix primitives with namespaces to avoid conflicts
export * from './components/badge'
export * from './components/bar-chart'

export * from './components/breadcrumbs'

export * from './components/button'
export * from './components/card'
export * from './components/cascader'
export * from './components/chart-container'
export * from './components/chart-stats-footer'
export * from './components/checkbox'
export * from './components/currency-toggler'
export * from './components/data-table'
// Date picker components
export * from './components/date-picker'
export * from './components/detail-legend'
export * from './components/dialog'
export * from './components/divider'
export * from './components/doughnut-chart'
export * as DropdownMenu from './components/dropdown-menu'
export * from './components/empty-state'
export * from './components/error-boundary'
export * from './components/error-card'
export * from './components/form'
export * from './components/gauge-chart'
// Mining-specific icons
export * from './components/icons'
export * from './components/indicator'
export * from './components/input'
export * from './components/label'
export * from './components/labeled-card'
export * from './components/lazy-tab-wrapper'
export * from './components/line-chart'
export * from './components/list-view-filter'
export * from './components/loader'
export * from './components/logs/activity-log-icon'
export * from './components/logs/constants'
export * from './components/logs/log-dot'
export * from './components/logs/log-item'
export * from './components/logs/log-row'
export * from './components/logs/logs-card'
export * from './components/logs/types'
export * from './components/mosaic'
export * from './components/not-found-page'
export * from './components/pagination'
export * from './components/popover'
export * as Progress from './components/progress'
export * from './components/radio'
export * from './components/select'
export * as Separator from './components/separator'
export * from './components/sidebar'
export * from './components/skeleton'
export * as Slider from './components/slider'
export * from './components/spinner'
export * from './components/switch'
export * from './components/tabs'
export * from './components/tag'
export * from './components/tag-input'
export * from './components/textarea'
export * from './components/toast'
export * from './components/tooltip'
export * from './components/typography'
// Constants (only UI-related)
export * from './constants'
// Theme system
export * from './theme'
// Core types
export * from './types'
// Core utilities
export * from './utils'

export const version = '0.0.0'
