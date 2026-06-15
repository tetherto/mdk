/**
 * Runnable example for SiteStatsBar.
 *
 * Compose the four site-level stats (current power, hashrate, miner count,
 * container count) into one summary strip. Drives off pre-computed numbers
 * — the dashboard hooks compute these from `useHashrateChartData` /
 * `useSiteConsumptionChartData` / `useDevices`.
 */
import { SiteStatsBar } from '@tetherto/mdk-react-devkit'

export const SiteStatsBarExample = () => (
  <SiteStatsBar
    title="Site A"
    power={1320}
    powerUnit="kW"
    totalHashrate={92.3}
    hashrateUnit="TH/s"
    minerCount={1024}
    containerCount={4}
  />
)
