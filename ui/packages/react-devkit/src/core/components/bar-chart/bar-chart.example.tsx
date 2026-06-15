/**
 * Runnable example for BarChart.
 */
import { BarChart } from '@tetherto/mdk-react-devkit'

const groupedData = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [
    {
      label: 'Foundry EU',
      data: [42, 38, 45, 50, 47, 30, 35],
      backgroundColor: '#F7931A',
    },
    {
      label: 'AntPool',
      data: [28, 32, 29, 35, 33, 25, 27],
      backgroundColor: '#4B9EFF',
    },
  ],
}

const stackedData = {
  labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
  datasets: [
    { label: 'Accepted', data: [320, 340, 310, 360], backgroundColor: '#34C759' },
    { label: 'Rejected', data: [12, 8, 15, 10], backgroundColor: '#FF3B30' },
  ],
}

export const BarChartExample = () => (
  <div className="mdk-example-col">
    <BarChart data={groupedData} height={220} />
    <BarChart data={stackedData} isStacked height={220} showDataLabels />
  </div>
)
