/**
 * @tetherto/mdk-ui-core — framework-agnostic headless core for the MDK Devkit.
 *
 * Currently exposes:
 *   - Zustand vanilla stores for the five slices currently in scope:
 *     auth / devices / timezone / notifications / actions
 *   - TanStack Query Core `QueryClient` factory with environment-aware base URL
 *     resolution (HLD §5)
 *
 * Higher-level telemetry primitives (subscription manager, stale detection,
 * ring buffers) are not yet included — they will be added alongside the
 * consuming code that needs them.
 */

export * from './constants'
export * from './query'
export * from './store'
export * from './types'
export * from './utils'

export const VERSION = '0.0.1'
