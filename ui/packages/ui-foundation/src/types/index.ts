/**
 * Shared type contracts for the framework-agnostic MDK headless core.
 *
 * Scoped to the primitives that are framework-agnostic: stores, queries,
 * settings payloads, and shared error/record contracts. New types are added
 * here as additional primitives (telemetry, commands, etc.) are introduced.
 */

export * from './api-mining.types.js'
export * from './chart.types.js'
export * from './settings.types.js'

/**
 * A listener called with the new value whenever a store changes.
 *
 * @category general
 */
export type SubscriberCallback<T> = (value: T) => void
/**
 * Call to stop a subscription. Returned when you subscribe to a store.
 *
 * @category general
 */
export type Unsubscribe = () => void

/**
 * Generic type for objects with unknown structure.
 */
export type UnknownRecord = Record<string, unknown>

/**
 * Shared error contract used across HTTP/API surfaces.
 */
export type ApiError = {
  error: string
  message: string
  status: number
  data?: {
    message?: string
  }
}
