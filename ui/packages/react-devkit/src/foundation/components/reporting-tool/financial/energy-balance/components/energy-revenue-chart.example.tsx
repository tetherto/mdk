import { EnergyRevenueChart } from '@tetherto/mdk-react-devkit'

export const EnergyRevenueChartExample = () => (
  <div className="mdk-example-row">
    <EnergyRevenueChart
      chartData={{ labels: [], datasets: [] } as never}
      displayMode="USD"
      barLabelFormatter={(value) => String(value)}
      onDisplayModeChange={() => undefined}
    />
  </div>
)
