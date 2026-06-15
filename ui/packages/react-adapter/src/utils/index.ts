/**
 * React-aware utilities exposed by `@tetherto/mdk-react-adapter`.
 *
 * These helpers are safe to call from any React (or browser) environment and
 * may depend on the adapter's hooks or browser APIs, but must NOT import from
 * `@tetherto/mdk-react-devkit` (which would create a circular dependency).
 */

export type { ControlTooltip } from './keyboard-shortcut-utils'
export { getControlSectionsTooltips } from './keyboard-shortcut-utils'
