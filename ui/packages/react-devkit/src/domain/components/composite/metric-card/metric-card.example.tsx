/**
 * Runnable example for MetricCard.
 */
import { MetricCard } from '@tetherto/mdk-react-devkit'

export const MetricCardExample = () => (
  <div className="mdk-example-row">
    <MetricCard label="Hashrate" unit="TH/s" value={102.4} />
    <MetricCard label="Power" unit="W" value={3200} isHighlighted />
    <MetricCard label="Efficiency" unit="J/TH" value={31.2} isValueMedium />
    <MetricCard label="Revenue" unit="USD" value={0} showDashForZero />
    <MetricCard label="Temperature" unit="°C" value={null} />
  </div>
)
