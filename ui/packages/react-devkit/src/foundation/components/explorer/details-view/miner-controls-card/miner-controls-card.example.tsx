import { MinerControlsCard } from '@tetherto/mdk-react-devkit'

export const MinerControlsCardExample = () => (
  <div className="mdk-example-row">
    <MinerControlsCard
      buttonsStates={{ reboot: false, start: false, stop: false }}
      isLoading={false}
    />
  </div>
)
