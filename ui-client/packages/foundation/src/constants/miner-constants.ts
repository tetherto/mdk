import type { UnknownRecord } from '@tetherto/core'
import { COLOR } from '@tetherto/core'
import { SparePartTypes } from './spare-parts-constants'

export const MOVE_MINER = 'Move Miner'
export const REPAIR = 'Repair'
export const GO_TO_EXPLORER_ACTION = 'Go To Explorer'
export const INVENTORY_LOGS_ACTION = 'Inventory Logs'
export const ADD_COMMENT_ACTION = 'Add Comment'
export const DELETE_MINER = 'Delete Miner'

export const MINER_ACTIONS = [
  MOVE_MINER,
  REPAIR,
  INVENTORY_LOGS_ACTION,
  GO_TO_EXPLORER_ACTION,
  ADD_COMMENT_ACTION,
  DELETE_MINER,
] as const

export const READ_ONLY_ACTIONS = [INVENTORY_LOGS_ACTION, GO_TO_EXPLORER_ACTION] as const

export type MinerAction = (typeof MINER_ACTIONS)[number]

export type Miner = {
  id?: string
  type?: string
  code?: string
  container?: string
  pos?: string
  serialNum?: string
  macAddress?: string
  createdAt?: number
  updatedAt?: number
  location?: string
  status?: string
  site?: string
  tags?: string[]
  brand?: string
  raw?: UnknownRecord
  [key: string]: unknown
}

export const MINER_LOCATIONS = {
  WORKSHOP_WAREHOUSE: 'workshop.warehouse',
  WORKSHOP_LAB: 'workshop.lab',
  SITE_WAREHOUSE: 'site.warehouse',
  SITE_LAB: 'site.lab',
  SITE_CONTAINER: 'site.container',
  DISPOSED: 'disposed',
  VENDOR: 'vendor',
  UNKNOWN: 'unknown',
} as const

export const MINER_REPAIR_LOCATIONS = new Set([
  MINER_LOCATIONS.WORKSHOP_LAB,
  MINER_LOCATIONS.SITE_LAB,
])

export const MINER_LOCATION_BG_COLORS = {
  [MINER_LOCATIONS.SITE_WAREHOUSE]: `${COLOR.LIGHT_BLUE}33`,
  [MINER_LOCATIONS.SITE_LAB]: `${COLOR.LIGHT_BLUE}33`,
  [MINER_LOCATIONS.SITE_CONTAINER]: `${COLOR.LIGHT_BLUE}33`,
  [MINER_LOCATIONS.WORKSHOP_WAREHOUSE]: `${COLOR.YELLOW}33`,
  [MINER_LOCATIONS.WORKSHOP_LAB]: `${COLOR.YELLOW}33`,
  [MINER_LOCATIONS.DISPOSED]: `${COLOR.BRICK_RED}33`,
  [MINER_LOCATIONS.UNKNOWN]: `${COLOR.BRICK_RED}33`,
  [MINER_LOCATIONS.VENDOR]: `${COLOR.DARK_GREEN}33`,
}

export const MINER_LOCATION_BORDER_COLORS = {
  [MINER_LOCATIONS.SITE_WAREHOUSE]: COLOR.LIGHT_BLUE,
  [MINER_LOCATIONS.SITE_LAB]: COLOR.LIGHT_BLUE,
  [MINER_LOCATIONS.SITE_CONTAINER]: COLOR.LIGHT_BLUE,
  [MINER_LOCATIONS.WORKSHOP_WAREHOUSE]: COLOR.YELLOW,
  [MINER_LOCATIONS.WORKSHOP_LAB]: COLOR.YELLOW,
  [MINER_LOCATIONS.DISPOSED]: COLOR.BRICK_RED,
  [MINER_LOCATIONS.UNKNOWN]: COLOR.BRICK_RED,
  [MINER_LOCATIONS.VENDOR]: COLOR.DARK_GREEN,
}

export const MINER_STATUSES = {
  OK_BRAND_NEW: 'ok_brand_new',
  OK_REPAIRED: 'ok_repaired',
  FAULTY: 'faulty',
  ON_HOLD: 'on_hold',
  SCRAPPED: 'scrapped',
  DISPOSED: 'disposed',
  UNKNOWN: 'unknown',
} as const

export const MINER_STATUS_NAMES = {
  [MINER_STATUSES.OK_BRAND_NEW]: 'Brand New',
  [MINER_STATUSES.OK_REPAIRED]: 'Repaired',
  [MINER_STATUSES.FAULTY]: 'Faulty',
  [MINER_STATUSES.ON_HOLD]: 'On Hold',
  [MINER_STATUSES.SCRAPPED]: 'Scrapped',
  [MINER_STATUSES.DISPOSED]: 'Disposed',
  [MINER_STATUSES.UNKNOWN]: 'Unknown',
}

export const MINER_STATUS_BG_COLORS = {
  [MINER_STATUSES.OK_BRAND_NEW]: `${COLOR.LIGHT_BLUE}33`,
  [MINER_STATUSES.OK_REPAIRED]: `${COLOR.GRASS_GREEN}33`,
  [MINER_STATUSES.FAULTY]: `${COLOR.BRICK_RED}33`,
  [MINER_STATUSES.ON_HOLD]: `${COLOR.COLD_ORANGE}33`,
  [MINER_STATUSES.SCRAPPED]: `${COLOR.YELLOW}33`,
  [MINER_STATUSES.UNKNOWN]: COLOR.AGED_YELLOW,
  [MINER_STATUSES.DISPOSED]: COLOR.AGED_YELLOW,
}

export const MINER_STATUS_BORDER_COLORS = {
  [MINER_STATUSES.OK_BRAND_NEW]: COLOR.LIGHT_BLUE,
  [MINER_STATUSES.OK_REPAIRED]: COLOR.GRASS_GREEN,
  [MINER_STATUSES.FAULTY]: COLOR.BRICK_RED,
  [MINER_STATUSES.ON_HOLD]: COLOR.COLD_ORANGE,
  [MINER_STATUSES.SCRAPPED]: COLOR.YELLOW,
  [MINER_STATUSES.UNKNOWN]: COLOR.AGED_YELLOW,
  [MINER_STATUSES.DISPOSED]: COLOR.AGED_YELLOW,
}

export const SEARCHABLE_MINER_ATTRIBUTES = [
  'brand',
  'type',
  'site',
  'container',
  'pos',
  'serialNum',
  'macAddress',
  'updatedAt',
  'location',
  'status',
  'id',
  'code',
]

export const MINER_COLUMN_ITEMS = [
  // { key: 'miner_serial', label: 'Miner Serial Number' },
  // { key: 'miner_position', label: 'Miner Position' },
  // { key: 'miner_container', label: 'Miner Container Info' },
  { key: 'ip', label: 'IP Address' },
  { key: 'status', label: 'Status' },
  { key: 'type', label: 'Miner Type' },
  { key: 'power', label: 'Power' },
  { key: 'version', label: 'Version Info' },
  { key: 'mac', label: 'MAC Address' },
  { key: 'err', label: 'Error Code' },
  { key: 'uptime', label: 'Uptime / Elapsed' },
  {
    key: 'powerMode',
    label: 'Power Mode',
    children: [
      { key: 'powerMode.performance', label: 'Performance' },
      { key: 'powerMode.ths', label: 'Ths Rt' },
      { key: 'powerMode.efficiency', label: 'Efficiency' },
    ],
  },
  {
    key: 'hashTemp',
    label: 'Temp / Volt',
    children: [
      { key: 'hashTemp.hashTemp', label: 'Hash Temp' },
      { key: 'hashTemp.envTemp', label: 'Env Temp' },
      { key: 'hashTemp.chipTemp', label: 'Chip Temp' },
      { key: 'hashTemp.volt', label: 'Volt' },
    ],
  },
  {
    key: 'network',
    label: 'Network Info',
    children: [
      { key: 'network.fastboot', label: 'FastBoot' },
      { key: 'network.rejectRate', label: 'Reject Rate' },
    ],
  },
  {
    key: 'pools',
    label: 'Active Pool',
    children: [
      { key: 'pools.activePool', label: 'Active Pool' },
      { key: 'pools.pool1', label: 'Pool 1' },
      { key: 'pools.worker1', label: 'Worker 1' },
      { key: 'pools.pool2', label: 'Pool 2' },
      { key: 'pools.worker2', label: 'Worker 2' },
      { key: 'pools.pool3', label: 'Pool 3' },
      { key: 'pools.worker3', label: 'Worker 3' },
    ],
  },
]

export const MINER_PART_LIMITS = {
  [SparePartTypes.CONTROLLER]: 1,
  [SparePartTypes.PSU]: 1,
  [SparePartTypes.HASHBOARD]: Infinity,
}
