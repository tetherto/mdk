import { DeviceExplorer, ExplorerLayout } from '@tetherto/mdk-react-devkit/domain'
import type { DeviceExplorerDeviceType } from '@tetherto/mdk-react-devkit/domain'
import { EmptyState } from '@tetherto/mdk-react-devkit/primitives'
import type { DataTableRowSelectionState, LocalFilters } from '@tetherto/mdk-react-devkit/primitives'
import { useState } from 'react'
import type { JSX } from 'react'

import { DemoPageHeader } from '../components/demo-page-header'
import { containerData, minersData } from './device-explorer-page/mock-data'

const filterOptions = [
  {
    value: 'status',
    label: 'Status',
    children: [
      { value: 'online', label: 'Online' },
      { value: 'offline', label: 'Offline' },
      { value: 'error', label: 'Error' },
    ],
  },
]

const searchOptions = [{ value: 'name', label: 'Name' }]

const noop = (): void => {}

export const ExplorerPage = (): JSX.Element => {
  const [deviceType, setDeviceType] = useState<DeviceExplorerDeviceType>('container')
  const [searchTags, setSearchTags] = useState<string[]>([])
  const [selected, setSelected] = useState<DataTableRowSelectionState>({})

  const data = deviceType === 'miner' ? minersData : containerData
  const selectedIds = Object.keys(selected).filter((id) => selected[id])
  const hasSelection = selectedIds.length > 0

  const detail = hasSelection ? (
    <div className="explorer-page__detail">
      <h3>Details</h3>
      <p>{selectedIds.length} selected</p>
      <ul>
        {selectedIds.map((id) => (
          <li key={id}>{id}</li>
        ))}
      </ul>
    </div>
  ) : (
    <EmptyState description="Select a row to see its details" />
  )

  return (
    <div>
      <DemoPageHeader
        title="Explorer"
        description="Read-only list + detail split. The list column reuses DeviceExplorer (container / miner tabs, searchable + sortable table); selecting a row reveals the sticky detail column. Presentational — the shell page owns data, selection, and routing."
      />

      <ExplorerLayout
        hasSelection={hasSelection}
        detail={detail}
        list={
          <DeviceExplorer
            data={data}
            deviceType={deviceType}
            onDeviceTypeChange={setDeviceType}
            searchOptions={searchOptions}
            searchTags={searchTags}
            onSearchTagsChange={setSearchTags}
            filterOptions={filterOptions}
            onFiltersChange={noop as (value: LocalFilters) => void}
            selectedDevices={selected}
            onSelectedDevicesChange={setSelected}
            getFormattedDate={(date: Date) => date.toISOString()}
            renderAction={() => null}
          />
        }
      />
    </div>
  )
}
