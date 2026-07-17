import { useSiteConsumption } from './use-site-consumption'
import { useSiteHashrate } from './use-site-hashrate'

const MHS_PER_THS = 1_000_000

export type SiteEfficiency = {
  /** Watts per TH/s. `undefined` while loading or with zero hashrate. */
  valueWthS: number | undefined
  isLoading: boolean
}

export type UseSiteEfficiencyParams = {
  timeline: string
  start?: number
  end?: number
  tag?: string
  /** Override the consumption aggregate attribute. Defaults to `power_w_sum_aggr`. */
  powerAttribute?: string
  /** Polling interval in ms — forwarded to both upstream hooks. */
  refetchInterval?: number
  /**
   * Optional override for the numerator. When provided, the hook skips its
   * internal `useSiteConsumption` call and divides this watts value by the
   * hashrate. Pair with `useSitePowerMeter().valueW` for the header's
   * site-level (powermeter) efficiency reading, matching Mining OS.
   */
  powerW?: number
}

/**
 * Derives W/TH/s from the latest consumption + hashrate samples. Reuses both
 * existing tail-log queries (no extra fetch) so the header efficiency box
 * stays in step with the corresponding chart cards. Pass `powerW` to swap
 * the numerator in (e.g. site powermeter reading) without re-implementing
 * the formula.
 *
 * @category dashboard
 */
export const useSiteEfficiency = (params: UseSiteEfficiencyParams): SiteEfficiency => {
  const hashrate = useSiteHashrate(params)
  const consumption = useSiteConsumption(params)
  /* When the caller supplies `powerW` we skip the consumption hook's data
   * for the numerator but still gate `isLoading` on it to avoid showing a
   * partial value during the initial fetch. */
  const watts = params.powerW ?? consumption.valueW
  const mhs = hashrate.valueMhs

  let valueWthS: number | undefined
  if (typeof watts === 'number' && typeof mhs === 'number' && mhs > 0) {
    valueWthS = watts / (mhs / MHS_PER_THS)
  }

  return {
    valueWthS,
    isLoading: consumption.isLoading || hashrate.isLoading,
  }
}
