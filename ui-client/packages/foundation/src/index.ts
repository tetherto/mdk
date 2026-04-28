/**
 * @tetherto/mdk-foundation-ui
 *
 * Complete foundation package with features, state management, API client, and utilities.
 */

// Re-export API client
export * from './api'

// Re-export domain components
export * from './components/domain'

// Re-export feature components
export * from './components/feature'

// Re-export index constants (includes app-wide constants)
export * from './constants'

// Re-export constants (business logic)
export * from './constants/actions'

export * from './constants/alerts'

export * from './constants/auth-caps.constants'
export * from './constants/charts'
export * from './constants/constants.types'
export * from './constants/container-constants'
export * from './constants/dates'
export * from './constants/device-constants'
export * from './constants/devices'
export * from './constants/dialog'
export * from './constants/domains'
export * from './constants/errors'
export * from './constants/header-controls.constants'
export * from './constants/inventory-pagination'
export * from './constants/nominal-values'
export * from './constants/permissions.constants'
export * from './constants/platforms'
export * from './constants/polling-interval-constants'
export * from './constants/ranges'
export * from './constants/role-colors.constants'
export * from './constants/routes'
export * from './constants/settings.constants'
export * from './constants/tail-log-stat-keys.constants'
export * from './constants/temperature-constants'
// Re-export hooks
export * from './hooks'
// Re-export state management
export * from './state'
// Re-export types
export * from './types'

// Re-export utils
export * from './utils/settings-utils'

export const version = '0.0.0'
