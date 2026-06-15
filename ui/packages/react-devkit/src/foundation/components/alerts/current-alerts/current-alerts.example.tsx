/**
 * Runnable example for CurrentAlerts.
 */
import { useState } from 'react'
import { CurrentAlerts } from '@tetherto/mdk-react-devkit'

// The component derives its rows from a raw `devices` payload (`device.last.alerts`).
// We use `any` casts on the mock to avoid duplicating the long `Device` type here —
// the production code expects a `Device[][]` from the App Node API.
const mockDevices = [
  [
    {
      id: 'miner-A1',
      last: {
        alerts: [
          {
            id: '1',
            uuid: 'alrt-1',
            severity: 'critical',
            name: 'miner_offline',
            description: 'Miner 0xA1 has stopped reporting.',
            code: '001',
            createdAt: Date.now() - 2 * 60 * 1000,
          },
        ],
      },
    },
  ],
]

export const CurrentAlertsExample = () => {
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [localFilters, setLocalFilters] = useState({})

  return (
    <CurrentAlerts
      devices={mockDevices as never}
      isLoading={false}
      localFilters={localFilters}
      onLocalFiltersChange={setLocalFilters}
      filterTags={filterTags}
      onFilterTagsChange={setFilterTags}
      onAlertClick={(id) => {
        // eslint-disable-next-line no-console
        console.log(`open alert ${id}`)
      }}
      isDemoMode
    />
  )
}
