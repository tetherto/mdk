/**
 * Re-exports of the data-layer status literals now owned by
 * `@tetherto/mdk-ui-foundation`. Kept here so existing imports under
 * `foundation/utils/status-utils` keep resolving.
 *
 * `THRESHOLD_LEVEL` is presentation-only (the alarm gradient the
 * heatmap uses) and stays in devkit.
 */

export { CONTAINER_STATUS, MINER_POWER_MODE, SOCKET_STATUSES } from '@tetherto/mdk-ui-foundation'
export type { MinerStatus, SocketStatus } from '@tetherto/mdk-ui-foundation'

export const THRESHOLD_LEVEL = {
  CRITICAL_LOW: 'criticalLow',
  ALARM_LOW: 'alarmLow',
  ALERT: 'alert',
  NORMAL: 'normal',
  ALARM: 'alarm',
  ALARM_HIGH: 'alarmHigh',
  CRITICAL_HIGH: 'criticalHigh',
} as const
