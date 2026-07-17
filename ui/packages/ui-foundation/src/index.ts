/**
 * @tetherto/mdk-ui-foundation — framework-agnostic headless core for the MDK Devkit.
 *
 * Exposes:
 *   - Zustand vanilla stores: auth / devices / timezone / notifications / actions
 *   - TanStack `QueryClient` factory (`createMdkQueryClient`) with environment-aware
 *     base URL resolution
 *   - Centralised `queryKeys` and TanStack query/mutation factory objects
 *     (`factories.ts` for core + thing-comment endpoints, `pool-factories.ts` for
 *     Pool Manager reads and the voting/approval write workflow)
 *   - Device-action submission builders (`device-actions.ts`): `DEVICE_ACTION` /
 *     `DEVICE_BATCH_ACTION` constants, per-action `buildXxx` helpers, cross-thing
 *     fan-out builders, and `buildDeviceActionSubmission` with the extras-override guard
 *   - Thing-comment mutation factories: `addThingCommentMutation`,
 *     `editThingCommentMutation`, `deleteThingCommentMutation`
 *   - Query-parameter builders for Op Centre, alerts, and dashboard read paths
 *   - Shared API types and pool/settings/chart type contracts
 */

export * from './constants'
export * from './query'
export * from './store'
export * from './types'
export * from './utils'

export const VERSION = '0.0.1'
