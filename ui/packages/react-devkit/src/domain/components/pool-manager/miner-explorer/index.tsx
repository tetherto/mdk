import { forwardRef, type JSX, useEffect, useImperativeHandle, useState } from 'react'

import type { DataTableRowSelectionState } from '@primitives'
import { cn, CoreAlert, Loader } from '@primitives'

import { useTimezoneFormatter } from '@tetherto/mdk-react-adapter'
import type { ListThingsDevice } from '@tetherto/mdk-ui-foundation'
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
  data: ListThingsDevice[]
  isLoading?: boolean
  isFetching?: boolean
  hasError?: boolean
  poolConfig?: PoolConfigData[]
  onSelectedDevicesChange?: (miners: ListThingsDevice[]) => void
  /**
   * Called when the user changes search tags in the toolbar.
   * Wire to a parent `useMinerDevices({ searchTags })` to trigger server-side search.
   */
  onSearchTagsChange?: (tags: string[]) => void
  /**
   * Called when the user changes a dropdown filter (model / status / pool).
   * Keys are MongoDB field paths; values are arrays of selected strings.
   * Wire to a parent `useMinerDevices({ filters })` for server-side filtering.
   */
  onFiltersChange?: (filters: Record<string, string[]>) => void
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
      onSelectedDevicesChange,
      onSearchTagsChange,
      onFiltersChange,
      className,
    },
    ref,
  ): JSX.Element => {
    const { getFormattedDate } = useTimezoneFormatter()
    // searchTags is controlled locally for the toolbar UI; the parent is
    // notified via onSearchTagsChange so it can refetch with server-side $regex.
    const [searchTags, setSearchTags] = useState<string[]>([])
    const [modelFilter, setModelFilter] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<string | null>(null)
    const [poolFilter, setPoolFilter] = useState<string | null>(null)
    const [selections, setSelections] = useState<DataTableRowSelectionState>({})

    const handleSelectionsChange = (next: DataTableRowSelectionState) => {
      setSelections(next)
      onSelectedDevicesChange?.(data.filter((miner) => next[miner.id]))
    }

    const handleSearchTagsChange = (tags: string[]) => {
      setSearchTags(tags)
      onSearchTagsChange?.(tags)
    }

    const { poolIdMap, pools } = usePoolConfigs({
      data: poolConfig,
    })

    // Build and propagate the server-side filter object whenever dropdowns change.
    useEffect(() => {
      const built: Record<string, string[]> = {}
      if (modelFilter !== null) built.type = [modelFilter]
      if (statusFilter !== null) built['last.snap.stats.status'] = [statusFilter]
      if (poolFilter !== null) built['info.poolConfig'] = [poolFilter]
      onFiltersChange?.(built)
    }, [modelFilter, statusFilter, poolFilter, onFiltersChange])

    // Must be above any early return to satisfy Rules of Hooks.
    useImperativeHandle(ref, () => ({
      resetSelections: () => setSelections({}),
    }))

    if (isLoading) {
      return (
        <div className={cn('mdk-pm-miner-explorer', className)}>
          <Loader />
        </div>
      )
    }

    // Data arrives pre-filtered from the server (via useMinerDevices searchTags + filters).
    const mappedMiners = data.map((device) => mapDeviceToMinerRecord(device, poolIdMap))

    return (
      <div className={cn('mdk-pm-miner-explorer', className)}>
        {hasError && <CoreAlert type="error" title="Error loading data" />}

        <MinerExplorerToolbar
          searchTags={searchTags}
          onSearchTagsChange={handleSearchTagsChange}
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
