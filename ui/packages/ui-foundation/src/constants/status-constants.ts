/**
 * Status / power-mode / site-overview literals. Data-layer constants
 * shared across the toolkit — owned by ui-foundation so the React layers stay
 * free of tag strings.
 *
 * Lifted from `@tetherto/mdk-react-devkit` per the layering rule
 * documented in `docs/ARCHITECTURE.md`.
 */

import { MinerStatuses } from './device-constants.js'

/**
 * The states a container reports: running, offline, or stopped.
 *
 * @category general
 */
export const CONTAINER_STATUS = {
  RUNNING: 'running',
  OFFLINE: 'offline',
  STOPPED: 'stopped',
} as const

/**
 * The power modes a miner can be set to, from `sleep` through to `high`.
 *
 * @category general
 */
export const MINER_POWER_MODE = {
  SLEEP: 'sleep',
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
} as const

/**
 * Every state a socket can show, combining the miner statuses and power modes with the
 * connection states a socket adds: mining error, disconnected, and connecting.
 *
 * @category general
 */
export const SOCKET_STATUSES = {
  ...MinerStatuses,
  ...MINER_POWER_MODE,
  ERROR_MINING: 'errorMining',
  MINER_DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
} as const

/**
 * The headline states a site reports on the overview: offline, empty, not mining, or mining.
 *
 * @category general
 */
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
