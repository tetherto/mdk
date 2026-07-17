/**
 * Runnable example for LineChart.
 */
import { LineChart } from '@tetherto/mdk-react-devkit'

const NOW = Date.now()
const MIN = 60 * 1000

const points = Array.from({ length: 90 }, (_, i) => ({
  x: NOW - (90 - i) * MIN,
  y: 50 + Math.sin(i / 8) * 6 + Math.random() * 1.2,
}))

const data = {
  datasets: [
    {
      label: 'Hashrate',
      borderColor: '#4f9ef5',
      borderWidth: 2,
      data: points,
    },
  ],
}

export const LineChartExample = () => {
  return <LineChart data={data} height={320} unit="TH/s" />
}
