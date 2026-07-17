const HS_PER_THS = 1_000_000_000_000
const PHS_PER_THS = 1000

export const formatBtcRevenue = (value: number | undefined): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0 BTC'
  return `${value.toFixed(value === 0 ? 0 : 4)} BTC`
}

/**
 * Display PH/s when ≥ 1, otherwise TH/s. Matches the Mining OS mining-pools
 * table which switches units row-by-row so partial-PH lines stay readable.
 */
export const formatHashrate = (phs: number | undefined): string => {
  if (typeof phs !== 'number' || !Number.isFinite(phs)) return '— PH/s'
  if (phs >= 1) return `${phs.toFixed(2)} PH/s`
  const ths = phs * PHS_PER_THS
  return `${ths.toFixed(0)} TH/s`
}

/* Re-exported for ad-hoc consumers (e.g. the panel's table-export). */
export const HS_PER_TERAHASH = HS_PER_THS
