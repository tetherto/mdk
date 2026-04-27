import { COLOR } from '@mdk/core'

export const ALERT_SEVERITY_TYPES = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
} as const

export const SEVERITY = {
  HIGH: 'high',
  MEDIUM: 'medium',
  CRITICAL: 'critical',
} as const

// Improved colors for WCAG AA accessibility (4.5:1 contrast ratio)
export const SEVERITY_COLORS = {
  [SEVERITY.MEDIUM]: COLOR.GOLD,
  [SEVERITY.CRITICAL]: COLOR.BRIGHT_RED,
  [SEVERITY.HIGH]: COLOR.DARK_ORANGE_ACCESSIBLE,
} as const

export const SEVERITY_LEVELS = {
  [SEVERITY.MEDIUM]: 0,
  [SEVERITY.HIGH]: 1,
  [SEVERITY.CRITICAL]: 2,
} as const

export const SEVERITY_KEY = 'severity'

// Type exports
export type AlertSeverity = (typeof ALERT_SEVERITY_TYPES)[keyof typeof ALERT_SEVERITY_TYPES]
export type SeverityKey = keyof typeof SEVERITY
export type SeverityValue = (typeof SEVERITY)[SeverityKey]
export type SeverityColorKey = keyof typeof SEVERITY_COLORS
export type SeverityLevelKey = keyof typeof SEVERITY_LEVELS
export type SeverityLevelValue = (typeof SEVERITY_LEVELS)[SeverityLevelKey]
