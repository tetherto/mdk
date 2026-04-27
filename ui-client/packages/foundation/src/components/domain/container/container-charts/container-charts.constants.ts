export const TAGS_LABEL = {
  'as-hk3_am-s19xp_h': 'Bitmain Hydro S19XP',
  'as-immersion_am-s19xp': 'Bitmain Immersion S19XP',
  'bd-d40-a1346_av-a1346': 'Bitdeer A1346',
  'bd-d40-m30_wm-m30sp': 'Bitdeer M30SP',
  'bd-d40-m56_wm-m56s': 'Bitdeer M56S',
  'bd-d40-s19xp_am-s19xp': 'Bitdeer S19XP',
  'mbt-wonderint_wm-m53s': 'MicroBt Wonderint M56S',
  'mbt-kehua_wm-m53s': 'MicroBt Kehua M53S',
} as const

/** Bitdeer dual-tank (1–2) and immersion dual-supply (1–2) series indices in overview adapters. */
export const CONTAINER_CHART_PAIR_INDICES = [1, 2] as const

export const CONTAINER_CHART_TIMELINE_OPTIONS = [
  { label: '1H', value: '1h' },
  { label: '6H', value: '6h' },
  { label: '24H', value: '24h' },
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
] as const
