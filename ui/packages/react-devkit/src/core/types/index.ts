/**
 * Core types and interfaces
 */

export * from './chart'

export * from './common'
export * from './component'
export type { ApiError, UnknownRecord } from '@tetherto/mdk-ui-core'

export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type Maybe<T> = T | null | undefined

export type Status = 'idle' | 'loading' | 'success' | 'error'

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

export type ApiResponse<T> = {
  data: T
  message?: string
  status: number
}
