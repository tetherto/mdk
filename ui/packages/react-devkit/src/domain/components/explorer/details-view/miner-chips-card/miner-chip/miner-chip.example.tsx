import { MinerChip } from '@tetherto/mdk-react-devkit'

export const MinerChipExample = () => (
  <div className="mdk-example-row">
    <MinerChip index={0} frequency={{ current: 620 }} temperature={{ avg: 65, min: 62, max: 68 }} />
    <MinerChip index={1} frequency={{ current: 615 }} temperature={{ avg: 67, min: 64, max: 70 }} />
  </div>
)
