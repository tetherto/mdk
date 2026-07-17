import { MicroBTWidgetBox } from '@tetherto/mdk-react-devkit'

const mockDevice = {
  container_specific: {
    cdu: {
      circulation_pump_running_status: 'running',
      cooling_fan_control: true,
    },
  },
} as never

export const MicroBTWidgetBoxExample = () => (
  <div className="mdk-example-row">
    <MicroBTWidgetBox data={mockDevice} />
  </div>
)
