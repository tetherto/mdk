import { getLatestSample, type TailLogEntry } from '@tetherto/mdk-ui-foundation'
import {
  useConsumptionChartData,
  type UseConsumptionChartDataParams,
} from './use-consumption-chart-data'

const W_PER_MW = 1_000_000

export type SiteConsumption = {
  /** Latest aggregate value in MW. `undefined` while loading or with no data. */
  valueMw: number | undefined
  /** Raw backend value in watts. */
  valueW: number | undefined
  isLoading: boolean
}

/**
 * Projects the freshest consumption sample out of the dashboard's existing
 * tail-log query for the header stats strip (`<HeaderConsumptionBox />`).
 *
 * @category dashboard
 */
export const useSiteConsumption = (params: UseConsumptionChartDataParams): SiteConsumption => {
  const { data, isLoading } = useConsumptionChartData(params)
  const powerAttribute = params.powerAttribute ?? 'power_w_sum_aggr'
  const latest = getLatestSample<TailLogEntry>(data ?? undefined)
  const watts =
    typeof latest?.[powerAttribute] === 'number' ? (latest[powerAttribute] as number) : undefined

  return {
    valueMw: watts === undefined ? undefined : watts / W_PER_MW,
    valueW: watts,
    isLoading,
  }
}
