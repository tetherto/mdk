import { EnergyBalanceRevenueCharts } from '@tetherto/mdk-react-devkit'

export const EnergyBalanceRevenueChartsExample = () => (
  <div className="mdk-example-row">
    <EnergyBalanceRevenueCharts
      revenueChartData={{ labels: [], datasets: [] } as never}
      averageDowntimeData={{ labels: [], curtailment: [], operationalIssues: [] }}
      powerChartInput={{ datasets: [], threshold: null } as never}
      displayMode="USD"
      barLabelFormatter={(value) => String(value)}
      onDisplayModeChange={() => undefined}
      periodType="month"
      revenueMetrics={{ curtailmentRate: 3.2, operationalIssuesRate: 1.5 }}
    />
  </div>
)
