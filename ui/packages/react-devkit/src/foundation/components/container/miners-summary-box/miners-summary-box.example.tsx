import { MinersSummaryBox } from '@tetherto/mdk-react-devkit'

export const MinersSummaryBoxExample = () => (
  <div className="mdk-example-row">
    <MinersSummaryBox
      params={[
        { label: 'Hash Rate', value: '1.24 PH/s' },
        { label: 'Efficiency', value: '32.5 W/TH/s' },
        { label: 'Max Temp', value: '72 °C' },
        { label: 'Online', value: '47 / 50' },
      ]}
    />
  </div>
)
