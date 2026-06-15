import { EnergyBalanceCostMetrics } from '@tetherto/mdk-react-devkit'

export const EnergyBalanceCostMetricsExample = () => (
  <div className="mdk-example-row">
    <EnergyBalanceCostMetrics
      metrics={{
        avgPowerConsumption: 11.8,
        avgEnergyCost: 38.2,
        avgAllInCost: 42.5,
        avgPowerAvailability: 12.5,
        avgOperationsCost: 4.3,
        avgEnergyRevenue: 55.0,
      }}
    />
  </div>
)
