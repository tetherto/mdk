/**
 * Core types and interfaces
 */

export * from './chart'
export * from './common'
export * from './component'

/**
 * Generic type for objects with unknown structure
 */
export type UnknownRecord = Record<string, unknown>

// Common types
export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type Maybe<T> = T | null | undefined

// Status types
export type Status = 'idle' | 'loading' | 'success' | 'error'

// Pagination
export type PaginationParams = {
  limit?: number
  offset?: number
  page?: number
}

export type PaginatedResponse<T> = {
  data: T[]
  page: number
  total: number
  totalPages: number
}

// API Response
export type ApiResponse<T> = {
  data: T
  message?: string
  status: number
}

export type ApiError = {
  error: string
  message: string
  status: number
  data?: {
    message?: string
  }
}
