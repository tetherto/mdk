import { MinerPowerModeSelectionButtons } from '@tetherto/mdk-react-devkit'

export const MinerPowerModeSelectionButtonsExample = () => (
  <div className="mdk-example-row">
    <MinerPowerModeSelectionButtons
      selectedDevices={[]}
      setPowerMode={(_devices, mode) => console.warn('mode', mode)}
      disabled={false}
    />
  </div>
)
