import { ListViewFilter, Tabs, TabsList, TabsTrigger, TagInput } from '@primitives'
import type { CascaderValue, LocalFilters } from '@primitives'
import { DEVICE_EXPLORER_DEVICE_TYPE } from './types'
import type {
  DeviceExplorerDeviceType,
  DeviceExplorerFilterOption,
  DeviceExplorerSearchOption,
} from './types'

import type { JSX } from 'react'

export type DeviceExplorerToolbarProps = {
  filters: LocalFilters
  filterOptions: DeviceExplorerFilterOption[]
  onFiltersChange: (value: CascaderValue[]) => void
  searchOptions: DeviceExplorerSearchOption[]
  searchTags: string[]
  onSearchTagsChange: (tags: string[]) => void
  deviceType: DeviceExplorerDeviceType
  onDeviceTypeChange: (type: DeviceExplorerDeviceType) => void
}

const deviceTypeTabs = [
  {
    value: DEVICE_EXPLORER_DEVICE_TYPE.CONTAINER,
    label: 'Containers',
  },
  {
    value: DEVICE_EXPLORER_DEVICE_TYPE.MINER,
    label: 'Miners',
  },
  {
    value: DEVICE_EXPLORER_DEVICE_TYPE.CABINET,
    label: 'Cabinets',
  },
] as const

export const DeviceExplorerToolbar = ({
  filters,
  filterOptions,
  onFiltersChange,
  searchOptions,
  searchTags,
  onSearchTagsChange,
  deviceType,
  onDeviceTypeChange,
}: DeviceExplorerToolbarProps): JSX.Element => {
  const showFilter = filterOptions.length > 0

  return (
    <div className="mdk-device-explorer__toolbar">
      {showFilter && (
        <ListViewFilter
          localFilters={filters}
          options={filterOptions}
          onChange={onFiltersChange}
          className="mdk-device-explorer__toolbar__filter"
        />
      )}
      <TagInput
        allowCustomTags
        placeholder="Search"
        options={searchOptions}
        onTagsChange={onSearchTagsChange}
        value={searchTags}
        variant="search"
        className="mdk-device-explorer__toolbar__search"
      />
      <Tabs
        value={deviceType}
        onValueChange={(value) => onDeviceTypeChange(value as DeviceExplorerDeviceType)}
        className="mdk-device-explorer__toolbar__tabs"
      >
        <TabsList variant="side" className="mdk-device-explorer__toolbar__tabs-list">
          {deviceTypeTabs.map(({ label, value }) => (
            <TabsTrigger
              key={value}
              value={value}
              variant="side"
              className="mdk-device-explorer__toolbar__tab-trigger"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
