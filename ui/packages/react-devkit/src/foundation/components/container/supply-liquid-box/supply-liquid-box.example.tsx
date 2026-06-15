import { SupplyLiquidBox } from '@tetherto/mdk-react-devkit'

const mockDevice = {
  last: {
    snap: {
      stats: { status: 'mining' },
      container_specific: {
        supply_liquid_pressure: 1.4,
        supply_temp: 35,
      },
    },
  },
} as never

export const SupplyLiquidBoxExample = () => (
  <div className="mdk-example-row">
    <SupplyLiquidBox data={mockDevice} />
  </div>
)
