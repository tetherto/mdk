import { EnergyCostChart } from '@tetherto/mdk-react-devkit'

export const EnergyCostChartExample = () => (
  <div className="mdk-example-row">
    <EnergyCostChart
      btcUnit="BTC"
      displayMode="USD"
      onDisplayModeChange={() => undefined}
      barLabelFormatter={(value) => String(value)}
      chartData={{ labels: [], datasets: [] } as never}
    />
  </div>
)
