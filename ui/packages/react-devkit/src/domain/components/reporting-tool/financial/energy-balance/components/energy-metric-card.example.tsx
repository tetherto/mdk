import { CURRENCY, UNITS } from '@primitives'

import { EnergyMetricCard } from '@tetherto/mdk-react-devkit'

export const EnergyMetricCardExample = () => (
  <div className="mdk-example-row">
    <EnergyMetricCard
      name="Avg Energy Cost"
      value={38.2}
      unit={`${CURRENCY.USD}/${UNITS.ENERGY_MWH}`}
    />
    <EnergyMetricCard name="Avg Power Consumption" value={11.8} unit={UNITS.ENERGY_MW} />
    <EnergyMetricCard name="Curtailment Rate" value={3.2} unit={UNITS.PERCENT} fallback="0" />
  </div>
)
