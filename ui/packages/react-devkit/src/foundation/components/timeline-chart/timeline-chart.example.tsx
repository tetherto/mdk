/**
 * Runnable example for TimelineChart.
 */
import { TimelineChart } from '@tetherto/mdk-react-devkit'

const NOW = Date.now()
const HOUR = 60 * 60 * 1000

const mockTimelineData = {
  labels: ['miner-01', 'miner-02', 'miner-03'],
  datasets: [
    {
      label: 'miner-01',
      data: [
        { x: [NOW - 6 * HOUR, NOW - 4 * HOUR], y: 'miner-01', mode: 'normal' },
        { x: [NOW - 4 * HOUR, NOW - HOUR], y: 'miner-01', mode: 'boost' },
      ],
    },
    {
      label: 'miner-02',
      data: [{ x: [NOW - 6 * HOUR, NOW], y: 'miner-02', mode: 'normal' }],
    },
  ],
}

export const TimelineChartExample = () => {
  return (
    <TimelineChart
      initialData={mockTimelineData as never}
      range={{ min: NOW - 6 * HOUR, max: NOW }}
      title="Miner activity"
      height={240}
    />
  )
}
