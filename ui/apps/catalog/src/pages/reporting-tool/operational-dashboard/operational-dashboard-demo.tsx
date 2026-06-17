import type { DashboardDateRange, UseOperationsDashboardInput } from '@tetherto/mdk-react-devkit/foundation'
import {
  DashboardDateRangePicker,
  OperationalDashboard,
  useOperationsDashboard,
} from '@tetherto/mdk-react-devkit/foundation'
import { endOfDay, startOfDay, subDays } from 'date-fns'
import { useState } from 'react'

import { DemoPageHeader } from '../../../components/demo-page-header'

const NOW = Date.now()
const DAY_MS = 86_400_000

const trend = (base: number, step: number, wobble: number) =>
  Array.from({ length: 7 }, (_, i) => ({
    ts: NOW - (6 - i) * DAY_MS,
    value: base + i * step + Math.sin(i) * wobble,
  }))

// Mock buckets in base units: hashrate MH/s, consumption W, efficiency W/TH/s.
const MOCK_INPUT: UseOperationsDashboardInput = {
  hashrate: { log: trend(95_000_000, 1_500_000, 800_000), nominalValue: 110_000_000 },
  consumption: { log: trend(38_000_000, 350_000, 300_000), nominalValue: 45_000_000 },
  efficiency: { log: trend(21, 0.2, 0.4), nominalValue: 19 },
  miners: {
    log: Array.from({ length: 7 }, (_, i) => ({
      ts: NOW - (6 - i) * DAY_MS,
      online: 1200 - i * 4,
      error: 10 + i,
      offline: 8,
      sleep: 20,
      maintenance: 4,
    })),
  },
}

const buildDefaultRange = (): DashboardDateRange => {
  const yesterday = subDays(new Date(), 1)
  return {
    start: startOfDay(subDays(yesterday, 6)).getTime(),
    end: endOfDay(yesterday).getTime(),
  }
}

export const OperationalDashboardDemo = () => {
  const [range, setRange] = useState<DashboardDateRange>(buildDefaultRange)
  const viewModel = useOperationsDashboard(MOCK_INPUT)

  return (
    <section className="demo-section">
      <DemoPageHeader
        title="Operational Dashboard"
        description="Four site-operations charts in an expandable 2x2 grid - hashrate, power consumption and site efficiency trends (with nominal reference lines) plus a stacked miners-status breakdown. Pure presentation fed by useOperationsDashboard."
      />
      <OperationalDashboard
        {...viewModel}
        controls={<DashboardDateRangePicker value={range} onChange={setRange} />}
      />
    </section>
  )
}
