import { DowntimeChart } from '@tetherto/mdk-react-devkit'

const exampleChartData = {
  labels: [],
  datasets: [],
  isEmpty: true,
}

export const DowntimeChartExample = () => (
  <div className="mdk-example-col">
    <div className="mdk-example-row">
      <DowntimeChart chartData={exampleChartData} />
    </div>
    <div className="mdk-example-row mdk-example-mosaic-cell mdk-energy-balance__revenue-left">
      <DowntimeChart chartData={exampleChartData} fillHeight />
    </div>
  </div>
)
