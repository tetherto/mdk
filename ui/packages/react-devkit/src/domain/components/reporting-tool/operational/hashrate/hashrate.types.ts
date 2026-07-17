/**
 * Single bucket of a v2 `/auth/metrics/hashrate` grouped response.
 *
 * `hashrateMhs` keys are either miner-type ids (`groupBy=miner`) or container
 * ids (`groupBy=container`) depending on which response the consumer fetched.
 * Values are in MH/s; the view layer converts to TH/s for display.
 */
export type HashrateGroupedLogEntry = {
  ts: number
  hashrateMhs: Record<string, number>
}

export type HashrateGroupedLog = ReadonlyArray<HashrateGroupedLogEntry>

/**
 * groupBy axis for the v2 grouped hashrate endpoint.
 *
 * - `miner` returns one bucket per miner-type id.
 * - `container` returns one bucket per container id (plus rollup keys that
 *   the utils layer filters out - see `getCleanGroupedEntries`).
 */
export type HashrateGroupBy = 'miner' | 'container'

export type HashrateFilterOption = {
  value: string
  label: string
}

export type HashrateSeriesPoint = {
  ts: string
  value: number
}

export type HashrateSeries = {
  label: string
  color?: string
  points: HashrateSeriesPoint[]
}

export type HashrateSiteViewChartData = {
  series: HashrateSeries[]
}

export type HashrateBarChartData = {
  labels: string[]
  series: {
    label: string
    values: number[]
    color: string
  }[]
}
