export const STAT_3_HOURS = 'stat-3h'
export const STAT_REALTIME = 'stat-rtd'
export const STAT_5_MINUTES = 'stat-5m'

// Threshold in days for switching from stat-5m to stat-3h
export const STAT_KEY_THRESHOLD_DAYS = 30

// Type exports
export type StatKey = typeof STAT_REALTIME | typeof STAT_5_MINUTES | typeof STAT_3_HOURS
