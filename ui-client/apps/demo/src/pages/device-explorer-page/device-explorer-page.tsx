import { Button } from '@mdk/core'
import type { DataTableRowSelectionState, LocalFilters } from '@mdk/core'
import { DeviceExplorer } from '@mdk/foundation'
import type { DeviceExplorerDeviceData, DeviceExplorerDeviceType } from '@mdk/foundation'
import { useState } from 'react'
import { cabinetData, containerData, minersData } from './mock-data'

export const DeviceExplorerPage = (): JSX.Element => {
  const filterOptions = [
    {
      value: 'type',
      label: 'Device Type',
      children: [
        { value: 'Model X-100', label: 'Model X-100' },
        { value: 'Model X-200', label: 'Model X-200' },
        { value: 'Model Y-300', label: 'Model Y-300' },
        { value: 'Model Z-150', label: 'Model Z-150' },
        { value: 'Model Z-250', label: 'Model Z-250' },
        { value: 'Model Z-350', label: 'Model Z-350' },
      ],
    },
    {
      value: 'status',
      label: 'Status',
      children: [
        { value: 'online', label: 'Online' },
        { value: 'offline', label: 'Offline' },
        { value: 'maintenance', label: 'Maintenance' },
        { value: 'error', label: 'Error' },
      ],
    },
  ]

  const searchOptions = [
    {
      value: 'search-option-1',
      label: 'Search Option 1',
    },
    {
      value: 'search-option-2',
      label: 'Search Option 2',
    },
  ]

  const [searchTags, setSearchTags] = useState<string[]>([])
  const [deviceType, setDeviceType] = useState<DeviceExplorerDeviceType>('container')

  const data =
    deviceType === 'cabinet' ? cabinetData : deviceType === 'container' ? containerData : minersData

  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Device Explorer</h2>
      <DeviceExplorer
        data={data}
        deviceType={deviceType}
        onDeviceTypeChange={function (type: DeviceExplorerDeviceType): void {
          setDeviceType(type)
        }}
        searchOptions={searchOptions}
        searchTags={searchTags}
        onSearchTagsChange={function (tags: string[]): void {
          setSearchTags(tags)
        }}
        filterOptions={filterOptions}
        onFiltersChange={function (value: LocalFilters): void {
          console.warn('new filters: ', value)
        }}
        onSelectedDevicesChange={function (selections: DataTableRowSelectionState): void {
          console.warn('new selections: ', selections)
        }}
        getFormattedDate={function (date: Date): string {
          return date.toISOString()
        }}
        renderAction={function (_device: DeviceExplorerDeviceData): React.ReactNode {
          return <Button>Action</Button>
        }}
      />
    </section>
  )
}
