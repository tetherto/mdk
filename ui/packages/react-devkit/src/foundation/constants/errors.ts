export const INVALID_MAC_ADDRESS_ERROR = 'Requires a valid format: E.G. 00:1A:2B:3C:4D:5E'

export const API_ERRORS = {
  ERR_ORK_ACTION_CALLS_EMPTY: 'ERR_ORK_ACTION_CALLS_EMPTY',
} as const

// Type exports
export type ApiErrorKey = keyof typeof API_ERRORS
export type ApiErrorValue = (typeof API_ERRORS)[ApiErrorKey]
