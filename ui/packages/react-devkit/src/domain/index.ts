/**
 * @tetherto/mdk-react-devkit — domain barrel
 *
 * Mining-domain UI components, presentation-bound hooks, and shared
 * constants/types. Imported via the `./domain` subpath export.
 *
 * Stateful hooks and pure-TS utilities live in `@tetherto/mdk-react-adapter`
 * and `@tetherto/mdk-ui-foundation` respectively.
 */

export * from './components'

export * from './constants'

export * from './constants/actions'

export * from './constants/alerts'
export * from './constants/charts'
export * from './constants/constants.types'
export * from './constants/container-constants'
export * from './constants/dates'
export * from './constants/device-constants'
export * from './constants/devices'
export * from './constants/header-controls.constants'
export * from './constants/ranges'
export * from './constants/role-colors.constants'
export * from './constants/settings.constants'

export * from './types'

export { useChartDataCheck } from './utils/chart-data-check'
export { getContainerName } from './utils/container-utils'
export { formatPowerConsumption, getHashrateString, getHashrateUnit } from './utils/device-utils'
export type { NotificationOptions } from './utils/use-notification'
export { useNotification } from './utils/use-notification'

export const version = '0.0.0'
