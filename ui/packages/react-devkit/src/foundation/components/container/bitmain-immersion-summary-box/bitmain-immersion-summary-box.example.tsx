import { BitMainImmersionSummaryBox } from '@tetherto/mdk-react-devkit'

const mockDevice = {
  id: 'container-01',
  status: 'mining',
  container_specific: {
    primary_supply_temp: 38,
    second_supply_temp1: 41,
    second_supply_temp2: 39,
    second_pump1: true,
    second_pump2: true,
    second_pump1_fault: false,
    second_pump2_fault: false,
    one_pump: false,
  },
  stats: { power_consumption: 250000 },
} as never

export const BitMainImmersionSummaryBoxExample = () => (
  <div className="mdk-example-row">
    <BitMainImmersionSummaryBox data={mockDevice} />
  </div>
)
