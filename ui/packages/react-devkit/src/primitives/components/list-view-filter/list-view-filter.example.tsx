/**
 * Runnable example for ListViewFilter.
 */
import { useState } from 'react'
import { ListViewFilter } from '@tetherto/mdk-react-devkit'
import type { CascaderValue, LocalFilters } from '@tetherto/mdk-react-devkit'

const FILTER_OPTIONS = [
  {
    value: 'type',
    label: 'Type',
    children: [
      { value: 'Antminer S19XP', label: 'Antminer S19XP' },
      { value: 'Avalon A1346', label: 'Avalon A1346' },
      { value: 'Whatsminer M50', label: 'Whatsminer M50' },
    ],
  },
  {
    value: 'status',
    label: 'Status',
    children: [
      { value: 'active', label: 'Active' },
      { value: 'offline', label: 'Offline' },
      { value: 'sleeping', label: 'Sleeping' },
    ],
  },
  {
    value: 'location',
    label: 'Location',
    children: [
      { value: 'row-a', label: 'Row A' },
      { value: 'row-b', label: 'Row B' },
    ],
  },
]

function selectionToFilters(selections: CascaderValue[]): LocalFilters {
  const result: Record<string, string[]> = {}
  for (const [key, value] of selections as [string, string][]) {
    if (!result[key]) result[key] = []
    result[key].push(value)
  }
  return result
}

export const ListViewFilterExample = () => {
  const [filters, setFilters] = useState<LocalFilters>({})

  const handleChange = (selections: CascaderValue[]) => {
    setFilters(selectionToFilters(selections))
  }

  let activeCount = 0
  for (const v of Object.values(filters)) {
    activeCount += Array.isArray(v) ? (v as unknown[]).length : 1
  }

  return (
    <div className="mdk-example-row" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ListViewFilter options={FILTER_OPTIONS} localFilters={filters} onChange={handleChange} />
        <span style={{ fontSize: 13, color: 'var(--mdk-color-text-secondary, #888)' }}>
          {activeCount > 0 ? `${activeCount} filter(s) active` : 'No filters active'}
        </span>
      </div>

      {/* Pre-seeded with one filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ListViewFilter
          options={FILTER_OPTIONS}
          localFilters={{ status: ['active'] }}
          onChange={() => undefined}
        />
        <span style={{ fontSize: 13, color: 'var(--mdk-color-text-secondary, #888)' }}>
          Pre-seeded: status=active
        </span>
      </div>
    </div>
  )
}
