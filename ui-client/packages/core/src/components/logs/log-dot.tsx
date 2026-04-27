import type { LogDotProps } from './types'
import { LOG_TYPES } from './constants'
import { cn } from '../../utils'
import LogActivityIcon from './activity-log-icon'

const ALERT_SEVERITY_TYPES = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
} as const

type AlertSeverity = (typeof ALERT_SEVERITY_TYPES)[keyof typeof ALERT_SEVERITY_TYPES]

const STATUS_CLASS_MAP: Record<AlertSeverity, string> = {
  [ALERT_SEVERITY_TYPES.CRITICAL]: 'mdk-logs-card__status-icon--critical',
  [ALERT_SEVERITY_TYPES.HIGH]: 'mdk-logs-card__status-icon--high',
  [ALERT_SEVERITY_TYPES.MEDIUM]: 'mdk-logs-card__status-icon--medium',
}

const getStatusModifier = (status?: string): string => {
  return (status && STATUS_CLASS_MAP[status as AlertSeverity]) || ''
}

const LogDot = ({ type, status }: LogDotProps): JSX.Element | null => {
  const renderMap: Record<string, JSX.Element | null> = {
    [LOG_TYPES.INCIDENTS]: (
      <div className={cn('mdk-logs-card__status-icon', getStatusModifier(status))} />
    ),
    [LOG_TYPES.ACTIVITY]: <LogActivityIcon status={status} />,
  }

  return renderMap[type] ?? null
}

LogDot.displayName = 'LogDot'

export { LogDot }
export default LogDot
