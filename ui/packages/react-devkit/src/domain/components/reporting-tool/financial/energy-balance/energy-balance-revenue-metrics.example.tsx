import { EnergyBalanceRevenueMetrics } from '@tetherto/mdk-react-devkit'

export const EnergyBalanceRevenueMetricsExample = () => (
  <div className="mdk-example-row">
    <EnergyBalanceRevenueMetrics metrics={{ curtailmentRate: 3.2, operationalIssuesRate: 1.5 }} />
  </div>
)
