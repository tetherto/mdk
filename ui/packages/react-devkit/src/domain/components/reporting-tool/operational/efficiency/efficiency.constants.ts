export type EfficiencyDateRange = { start: number; end: number }

export const EFFICIENCY_TAB_TYPES = {
  SITE_VIEW: 'site-view',
  MINER_TYPE_VIEW: 'miner-type-view',
  MINING_UNIT_VIEW: 'mining-unit-view',
} as const

export const EFFICIENCY_TAB_LABELS = {
  [EFFICIENCY_TAB_TYPES.SITE_VIEW]: 'Site View',
  [EFFICIENCY_TAB_TYPES.MINER_TYPE_VIEW]: 'Miner Type View',
  [EFFICIENCY_TAB_TYPES.MINING_UNIT_VIEW]: 'Mining Unit View',
} as const

export const EFFICIENCY_TABS = [
  {
    key: EFFICIENCY_TAB_TYPES.SITE_VIEW,
    label: EFFICIENCY_TAB_LABELS[EFFICIENCY_TAB_TYPES.SITE_VIEW],
  },
  {
    key: EFFICIENCY_TAB_TYPES.MINER_TYPE_VIEW,
    label: EFFICIENCY_TAB_LABELS[EFFICIENCY_TAB_TYPES.MINER_TYPE_VIEW],
  },
  {
    key: EFFICIENCY_TAB_TYPES.MINING_UNIT_VIEW,
    label: EFFICIENCY_TAB_LABELS[EFFICIENCY_TAB_TYPES.MINING_UNIT_VIEW],
  },
]

export const TAIL_LOG_MINER_TYPE_KEY = 'efficiency_w_ths_type_group_avg_aggr'
export const TAIL_LOG_CONTAINER_KEY = 'efficiency_w_ths_container_group_avg_aggr'

export const SITE_VIEW_SERIES_LABELS = {
  actual: 'Actual Site Efficiency',
  nominal: 'Nominal Site Efficiency',
} as const

export const MINER_TYPE_VIEW_SERIES_LABEL = 'Efficiency by Miner Type'
export const MINER_UNIT_VIEW_SERIES_LABEL = 'Efficiency by Mining Unit'
