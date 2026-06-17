import { OperationsEnergyCostChart } from '@tetherto/mdk-react-devkit/core'

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
