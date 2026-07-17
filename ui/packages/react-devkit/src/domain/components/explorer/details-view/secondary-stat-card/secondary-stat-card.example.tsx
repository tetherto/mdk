import { SecondaryStatCard } from '@tetherto/mdk-react-devkit'

export const SecondaryStatCardExample = () => (
  <div className="mdk-example-row">
    <SecondaryStatCard name="Efficiency" value="92%" />
    <SecondaryStatCard name="Uptime" value={99.8} />
    <SecondaryStatCard name="Hashrate" value="95.5 TH/s" />
  </div>
)
