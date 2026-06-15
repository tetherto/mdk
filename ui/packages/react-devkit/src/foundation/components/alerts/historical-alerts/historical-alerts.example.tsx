/**
 * Runnable example for HistoricalAlerts.
 *
 * Wrap the page in `<MdkProvider>` so the `useTimezoneFormatter` hook used by
 * the table can read the timezone store.
 */
import { useState } from 'react'
import type { Alert } from '@tetherto/mdk-react-devkit'
import { HistoricalAlerts } from '@tetherto/mdk-react-devkit'

const NOW = Date.now()
const DAY = 24 * 60 * 60 * 1000

const mockAlerts: Alert[] = [
  {
    id: '1',
    uuid: 'alrt-1',
    severity: 'critical',
    name: 'miner_offline',
    description: 'Miner 0xA1 has stopped reporting.',
    code: '001',
    createdAt: NOW - 2 * DAY,
    thing: { id: 'miner-A1' },
  },
  {
    id: '2',
    uuid: 'alrt-2',
    severity: 'warning',
    name: 'temp_high',
    description: 'Container 03 exceeded 78°C.',
    code: '002',
    createdAt: NOW - 5 * DAY,
    thing: { id: 'container-03' },
  },
]

export const HistoricalAlertsExample = () => {
  const [range, setRange] = useState({ start: NOW - 7 * DAY, end: NOW })

  return (
    <HistoricalAlerts
      alerts={mockAlerts}
      isLoading={false}
      localFilters={{}}
      filterTags={[]}
      dateRange={range}
      onDateRangeChange={setRange}
      onAlertClick={(id) => {
        // eslint-disable-next-line no-console
        console.log(`open alert ${id}`)
      }}
    />
  )
}
