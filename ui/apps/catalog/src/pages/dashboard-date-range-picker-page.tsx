import { DashboardDateRangePicker } from '@tetherto/mdk-react-devkit/foundation'
import type { JSX } from 'react'
import { useMemo, useState } from 'react'

import { DemoBlock } from '../components/demo-block'
import { DemoPageHeader } from '../components/demo-page-header'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

const formatRange = (start: number, end: number): string => {
  const fmt = (ms: number): string => new Date(ms).toISOString().slice(0, 10)
  return `${fmt(start)} → ${fmt(end)}`
}

export const DashboardDateRangePickerPage = (): JSX.Element => {
  const initial = useMemo(() => {
    const end = Date.now()
    return { start: end - ONE_DAY_MS, end }
  }, [])
  const [range, setRange] = useState(initial)

  return (
    <section className="demo-section">
      <DemoPageHeader
        title="Dashboard Date Range Picker"
        description="Wrapper around the core DateRangePicker that speaks { start, end } epoch milliseconds — drops straight into useDashboardDateRange from @tetherto/mdk-react-adapter."
      />

      <DemoBlock
        title="Default (dd/MM/yyyy)"
        description={`Selected: ${formatRange(range.start, range.end)}`}
      >
        <DashboardDateRangePicker value={range} onChange={setRange} />
      </DemoBlock>

      <DemoBlock
        title="Custom display format"
        description="Override the trigger format string — the underlying value is still { start, end } epoch ms."
      >
        <DashboardDateRangePicker value={range} onChange={setRange} dateFormat="MMM dd, yyyy" />
      </DemoBlock>

      <DemoBlock title="Disabled" description="Pass disabled to suppress the trigger entirely.">
        <DashboardDateRangePicker value={range} onChange={setRange} disabled />
      </DemoBlock>
    </section>
  )
}
