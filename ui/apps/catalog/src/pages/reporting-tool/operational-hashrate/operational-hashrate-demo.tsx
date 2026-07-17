import type { HashrateDateRange, HashrateGroupedLog } from '@tetherto/mdk-react-devkit/domain'
import { Hashrate } from '@tetherto/mdk-react-devkit/domain'
import { endOfDay, startOfDay, subDays } from 'date-fns'
import { useCallback, useMemo, useState } from 'react'

import { DemoPageHeader } from '../../../components/demo-page-header'

const NOW = Date.now()
const DAY_MS = 86_400_000

// 14 days of mock data for the site-view trend.
const MOCK_MINER_LOG: HashrateGroupedLog = Array.from({ length: 14 }, (_, i) => ({
  ts: NOW - (13 - i) * DAY_MS,
  hashrateMhs: {
    'miner-am-s19xp': 5_000_000 + Math.sin(i / 2) * 200_000,
    'miner-wm-m56s': 3_200_000 + Math.cos(i / 2) * 150_000,
    'miner-av-a1346': 1_800_000 + Math.sin(i / 3) * 100_000,
    'miner-demo-m1': 900_000,
  },
}))

// Single latest snapshot for the mining-unit bar chart (container-grouped).
const MOCK_CONTAINER_LOG: HashrateGroupedLog = [
  {
    ts: NOW,
    hashrateMhs: {
      'bitdeer-1a': 4_200_000,
      'bitdeer-4a': 2_100_000,
      'bitdeer-9b': 3_500_000,
      'microbt-1': 2_800_000,
      'bitmain-imm-1': 5_100_000,
      // BE-leaked keys - utils layer drops these before they reach the chart.
      maintenance: 0,
      'group-1': 1_000_000,
    },
  },
]

const buildDefaultRange = (): HashrateDateRange => {
  const yesterday = subDays(new Date(), 1)
  return {
    start: startOfDay(subDays(yesterday, 6)).getTime(),
    end: endOfDay(yesterday).getTime(),
  }
}

export const OperationalHashrateDemo = () => {
  const defaultRange = useMemo(buildDefaultRange, [])

  const [siteRange, setSiteRange] = useState<HashrateDateRange>(defaultRange)
  const [minerTypeRange, setMinerTypeRange] = useState<HashrateDateRange>(defaultRange)
  const [miningUnitRange, setMiningUnitRange] = useState<HashrateDateRange>(defaultRange)

  const resetSite = useCallback(() => setSiteRange(defaultRange), [defaultRange])
  const resetMinerType = useCallback(() => setMinerTypeRange(defaultRange), [defaultRange])
  const resetMiningUnit = useCallback(() => setMiningUnitRange(defaultRange), [defaultRange])

  return (
    <section className="demo-section">
      <DemoPageHeader
        title="Operational Hashrate"
        description="Tabbed hashrate report - site trend, miner-type drilldown, and mining-unit drilldown. Each tab fetches independently (different groupBy axes) and owns its own filter state internally."
      />
      <Hashrate
        siteView={{
          log: MOCK_MINER_LOG,
          isLoading: false,
          dateRange: siteRange,
          onDateRangeChange: setSiteRange,
          onReset: resetSite,
        }}
        minerTypeView={{
          log: MOCK_MINER_LOG,
          isLoading: false,
          dateRange: minerTypeRange,
          onDateRangeChange: setMinerTypeRange,
          onReset: resetMinerType,
        }}
        miningUnitView={{
          log: MOCK_CONTAINER_LOG,
          isLoading: false,
          dateRange: miningUnitRange,
          onDateRangeChange: setMiningUnitRange,
          onReset: resetMiningUnit,
        }}
      />
    </section>
  )
}
