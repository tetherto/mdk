import { MinerMetricCard } from '@tetherto/mdk-react-devkit'

export const MinerMetricCardExample = () => (
  <div className="mdk-example-row">
    <MinerMetricCard
      primaryStats={[
        { name: 'Hashrate', value: 95.5, unit: 'TH/s' },
        { name: 'Efficiency', value: 28.3, unit: 'J/TH' },
        { name: 'Temperature', value: 65, unit: '°C' },
      ]}
      secondaryStats={[
        { name: 'Frequency', value: 620, unit: 'MHz' },
        { name: 'Consumption', value: 3250, unit: 'W' },
      ]}
      showSecondaryStats={true}
    />
  </div>
)
