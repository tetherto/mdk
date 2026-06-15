import { COLOR } from '@core'

import { MINER_POWER_MODE } from '../../../../../utils/status-utils'
import { MinerStatuses } from '../../../../../constants/device-constants'

export type EnergyReportDateRange = { start: number; end: number }

export const ENERGY_REPORT_TAB_TYPES = {
  SITE_VIEW: 'site-view',
  MINER_TYPE_VIEW: 'miner-type-view',
  MINER_UNIT_VIEW: 'miner-unit-view',
} as const

export const ENERGY_REPORT_TAB_LABELS = {
  [ENERGY_REPORT_TAB_TYPES.SITE_VIEW]: 'Site View',
  [ENERGY_REPORT_TAB_TYPES.MINER_TYPE_VIEW]: 'Miner Type View',
  [ENERGY_REPORT_TAB_TYPES.MINER_UNIT_VIEW]: 'Miner Unit View',
} as const

export const ENERGY_REPORT_TABS = [
  {
    key: ENERGY_REPORT_TAB_TYPES.SITE_VIEW,
    label: ENERGY_REPORT_TAB_LABELS[ENERGY_REPORT_TAB_TYPES.SITE_VIEW],
  },
  {
    key: ENERGY_REPORT_TAB_TYPES.MINER_TYPE_VIEW,
    label: ENERGY_REPORT_TAB_LABELS[ENERGY_REPORT_TAB_TYPES.MINER_TYPE_VIEW],
  },
  {
    key: ENERGY_REPORT_TAB_TYPES.MINER_UNIT_VIEW,
    label: ENERGY_REPORT_TAB_LABELS[ENERGY_REPORT_TAB_TYPES.MINER_UNIT_VIEW],
  },
] as const

export const SITE_POWER_SERIES_LABELS = {
  consumption: 'Power Consumption',
  available: 'Power Available',
} as const

export const ENERGY_REPORT_BAR_SERIES_LABEL = 'Power Consumption'
export const ENERGY_REPORT_BAR_WIDTH = 45

export const ENERGY_REPORT_BAR_EMPTY_MESSAGE =
  'No power consumption data available for the selected period.'

export const ENERGY_REPORT_SITE_SECTION_HEADINGS = {
  powerConsumption: 'Power Consumption',
  powerModeByMinerType: 'Power Mode by Miner Type',
  miningUnitPowerSummary: 'Mining Unit Power Summary',
} as const

/** Snapshot tail-log field keys used by the site tab (metrics tail log v1 shape). */
export const ENERGY_REPORT_TAIL_LOG_KEYS = {
  TYPE_COUNT: 'type_cnt',
  POWER_W_TYPE_GROUP_SUM: 'power_w_type_group_sum_aggr',
  ACTIVE_CONTAINER_GROUP_COUNT: 'hashrate_mhs_5m_active_container_group_cnt',
} as const

export const ENERGY_REPORT_MINER_VIEW_SLICES = {
  MINER_TYPE: 'MINER_TYPE',
  MINER_UNIT: 'MINER_UNIT',
} as const

export const CONTAINER_POWER_MODES_MAP = {
  offline_cnt: MinerStatuses.OFFLINE,
  not_mining_cnt: MinerStatuses.NOT_MINING,
  power_mode_normal_include_error_cnt: MinerStatuses.ERROR,
  power_mode_low_cnt: MINER_POWER_MODE.LOW,
  power_mode_normal_cnt: MINER_POWER_MODE.NORMAL,
  power_mode_high_cnt: MINER_POWER_MODE.HIGH,
} as const

export type ContainerPowerModeTailLogKey = keyof typeof CONTAINER_POWER_MODES_MAP

export const DEFAULT_SITE_RANGE_DAYS = 7

export const MINER_MODES = [
  { mode: MinerStatuses.OFFLINE, title: 'Offline', color: COLOR.GREY_IDLE },
  { mode: MinerStatuses.ERROR, title: 'Error', color: COLOR.RED },
  { mode: MINER_POWER_MODE.SLEEP, title: 'Sleep', color: COLOR.SLEEP_BLUE },
  { mode: MINER_POWER_MODE.LOW, title: 'Low', color: COLOR.BRIGHT_YELLOW },
  { mode: MINER_POWER_MODE.NORMAL, title: 'Normal', color: COLOR.GREEN },
  { mode: MINER_POWER_MODE.HIGH, title: 'High', color: COLOR.MINT_GREEN },
  { mode: MinerStatuses.MAINTENANCE, title: 'Maintenance', color: COLOR.ORANGE_WARNING },
] as const

export const MinerTypePowerModesMap = {
  offline_type_cnt: MinerStatuses.OFFLINE,
  error_type_cnt: MinerStatuses.ERROR,
  power_mode_sleep_type_cnt: MINER_POWER_MODE.SLEEP,
  power_mode_low_type_cnt: MINER_POWER_MODE.LOW,
  power_mode_normal_type_cnt: MINER_POWER_MODE.NORMAL,
  power_mode_high_type_cnt: MINER_POWER_MODE.HIGH,
  maintenance_type_cnt: MinerStatuses.MAINTENANCE,
} as const

export type MinerModeKey = keyof typeof MinerTypePowerModesMap

export const POWER_MODE_TABLE_TOOLTIP =
  'This count represents unique miners of this type. Status columns may sum to more than this total because: Power modes (Normal/High/Low/Sleep) are mutually exclusive, but Maintenance and Error can overlap with any power mode.'

/** Keeps miner name + count/power subtitle readable when the table scrolls horizontally. */
export const POWER_MODE_TABLE_MINER_TYPE_COLUMN_SIZE = 220
