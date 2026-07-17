import { EnergyBalancePowerChart, type ThresholdLineChartInput } from '@tetherto/mdk-react-devkit'

const exampleChartInput: ThresholdLineChartInput = {
  series: [],
}

export const EnergyBalancePowerChartExample = () => (
  <div className="mdk-example-col">
    <div className="mdk-example-row">
      <EnergyBalancePowerChart chartInput={exampleChartInput} periodType="month" />
    </div>
    <div className="mdk-example-row mdk-example-mosaic-cell mdk-energy-balance__revenue-mosaic-power">
      <EnergyBalancePowerChart chartInput={exampleChartInput} periodType="month" fillHeight />
    </div>
  </div>
)
