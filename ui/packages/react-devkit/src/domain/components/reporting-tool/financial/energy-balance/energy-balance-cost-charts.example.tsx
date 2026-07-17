import { EnergyBalanceCostCharts } from '@tetherto/mdk-react-devkit'

export const EnergyBalanceCostChartsExample = () => (
  <div className="mdk-example-row">
    <EnergyBalanceCostCharts
      costChartData={{ labels: [], datasets: [] } as never}
      btcUnit="BTC"
      powerChartInput={{ datasets: [], threshold: null } as never}
      displayMode="USD"
      barLabelFormatter={(value) => String(value)}
      onDisplayModeChange={() => undefined}
      showCostBarChart={true}
      periodType="month"
    />
  </div>
)
