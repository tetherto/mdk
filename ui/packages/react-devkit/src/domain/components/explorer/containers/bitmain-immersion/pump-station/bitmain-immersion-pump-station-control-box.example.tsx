import { BitMainImmersionPumpStationControlBox } from '@tetherto/mdk-react-devkit'

export const BitMainImmersionPumpStationControlBoxExample = () => (
  <div className="mdk-example-row">
    <BitMainImmersionPumpStationControlBox
      title="Pump Station A"
      ready={true}
      operation={true}
      start={true}
      alarmStatus={false}
    />
    <BitMainImmersionPumpStationControlBox
      title="Pump Station B"
      ready={false}
      operation={false}
      start={false}
      alarmStatus={true}
    />
  </div>
)
