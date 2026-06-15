export const POLLING_5s = 5 * 1_000

export const POLLING_10s = 10 * 1_000

export const POLLING_15s = 15 * 1_000

export const POLLING_20s = 20 * 1_000

export const POLLING_30s = 30 * 1_000

export const POLLING_1m = 60 * 1_000

export const POLLING_2m = POLLING_1m * 2

// Type exports
export type PollingIntervalType =
  | typeof POLLING_5s
  | typeof POLLING_1m
  | typeof POLLING_2m
  | typeof POLLING_10s
  | typeof POLLING_15s
  | typeof POLLING_20s
  | typeof POLLING_30s
