import { type MinerpoolExtDataEntry, minerpoolStatsQuery } from '@tetherto/mdk-ui-core'
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'

/* Pool API reports hashrate in raw H/s (hashes per second), not the MH/s
 * convention used by the site tail-log aggregates. 1 PH/s = 1e15 H/s. */
const HS_PER_PHS = 1_000_000_000_000_000

export type PoolStats = {
  /** Total miners reported across all configured pools (`worker_count` sum). */
  total: number
  /** Pool-reported online workers (`active_workers_count` sum). */
  online: number
  /** Difference between configured and active workers (visual "mismatch" count). */
  mismatch: number
  /** Aggregate pool hashrate in PH/s. `undefined` while loading or with no data. */
  hashratePhs: number | undefined
  /** Raw aggregate pool hashrate in H/s (backend unit — hashes per second). */
  hashrateHs: number | undefined
  isLoading: boolean
}

export type UsePoolStatsOptions = {
  /** Polling interval in ms. Defaults to 120s (Moria's POLLING_2m). Pass 0 to disable. */
  refetchInterval?: number
}

const headOrEmpty = <T>(value: T[][] | undefined | null): T[] => {
  if (!Array.isArray(value)) return []
  const first = value[0]
  return Array.isArray(first) ? (first as T[]) : []
}

/**
 * Aggregates per-pool worker counts and hashrate from
 * `GET /auth/ext-data?type=minerpool&query={"key":"stats"}`. Returns the
 * `total`, `online`, and `mismatch` triplets and the summed `hashratePhs`
 * shaped for `<HeaderMinersBox poolTotal/poolOnline/poolMismatch>` and
 * `<HeaderHashrateBox poolPhs>` respectively.
 *
 * Independent of the site (MOS-side) queries — pool data comes from a
 * separate provider and polls at a slower cadence (2 min) by default.
 *
 * @category dashboard
 */
export const usePoolStats = (options: UsePoolStatsOptions = {}): PoolStats => {
  const queryClient = useQueryClient()
  const factory = minerpoolStatsQuery(queryClient)

  const result: UseQueryResult<MinerpoolExtDataEntry[][], Error> = useQuery({
    ...factory,
    refetchInterval: options.refetchInterval ?? 120_000,
  })

  const entries = headOrEmpty<MinerpoolExtDataEntry>(result.data)
  const pools = entries[0]?.stats ?? []

  let total = 0
  let online = 0
  let hashrateHs = 0
  for (const pool of pools) {
    total += pool.worker_count ?? 0
    online += pool.active_workers_count ?? 0
    hashrateHs += pool.hashrate ?? 0
  }

  const hasData = pools.length > 0
  return {
    total,
    online,
    mismatch: Math.max(0, total - online),
    hashrateHs: hasData ? hashrateHs : undefined,
    hashratePhs: hasData ? hashrateHs / HS_PER_PHS : undefined,
    isLoading: result.isLoading,
  }
}
