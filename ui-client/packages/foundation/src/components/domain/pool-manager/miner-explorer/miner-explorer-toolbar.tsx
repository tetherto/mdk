import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, TagInput } from '@tetherto/mdk-core-ui'
import {
  COMPLETE_MINER_TYPES,
  MINER_TYPE_NAME_MAP,
  MinerStatuses,
} from '../../../../constants/device-constants'
import type { PoolSummary } from '../types'

export type SelectOption = {
  key: string
  label: string
}

export type MinerExplorerToolbarProps = {
  searchTags: string[]
  onSearchTagsChange: (tags: string[]) => void
  pools: PoolSummary[]
  modelFilter: string | null
  statusFilter: string | null
  poolFilter: string | null
  onModelChange: (value: string | null) => void
  onStatusChange: (value: string | null) => void
  onPoolChange: (value: string | null) => void
}

export const MinerExplorerToolbar = ({
  searchTags,
  onSearchTagsChange,
  pools = [],
  modelFilter,
  statusFilter,
  poolFilter,
  onModelChange,
  onStatusChange,
  onPoolChange,
}: MinerExplorerToolbarProps): JSX.Element => {
  const minerTypeOptions = Object.values(COMPLETE_MINER_TYPES).map((type) => ({
    key: type as string,
    label: MINER_TYPE_NAME_MAP[type as keyof typeof MINER_TYPE_NAME_MAP],
  }))

  const minerStatusOptions = Object.entries(MinerStatuses).map(([label, value]) => ({
    key: value,
    label,
  }))
  const poolFilterOptions = pools.map((pool) => ({
    key: pool.id,
    label: pool.name,
  }))

  return (
    <div className="mdk-pm-miner-explorer__toolbar">
      <div className="mdk-pm-miner-explorer__toolbar__search-row">
        <TagInput
          size="md"
          value={searchTags}
          onTagsChange={onSearchTagsChange}
          placeholder="Search by ID, IP, MAC, Serial"
          variant="search"
          allowCustomTags
          options={searchTags.map((tag) => ({ value: tag, label: tag }))}
          className="mdk-pm-miner-explorer__toolbar__search"
        />
      </div>

      <div className="mdk-pm-miner-explorer__toolbar__filters">
        <Select
          value={modelFilter ?? ''}
          onValueChange={(v) => onModelChange(v || null)}
          allowClear
        >
          <SelectTrigger className="mdk-pm-miner-explorer__toolbar__filter-select" size="md">
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent>
            {minerTypeOptions.map((opt) => (
              <SelectItem key={opt.key} value={opt.key}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter ?? ''}
          onValueChange={(v) => onStatusChange(v || null)}
          allowClear
        >
          <SelectTrigger className="mdk-pm-miner-explorer__toolbar__filter-select" size="md">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {minerStatusOptions.map((opt) => (
              <SelectItem key={opt.key} value={opt.key}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={poolFilter ?? ''} onValueChange={(v) => onPoolChange(v || null)} allowClear>
          <SelectTrigger className="mdk-pm-miner-explorer__toolbar__filter-select" size="md">
            <SelectValue placeholder="Current Pool" />
          </SelectTrigger>
          <SelectContent>
            {poolFilterOptions.map((opt) => (
              <SelectItem key={opt.key} value={opt.key as string}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
