import { Button } from '@tetherto/mdk-react-devkit/core'
import type { DataTableRowSelectionState, LocalFilters } from '@tetherto/mdk-react-devkit/core'
import { DeviceExplorer } from '@tetherto/mdk-react-devkit/foundation'
import type {
  DeviceExplorerDeviceData,
  DeviceExplorerDeviceType,
} from '@tetherto/mdk-react-devkit/foundation'
import { useState } from 'react'
import type { JSX } from 'react'
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
        onDeviceTypeChange={(type: DeviceExplorerDeviceType) => {
          setDeviceType(type)
        }}
        searchOptions={searchOptions}
        searchTags={searchTags}
        onSearchTagsChange={(tags: string[]) => {
          setSearchTags(tags)
        }}
        filterOptions={filterOptions}
        onFiltersChange={(value: LocalFilters) => {
          console.warn('new filters: ', value)
        }}
        onSelectedDevicesChange={(selections: DataTableRowSelectionState) => {
          console.warn('new selections: ', selections)
        }}
        getFormattedDate={(date: Date) => {
          return date.toISOString()
        }}
        renderAction={(_device: DeviceExplorerDeviceData): React.ReactNode => {
          return <Button>Action</Button>
        }}
      />
    </section>
  )
}
