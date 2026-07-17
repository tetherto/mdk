import { useMemo } from "react"

import type { LocalFilters } from "@primitives"

import { useExplorerList } from "@tetherto/mdk-react-adapter"
import type { UseExplorerListOptions } from "@tetherto/mdk-react-adapter"
import type { ListThingsDevice } from "@tetherto/mdk-ui-foundation"

import { getContainerName } from "../../utils/container-utils"
import { groupCabinetDevices } from "../../utils/cabinet-utils"
import type { Device } from "../../types/device"
import { DEVICE_EXPLORER_DEVICE_TYPE } from "../../components/device-explorer/types"
import type {
  DeviceExplorerDeviceData,
  DeviceExplorerDeviceType,
  DeviceExplorerFilterOption,
  DeviceExplorerSearchOption,
} from "../../components/device-explorer/types"
import { getExplorerFilterOptions, matchesExplorerFilters } from "./explorer-filter-options"

const readString = (value: unknown): string =>
  typeof value === "string" ? value : ""

/** Display name used for search matching and search-autocomplete options. */
const readRowName = (row: ListThingsDevice): string =>
  getContainerName(row.info?.container) || readString(row.info?.pos) || row.id

/** Lower-cased haystack a search term is matched against. */
const readSearchText = (row: ListThingsDevice): string =>
  [readRowName(row), row.id, row.type, readString(row.info?.pos), readString(row.info?.serialNum)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

/** OR semantics: a row matches when it contains any of the search terms. */
const matchesSearch = (row: ListThingsDevice, searchTags: string[]): boolean => {
  if (searchTags.length === 0) {
    return true
  }
  const haystack = readSearchText(row)
  return searchTags.some((tag) => haystack.includes(tag.toLowerCase()))
}

/** Distinct container/device names, sorted, as search-autocomplete options. */
const buildSearchOptions = (rows: ListThingsDevice[]): DeviceExplorerSearchOption[] =>
  Array.from(new Set(rows.map(readRowName).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ value: name, label: name }))

export type UseExplorerDataOptions = {
  /** Which tab's things to fetch and shape. */
  deviceType: DeviceExplorerDeviceType
  /** Free-text search chips from the toolbar (OR-matched against each row). */
  searchTags?: string[]
  /** Active filter selections from the toolbar cascader. */
  filters?: LocalFilters
} & UseExplorerListOptions

export type UseExplorerDataResult = {
  /** Rows for the active tab, after search + filter, ready for `<DeviceExplorer>`. */
  data: DeviceExplorerDeviceData[]
  /** Autocomplete options for the search box, derived from the fetched rows. */
  searchOptions: DeviceExplorerSearchOption[]
  /** Filter cascader options (Status), derived from the fetched rows. */
  filterOptions: DeviceExplorerFilterOption[]
  isLoading: boolean
  /** Human-readable message when the underlying query errors, else undefined. */
  errorMessage?: string
  refetch: () => void
}

/**
 * Explorer list data hook: fetches the things behind one tab
 * ({@link useExplorerList}) and shapes them for `<DeviceExplorer>` — applying
 * the toolbar's search + filter selections client-side and deriving the
 * search-autocomplete and filter-cascader options from the fetched rows. The
 * tag-based backend query lives in `@tetherto/mdk-ui-foundation`; this hook
 * only reads snapshot fields for display filtering.
 *
 * Search, status-filter and (in `DeviceExplorer`) column sort are all
 * **client-side**, over a tag-filtered, capped fetch — this mirrors MOS/the reference app.
 * Fine for containers/cabinets; for very large miner fleets this fetches the
 * cap and filters in the browser (no server paging). Push status into the
 * foundation query + wire `limit`/`offset` if that ceiling is ever hit.
 *
 * @category tables
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const useExplorerData = (options: UseExplorerDataOptions): UseExplorerDataResult => {
  const { deviceType, searchTags = [], filters = {}, ...listOptions } = options

  const { things, isLoading, error, refetch } = useExplorerList(deviceType, listOptions)

  const filtered = useMemo(
    () =>
      things.filter((row) => matchesSearch(row, searchTags) && matchesExplorerFilters(row, filters)),
    [things, searchTags, filters],
  )

  // The cabinet tab lists individual powermeters / temp sensors; group them by
  // cabinet root so a row is one physical cabinet (matching the cabinet columns
  // and giving the detail panel a root to fetch its family by).
  const rows = useMemo(() => {
    if (deviceType === DEVICE_EXPLORER_DEVICE_TYPE.CABINET) {
      return groupCabinetDevices(filtered as unknown as Device[])
    }
    return filtered
  }, [deviceType, filtered])

  const searchOptions = useMemo(() => buildSearchOptions(things), [things])
  const filterOptions = useMemo(() => getExplorerFilterOptions(deviceType), [deviceType])

  return {
    // `ListThingsDevice` and the devkit `Device` are the same list-things
    // payload; the cast bridges the two structurally-identical shapes at this
    // adapter/devkit boundary (they differ only in the named `alerts` type).
    data: rows as unknown as DeviceExplorerDeviceData[],
    searchOptions,
    filterOptions,
    isLoading,
    errorMessage: error ? "Failed to load devices." : undefined,
    refetch,
  }
}
