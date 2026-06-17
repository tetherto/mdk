import { AverageDowntimeChart } from '@tetherto/mdk-react-devkit/core'

export const AverageDowntimeChartExample = () => (
  <div className="mdk-example-row">
    <AverageDowntimeChart
      data={{
        labels: ['Mon', 'Tue', 'Wed'],
        curtailment: [0.02, 0.01, 0.03],
        operationalIssues: [0.05, 0.04, 0.06],
      }}
    />
  </div>
)
