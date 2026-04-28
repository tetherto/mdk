import { AlertTriangleIcon } from '@tetherto/core'
import type { ReactNode } from 'react'
import { ALERT_SEVERITY_TYPES } from '../../../../constants/alerts'

export const ALERT_COLOR_MAP: Record<string, string> = {
  [ALERT_SEVERITY_TYPES.CRITICAL]: 'var(--mdk-button-danger-bg)',
  [ALERT_SEVERITY_TYPES.HIGH]: 'var(--mdk-color-primary)',
  [ALERT_SEVERITY_TYPES.MEDIUM]: 'var(--mdk-color-warning)',
}

export const ALERT_ICON_MAP: Record<string, ReactNode> = {
  [ALERT_SEVERITY_TYPES.CRITICAL]: (
    <AlertTriangleIcon
      className="mdk-alarm-row__icon mdk-alarm-row__icon--critical"
      role="img"
      aria-label="critical"
    />
  ),
  [ALERT_SEVERITY_TYPES.HIGH]: (
    <span className="mdk-alarm-row__icon mdk-alarm-row__icon--high" role="img" aria-label="high" />
  ),
  [ALERT_SEVERITY_TYPES.MEDIUM]: (
    <span
      className="mdk-alarm-row__icon mdk-alarm-row__icon--dot"
      style={{ backgroundColor: ALERT_COLOR_MAP[ALERT_SEVERITY_TYPES.MEDIUM] }}
      role="img"
      aria-label="medium"
    />
  ),
}
