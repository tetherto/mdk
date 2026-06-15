import { StatusItem } from '@tetherto/mdk-react-devkit'

export const StatusItemExample = () => (
  <div className="mdk-example-row">
    <StatusItem label="Circulation Pump" status="normal" />
    <StatusItem label="Exhaust Fan" status="fault" />
    <StatusItem label="Dry Cooler" status="warning" />
  </div>
)
