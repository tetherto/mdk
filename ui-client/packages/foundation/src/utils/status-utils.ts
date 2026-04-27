import { MinerStatuses } from '../constants/device-constants'

export const CONTAINER_STATUS = {
  RUNNING: 'running',
  OFFLINE: 'offline',
  STOPPED: 'stopped',
} as const

export const MINER_POWER_MODE = {
  SLEEP: 'sleep',
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
} as const

export const THRESHOLD_LEVEL = {
  CRITICAL_LOW: 'criticalLow',
  ALARM_LOW: 'alarmLow',
  ALERT: 'alert',
  NORMAL: 'normal',
  ALARM: 'alarm',
  ALARM_HIGH: 'alarmHigh',
  CRITICAL_HIGH: 'criticalHigh',
} as const

export const SOCKET_STATUSES = {
  ...MinerStatuses,
  ...MINER_POWER_MODE,
  ERROR_MINING: 'errorMining',
  MINER_DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
} as const

export type SocketStatus = (typeof SOCKET_STATUSES)[keyof typeof SOCKET_STATUSES]
export type MinerStatus = (typeof MinerStatuses)[keyof typeof MinerStatuses]
