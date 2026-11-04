/**
 * @tetherto/mdk-ui-foundation — framework-agnostic headless core for the MDK Devkit.
 *
 * Exposes:
 *   - Zustand vanilla stores: auth / devices / timezone / notifications
 *   - TanStack `QueryClient` factory (`createMdkQueryClient`) with environment-aware
 *     base URL resolution
 *   - The client's base URL and auth-aware fetcher (`getApiBaseUrl`, `getFetcher`)
 *   - Auth providers (`noAuth`, `bearerTokenAuth`, `gatewayRedirectAuth`) and
 *     device type / tag helpers
 *   - Shared API types and pool/settings/chart type contracts
 */

export * from './apps/index.js'
export * from './auth/index.js'
export * from './constants/index.js'
export * from './query/index.js'
export * from './store/index.js'
export * from './types/index.js'

export * from './utils/index.js'

export const VERSION = '0.0.1'
