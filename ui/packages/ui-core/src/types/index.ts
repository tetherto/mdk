/**
 * Shared type contracts for the framework-agnostic MDK headless core.
 *
 * Scoped to the primitives that are framework-agnostic: stores, queries,
 * settings payloads, and shared error/record contracts. New types are added
 * here as additional primitives (telemetry, commands, etc.) are introduced.
 */

export * from './api-mining.types'
export * from './chart.types'
export * from './settings.types'

export type SubscriberCallback<T> = (value: T) => void
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
