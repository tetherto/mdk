import { type ListThingsDevice, listThingsQuery } from '@tetherto/mdk-ui-foundation'
import { useQuery, useQueryClient } from '@tanstack/react-query'

const SITE_QUERY = JSON.stringify({ 'info.pos': { $eq: 'site' } })
const POWER_FIELDS = JSON.stringify({
  id: 1,
  tags: 1,
  'last.snap.stats.power_w': 1,
})

const W_PER_MW = 1_000_000

const headOrEmpty = (value: ListThingsDevice[][] | undefined | null): ListThingsDevice[] => {
  if (!Array.isArray(value)) return []
  const first = value[0]
  return Array.isArray(first) ? first : []
}

/* Mining OS filters by `device.tags` (an array of role strings — e.g.
 * `['t-powermeter']`), not by `device.type`. Mirror that or the
 * lookup misses on the same backend payload. */
const filterByTag = (devices: ListThingsDevice[], tag: string): ListThingsDevice[] =>
  devices.filter((d) => Array.isArray(d.tags) && d.tags.includes(tag))

const readPowerW = (device: ListThingsDevice | undefined): number | undefined => {
  if (!device) return undefined
  const stats = (device.last?.snap as { stats?: { power_w?: unknown } } | undefined)?.stats
  const value = stats?.power_w
  return typeof value === 'number' ? value : undefined
}

export type SitePowerMeter = {
  /** Site-level power reading in MW. `undefined` while loading or with no powermeter device. */
  valueMw: number | undefined
  /** Raw site-level reading in watts. */
  valueW: number | undefined
  isLoading: boolean
}

export type UseSitePowerMeterOptions = {
  /** Polling interval in ms. Defaults to 30s. Pass 0 to disable. */
  refetchInterval?: number
}

/**
 * Site-level power reading for the header's `<HeaderConsumptionBox />`. Reads
 * the freshest snapshot from a `t-powermeter`-tagged thing at `info.pos =
 * 'site'`; falls back to a `t-container`-tagged thing if no powermeter is
 * configured (matches Mining OS's `useHeaderStats` fallback chain).
 *
 * Note this is **distinct** from {@link useSiteConsumption}, which sums the
 * per-miner aggregates from tail-log and is appropriate for the chart card's
 * time-series. The site power meter typically reads larger than the miner
 * sum (it includes cooling, ancillary load, etc.).
 *
 * @category dashboard
 */
export const useSitePowerMeter = (options: UseSitePowerMeterOptions = {}): SitePowerMeter => {
  const queryClient = useQueryClient()
  const factory = listThingsQuery(queryClient, {
    status: 1,
    query: SITE_QUERY,
    fields: POWER_FIELDS,
    limit: 100,
  })

  const { data, isLoading } = useQuery({
    ...factory,
    refetchInterval: options.refetchInterval ?? 30_000,
  })

  const devices = headOrEmpty(data)
  /* Prefer a dedicated powermeter; fall back to container readings only
   * when no powermeter is configured (Mining OS's getDeviceDataByType chain).
   * Sum across all matching devices to handle multi-meter sites. */
  const powermeters = filterByTag(devices, 't-powermeter')
  const fallbacks = powermeters.length > 0 ? powermeters : filterByTag(devices, 't-container')
  let totalWatts = 0
  let any = false
  for (const device of fallbacks) {
    const watts = readPowerW(device)
    if (typeof watts === 'number') {
      totalWatts += watts
      any = true
    }
  }
  const watts = any ? totalWatts : undefined

  return {
    valueMw: watts === undefined ? undefined : watts / W_PER_MW,
    valueW: watts,
    isLoading,
  }
}
