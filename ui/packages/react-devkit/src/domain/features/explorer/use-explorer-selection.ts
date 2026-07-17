import { useEffect, useMemo } from "react"

import { useContainerSnapshots, useDevices } from "@tetherto/mdk-react-adapter"
import { deriveSelectedSockets } from "@tetherto/mdk-ui-foundation"

import { DEVICE_EXPLORER_DEVICE_TYPE } from "../../components/device-explorer/types"
import type { DeviceExplorerDeviceData, DeviceExplorerDeviceType } from "../../components/device-explorer/types"

/** Row-selection map from `<DeviceExplorer>` — thing id → selected. */
export type ExplorerRowSelection = Record<string, boolean>

export type UseExplorerSelectionParams = {
  /** The active Explorer tab — decides which `devicesStore` setters fire. */
  deviceType: DeviceExplorerDeviceType
  /** All rows currently shown for the tab (the search/filter output). */
  rows: DeviceExplorerDeviceData[]
  /** The table's row-selection state (thing id → selected). */
  selected: ExplorerRowSelection
}

export type UseExplorerSelectionResult = {
  /** The resolved selected rows (post search/filter). */
  selectedRows: DeviceExplorerDeviceData[]
  /** Whether the container detail snapshots are still loading. */
  isLoading: boolean
}

/**
 * Bridges the Explorer table selection into the shared `devicesStore` that the
 * write-control cards read. Given the active tab and the table's row-selection,
 * it dispatches the matching setters — containers →
 * `selectMultipleContainers`, miners → `setSelectDevice` + `selectDeviceTag`,
 * cabinets → `selectLVCabinet` — and, for containers/miners, fetches the richer
 * detail snapshots ({@link useContainerSnapshots}) so the controls see the full
 * `last.snap` config (tank / cooling / power-mode) the lean list projection
 * omits, then derives the per-socket selection into the store. Selections are
 * reset whenever the selection or tab changes and on unmount, so a stale
 * selection can never drive the panel.
 *
 * @category op-centre
 * @domain device-management
 * @tier advanced
 */
export const useExplorerSelection = ({
  deviceType,
  rows,
  selected,
}: UseExplorerSelectionParams): UseExplorerSelectionResult => {
  const {
    selectMultipleContainers,
    selectDeviceTag,
    setSelectDevice,
    selectLVCabinet,
    setSelectedSockets,
    setResetSelections,
    selectedDevicesTags,
    selectedContainers,
    selectedDevices,
    selectedLvCabinets,
  } = useDevices()

  const selectedRows = useMemo(
    () => rows.filter((row) => selected[row.id]),
    [rows, selected],
  )

  // Container keys for the detail-snapshot fetch: on the container tab the
  // selected containers themselves; on the miner tab the containers the
  // selected miners live in (so their socket rows can be joined).
  const containerKeys = useMemo(() => {
    if (deviceType === DEVICE_EXPLORER_DEVICE_TYPE.CABINET) return []
    const keys = selectedRows
      .map((row) => row.info?.container)
      .filter((container): container is string => typeof container === "string" && container.length > 0)
    return Array.from(new Set(keys))
  }, [deviceType, selectedRows])

  const { containers, isLoading } = useContainerSnapshots(containerKeys)

  // Stable identity of the current selection, so the reset/dispatch effect only
  // churns the store when the user actually changes what is selected.
  const selectionKey = useMemo(
    () => `${deviceType}:${selectedRows.map((row) => row.id).sort().join(",")}`,
    [deviceType, selectedRows],
  )

  // Reset + dispatch the selection whenever it (or the tab) changes.
  useEffect(() => {
    setResetSelections()
    if (selectedRows.length === 0) return

    if (deviceType === DEVICE_EXPLORER_DEVICE_TYPE.CONTAINER) {
      selectMultipleContainers(selectedRows)
    } else if (deviceType === DEVICE_EXPLORER_DEVICE_TYPE.MINER) {
      selectedRows.forEach((row) => {
        setSelectDevice(row)
        selectDeviceTag({ id: row.id, info: row.info ?? {} })
      })
    } else {
      selectedRows.forEach((row) => selectLVCabinet(row))
    }
    // `selectionKey` captures the meaningful input; the setters are stable store actions.
  }, [selectionKey])

  // Re-assert the selection when the store has lost it while the table
  // selection is still active — the shared container/miner control cards call
  // `setResetSelections()` after queueing an action, which would otherwise blank
  // the detail panel (it reads the store, and the reset clears it). The presence
  // guard means this only fires when the store is genuinely missing the rows, so
  // it never loops against the merge-style setters.
  useEffect(() => {
    if (selectedRows.length === 0) return

    // Only re-assert when the store slice for the active tab is fully empty (the
    // post-action reset). A non-empty check keeps this loop-safe against the
    // merge-style setters, which always produce a new slice reference.
    const present =
      deviceType === DEVICE_EXPLORER_DEVICE_TYPE.CONTAINER
        ? Object.keys(selectedContainers).length > 0
        : deviceType === DEVICE_EXPLORER_DEVICE_TYPE.MINER
          ? selectedDevices.length > 0
          : Object.keys(selectedLvCabinets).length > 0
    if (present) return

    if (deviceType === DEVICE_EXPLORER_DEVICE_TYPE.CONTAINER) {
      // Prefer the detail snapshots (full snap config) when they have resolved.
      selectMultipleContainers(containers.length > 0 ? containers : selectedRows)
    } else if (deviceType === DEVICE_EXPLORER_DEVICE_TYPE.MINER) {
      selectedRows.forEach((row) => {
        setSelectDevice(row)
        selectDeviceTag({ id: row.id, info: row.info ?? {} })
      })
    } else {
      selectedRows.forEach((row) => selectLVCabinet(row))
    }
  }, [deviceType, selectedRows, containers, selectedContainers, selectedDevices, selectedLvCabinets])

  // Upgrade the selected containers with their detail snapshots (full snap
  // config) once the fetch resolves — merges by id, so it never disturbs the
  // per-miner tag selection.
  useEffect(() => {
    if (deviceType !== DEVICE_EXPLORER_DEVICE_TYPE.CONTAINER || containers.length === 0) return
    selectMultipleContainers(containers)
  }, [deviceType, containers])

  // Derive the per-socket selection from the detail snapshots + per-miner tag
  // selection (empty for container-level selection, which uses power-all).
  useEffect(() => {
    if (deviceType === DEVICE_EXPLORER_DEVICE_TYPE.CABINET) return
    const sockets = deriveSelectedSockets(containers, selectedDevicesTags, rows)
    setSelectedSockets(sockets as unknown as Parameters<typeof setSelectedSockets>[0])
  }, [deviceType, containers, selectedDevicesTags])

  // Clear the store when the panel unmounts.
  useEffect(() => () => setResetSelections(), [])

  return { selectedRows, isLoading }
}
