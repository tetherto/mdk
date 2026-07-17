import { OperationsEnergyCostChart } from '@tetherto/mdk-react-devkit/primitives'

export const OperationsEnergyCostChartExample = () => (
  <div className="mdk-example-row">
    <OperationsEnergyCostChart
      data={{
        energyCostsUSD: 500,
        operationalCostsUSD: 1000,
      }}
    />
  </div>
)
