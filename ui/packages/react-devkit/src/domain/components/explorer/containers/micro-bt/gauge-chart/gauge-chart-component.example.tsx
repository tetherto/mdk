import { GaugeChartComponent } from '@tetherto/mdk-react-devkit'

export const GaugeChartComponentExample = () => (
  <div className="mdk-example-row">
    <GaugeChartComponent max={100} value={72} label="Temperature" unit="°C" />
    <GaugeChartComponent max={10} value={3.5} label="Pressure" unit="bar" />
  </div>
)
