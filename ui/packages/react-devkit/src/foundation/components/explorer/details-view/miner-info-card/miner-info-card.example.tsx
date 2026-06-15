import { MinerInfoCard } from '@tetherto/mdk-react-devkit'

const info = [
  { label: 'Serial', value: 'SN-001234' },
  { label: 'Model', value: 'Antminer S19' },
  { label: 'Firmware', value: '1.0.2' },
  { label: 'Location', value: 'Rack A / Slot 3' },
]

export const MinerInfoCardExample = () => (
  <div className="mdk-example-row">
    <MinerInfoCard data={info} label="Miner info" />
  </div>
)
