/**
 * Status / power-mode / site-overview literals. Data-layer constants
 * shared across the toolkit — owned by ui-foundation so the React layers stay
 * free of tag strings.
 *
 * Lifted from `@tetherto/mdk-react-devkit` per the layering rule
 * documented in `docs/ARCHITECTURE.md`.
 */

import { MinerStatuses } from './device-constants'

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

export const SOCKET_STATUSES = {
  ...MinerStatuses,
  ...MINER_POWER_MODE,
  ERROR_MINING: 'errorMining',
  MINER_DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
} as const

export const SITE_OVERVIEW_STATUSES = {
  OFFLINE: 'offline',
  EMPTY: 'empty',
  NOT_MINING: 'not_mining',
  MINING: 'mining',
} as const

export type ContainerStatus = (typeof CONTAINER_STATUS)[keyof typeof CONTAINER_STATUS]
export type MinerPowerMode = (typeof MINER_POWER_MODE)[keyof typeof MINER_POWER_MODE]
export type SocketStatus = (typeof SOCKET_STATUSES)[keyof typeof SOCKET_STATUSES]
export type MinerStatus = (typeof MinerStatuses)[keyof typeof MinerStatuses]
export type SiteOverviewStatus =
  (typeof SITE_OVERVIEW_STATUSES)[keyof typeof SITE_OVERVIEW_STATUSES]
