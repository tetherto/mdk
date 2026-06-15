export type HashrateDateRange = { start: number; end: number }

export const HASHRATE_TAB_TYPES = {
  SITE_VIEW: 'site-view',
  MINER_TYPE_VIEW: 'miner-type-view',
  MINING_UNIT_VIEW: 'mining-unit-view',
} as const

export const HASHRATE_TAB_LABELS = {
  [HASHRATE_TAB_TYPES.SITE_VIEW]: 'Site View',
  [HASHRATE_TAB_TYPES.MINER_TYPE_VIEW]: 'Miner Type View',
  [HASHRATE_TAB_TYPES.MINING_UNIT_VIEW]: 'Mining Unit View',
} as const

export const HASHRATE_TABS = [
  {
    key: HASHRATE_TAB_TYPES.SITE_VIEW,
    label: HASHRATE_TAB_LABELS[HASHRATE_TAB_TYPES.SITE_VIEW],
  },
  {
    key: HASHRATE_TAB_TYPES.MINER_TYPE_VIEW,
    label: HASHRATE_TAB_LABELS[HASHRATE_TAB_TYPES.MINER_TYPE_VIEW],
  },
  {
    key: HASHRATE_TAB_TYPES.MINING_UNIT_VIEW,
    label: HASHRATE_TAB_LABELS[HASHRATE_TAB_TYPES.MINING_UNIT_VIEW],
  },
]

export const SITE_VIEW_SERIES_LABEL = 'Site Hashrate'
export const HASHRATE_BAR_SERIES_LABEL = 'Hashrate'
