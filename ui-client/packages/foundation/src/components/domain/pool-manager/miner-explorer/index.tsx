import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'

import type { CascaderOption, DataTableRowSelectionState } from '@mdk/core'
import { cn, CoreAlert, Loader } from '@mdk/core'

import { CROSS_THING_TYPES } from '../../../../constants/devices'
import { useListViewFilters } from '../../../../hooks/use-list-view-filters'
import { useTimezone } from '../../../../hooks/use-timezone'
import type { Device } from '../../../../types'
import type { AvailableDevices } from '../../../../utils/action-utils'
import type { PoolConfigData } from '../hooks/use-pool-configs'
import { usePoolConfigs } from '../hooks/use-pool-configs'
import { MinerExplorerTable } from './miner-explorer-table'
import { MinerExplorerToolbar } from './miner-explorer-toolbar'
import { mapDeviceToMinerRecord } from './miner-explorer-utils'
import './styles.scss'

export type MinerExplorerRef = {
  resetSelections: () => void
}

export type MinerExplorerProps = {
  data: Device[]
  isLoading?: boolean
  isFetching?: boolean
  hasError?: boolean
  poolConfig?: PoolConfigData[]
  site?: string
  availableDevices?: AvailableDevices
  typeFiltersForSite?: CascaderOption[]
  onSelectedDevicesChange?: (miners: Device[]) => void
  className?: string
}

export const MinerExplorer = forwardRef<MinerExplorerRef, MinerExplorerProps>(
  (
    {
      data = [],
      isLoading = false,
      isFetching = false,
      hasError = false,
      poolConfig = [],
      site,
      availableDevices = { availableContainerTypes: [], availableMinerTypes: [] },
      typeFiltersForSite = [],
      onSelectedDevicesChange,
      className,
    },
    ref,
  ): JSX.Element => {
    const { getFormattedDate } = useTimezone()
    const [searchTags, setSearchTags] = useState<string[]>([])
    const [modelFilter, setModelFilter] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<string | null>(null)
    const [poolFilter, setPoolFilter] = useState<string | null>(null)
    const [selections, setSelections] = useState<DataTableRowSelectionState>({})

    const handleSelectionsChange = (next: DataTableRowSelectionState) => {
      setSelections(next)
      onSelectedDevicesChange?.(data.filter((miner) => next[miner.id]))
    }

    const { poolIdMap, pools } = usePoolConfigs({
      data: poolConfig,
    })

    const { onFiltersChange, filters } = useListViewFilters({
      site,
      selectedType: CROSS_THING_TYPES.MINER,
      availableDevices: {
        availableContainerTypes: availableDevices.availableContainerTypes ?? [],
        availableMinerTypes: availableDevices.availableMinerTypes ?? [],
      },
      typeFiltersForSite,
    })

    /**
     * @TODO Need to remove it when we will integrate api calls
     * @TEMPORARY This is a simple utility to get nested values from the device object based on the filter keys.
     */
    const getByPath = (obj: unknown, path: string): unknown =>
      path.split('.').reduce((acc, key) => (acc as Record<string, unknown>)?.[key], obj)

    /**
     * @TODO Filtering should be done by the backend when we will integrate api calls
     * @TEMPORARY
     */
    const filteredData = useMemo(() => {
      if (!filters || Object.keys(filters).length === 0) return data

      return data.filter((device) =>
        Object.entries(filters).every(([key, value]) => {
          const deviceValue = getByPath(device, key)
          return Array.isArray(value)
            ? value.includes(deviceValue as string)
            : deviceValue === value
        }),
      )
    }, [data, filters])

    useEffect(() => {
      const next: string[][] = []
      if (modelFilter !== null) next.push(['type', modelFilter])
      if (statusFilter !== null) next.push(['last.snap.stats.status', statusFilter])
      if (poolFilter !== null) next.push(['info.poolConfig', poolFilter])

      onFiltersChange?.(next)
    }, [modelFilter, statusFilter, poolFilter, onFiltersChange])

    if (isLoading) {
      return (
        <div className={cn('mdk-pm-miner-explorer', className)}>
          <Loader />
        </div>
      )
    }

    const mappedMiners = filteredData.map((device) => mapDeviceToMinerRecord(device, poolIdMap))

    useImperativeHandle(ref, () => ({
      resetSelections: () => setSelections({}),
    }))

    return (
      <div className={cn('mdk-pm-miner-explorer', className)}>
        {hasError && <CoreAlert type="error" title="Error loading data" />}

        <MinerExplorerToolbar
          searchTags={searchTags}
          onSearchTagsChange={(tags) => setSearchTags(tags)}
          pools={pools}
          modelFilter={modelFilter}
          statusFilter={statusFilter}
          poolFilter={poolFilter}
          onModelChange={setModelFilter}
          onStatusChange={setStatusFilter}
          onPoolChange={setPoolFilter}
        />

        <MinerExplorerTable
          data={mappedMiners}
          loading={isFetching}
          selections={selections ?? {}}
          onSelectionsChange={handleSelectionsChange}
          getFormattedDate={getFormattedDate}
        />
      </div>
    )
  },
)
