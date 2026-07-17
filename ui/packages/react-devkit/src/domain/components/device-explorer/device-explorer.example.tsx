/**
 * Runnable example for DeviceExplorer.
 */
import { useState } from 'react'
import { DeviceExplorer, type DeviceExplorerDeviceType } from '@tetherto/mdk-react-devkit'

const mockMiners = [
  {
    id: 'miner-01',
    code: 1,
    macAddress: 'AA:BB:CC:00:00:01',
    status: 'online',
    container: 'cont-A',
    ip: '10.0.0.11',
    hashrate: 102.4,
    powerW: 3200,
    lastActive: Date.now() - 60_000,
  },
  {
    id: 'miner-02',
    code: 2,
    macAddress: 'AA:BB:CC:00:00:02',
    status: 'warning',
    container: 'cont-A',
    ip: '10.0.0.12',
    hashrate: 95.1,
    powerW: 3450,
    lastActive: Date.now() - 600_000,
  },
]

const filterOptions = {
  status: [
    { label: 'Online', value: 'online' },
    { label: 'Warning', value: 'warning' },
    { label: 'Offline', value: 'offline' },
  ],
}

const searchOptions = [{ label: 'Miner ID', value: 'id' }]

export const DeviceExplorerExample = () => {
  const [deviceType, setDeviceType] = useState<DeviceExplorerDeviceType>('miner')
  const [searchTags, setSearchTags] = useState<string[]>([])
  const [filters, setFilters] = useState({})

  return (
    <DeviceExplorer
      deviceType={deviceType}
      onDeviceTypeChange={(type) => setDeviceType(type)}
      data={mockMiners as never}
      filters={filters as never}
      filterOptions={filterOptions as never}
      onFiltersChange={setFilters as never}
      searchOptions={searchOptions as never}
      searchTags={searchTags}
      onSearchTagsChange={setSearchTags}
      getFormattedDate={(ts) => new Date(Number(ts)).toLocaleString()}
      renderAction={() => null}
    />
  )
}
