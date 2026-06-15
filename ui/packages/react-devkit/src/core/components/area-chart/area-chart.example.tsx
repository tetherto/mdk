/**
 * Runnable example for AreaChart.
 */
import { AreaChart } from '@tetherto/mdk-react-devkit'

const labels = Array.from({ length: 12 }, (_, i) => `m${i + 1}`)

const data = {
  labels,
  datasets: [
    {
      label: 'Pool A',
      borderColor: '#4f9ef5',
      data: labels.map((_, i) => 100 + Math.sin(i / 3) * 8 + Math.random() * 2),
    },
  ],
}

export const AreaChartExample = () => {
  return <AreaChart data={data} height={280} />
}
