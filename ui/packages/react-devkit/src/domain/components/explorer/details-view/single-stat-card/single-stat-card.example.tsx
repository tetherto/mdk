import { SingleStatCard } from '@tetherto/mdk-react-devkit'

export const SingleStatCardExample = () => (
  <div className="mdk-example-row">
    <SingleStatCard name="Hashrate" value={95.5} unit="TH/s" variant="primary" />
    <SingleStatCard name="Efficiency" value={28.3} unit="J/TH" variant="secondary" />
    <SingleStatCard name="Temperature" value={65} unit="°C" variant="highlighted" />
    <SingleStatCard name="Consumption" value={3250} unit="W" variant="tertiary" />
  </div>
)
