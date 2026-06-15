/**
 * Runnable example for GaugeChart.
 */
import { GaugeChart } from '@tetherto/mdk-react-devkit'

export const GaugeChartExample = () => (
  <div className="mdk-example-row">
    <GaugeChart percent={0.72} id="gauge-hash-rate" />
    <GaugeChart
      percent={0.45}
      id="gauge-efficiency"
      colors={['#34C759', '#FF9500', '#FF3B30']}
      nrOfLevels={5}
    />
    <GaugeChart percent={0.95} id="gauge-uptime" hideText height={160} />
  </div>
)
