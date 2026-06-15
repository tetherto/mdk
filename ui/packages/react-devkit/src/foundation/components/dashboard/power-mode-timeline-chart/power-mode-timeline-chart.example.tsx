/**
 * Runnable example for PowerModeTimelineChart.
 */
import { PowerModeTimelineChart } from '@tetherto/mdk-react-devkit'

const NOW = Date.now() / 1000
const HOUR = 60 * 60

const mockEntries = [
  { ts: NOW - 6 * HOUR, mode: 'normal', id: 'miner-01' },
  { ts: NOW - 4 * HOUR, mode: 'boost', id: 'miner-01' },
  { ts: NOW - 2 * HOUR, mode: 'normal', id: 'miner-01' },
]

export const PowerModeTimelineChartExample = () => {
  return <PowerModeTimelineChart data={mockEntries as never} timezone="UTC" title="Power mode" />
}
