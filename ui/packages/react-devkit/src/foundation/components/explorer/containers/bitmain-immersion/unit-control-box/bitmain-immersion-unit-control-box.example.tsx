import { BitMainImmersionUnitControlBox } from '@tetherto/mdk-react-devkit'

export const BitMainImmersionUnitControlBoxExample = () => (
  <div className="mdk-example-row">
    <BitMainImmersionUnitControlBox
      title="Pump 1"
      running={true}
      frequency={50}
      alarmStatus={false}
    />
    <BitMainImmersionUnitControlBox
      title="Dry Cooler"
      isDryCooler={true}
      running={false}
      alarmStatus={true}
    />
  </div>
)
