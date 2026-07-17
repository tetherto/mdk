import { BitdeerTankTempCharts } from '@tetherto/mdk-react-devkit'

export const BitdeerTankTempChartsExample = () => (
  <div className="mdk-example-row">
    <BitdeerTankTempCharts tag="container-01" tankNumber={1} data={undefined} timeline="24h" />
  </div>
)
