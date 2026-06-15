/**
 * Runnable example for LineChartCard.
 */
import { LineChartCard, type LineChartCardData } from '@tetherto/mdk-react-devkit'

const NOW = Date.now()
const MS_PER_MIN = 60 * 1000

const points = Array.from({ length: 90 }, (_, i) => ({
  x: Math.floor((NOW - (90 - i) * MS_PER_MIN) / 1000),
  y: 50 + Math.sin(i / 8) * 6 + Math.random() * 1.2,
}))

const chartData: LineChartCardData = {
  datasets: [
    {
      label: 'Pool A',
      borderColor: '#4f9ef5',
      data: points,
    },
  ],
  minMaxAvg: { min: '44', max: '58', avg: '51' },
  highlightedValue: { value: 52.3, unit: 'TH/s' },
}

const timelineOptions = [
  { label: '5m', value: '5m' },
  { label: '1h', value: '1h' },
  { label: '1d', value: '1D' },
]

export const LineChartCardExample = () => {
  return (
    <LineChartCard
      title="Hashrate"
      data={chartData}
      timelineOptions={timelineOptions}
      defaultTimeline="5m"
      minHeight={320}
    />
  )
}
