import type { PowerModeTimelineEntry } from '@tetherto/mdk-foundation-ui'
import { generateTimelineData } from './power-mode-timeline-chart-page.utils'

const NOW = Date.now()
const MIN_5 = 5 * 60 * 1000
const HOUR = 60 * 60 * 1000

const MINERS = [
  'm221-gabbani-1-miner1',
  'm221-gabbani-1-miner2',
  'm221-gabbani-2-miner1',
  'm221-gabbani-2-miner2',
  'm221-gabbani-3-miner1',
]

const POWER_MODES = ['sleep', 'low', 'normal', 'high'] as const
const STATUSES = ['mining', 'idle', 'offline', 'error'] as const

export const DATA_24H = generateTimelineData(
  MINERS,
  288,
  MIN_5,
  NOW - 288 * MIN_5,
  POWER_MODES,
  STATUSES,
)

export const DATA_1H = generateTimelineData(
  MINERS.slice(0, 3),
  60,
  60 * 1000,
  NOW - 60 * 60 * 1000,
  POWER_MODES,
  STATUSES,
)

export const DATA_STEADY = ((): PowerModeTimelineEntry[] => {
  const data: PowerModeTimelineEntry[] = []
  const startTime = NOW - HOUR

  for (let i = 0; i < 60; i++) {
    const ts = startTime + i * 60 * 1000
    data.push({
      ts,
      power_mode_group_aggr: {
        'miner-a': 'normal',
        'miner-b': i < 30 ? 'low' : 'high',
      },
      status_group_aggr: {
        'miner-a': 'mining',
        'miner-b': 'mining',
      },
    })
  }

  return data
})()

export const DATA_SINGLE_MINER = generateTimelineData(
  ['single-miner'],
  120,
  60 * 1000,
  NOW - 120 * 60 * 1000,
  POWER_MODES,
  STATUSES,
)

export const DATA_MANY_MINERS = generateTimelineData(
  Array.from({ length: 15 }, (_, i) => `miner-rack${Math.floor(i / 5) + 1}-${(i % 5) + 1}`),
  144,
  MIN_5,
  NOW - 144 * MIN_5,
  POWER_MODES,
  STATUSES,
)
