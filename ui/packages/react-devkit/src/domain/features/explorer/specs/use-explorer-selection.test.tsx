// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { DeviceExplorerDeviceData } from "../../../components/device-explorer/types"
import { DEVICE_EXPLORER_DEVICE_TYPE } from "../../../components/device-explorer/types"
import { useExplorerSelection } from "../use-explorer-selection"

const useDevicesMock = vi.fn()
const useContainerSnapshotsMock = vi.fn()

vi.mock("@tetherto/mdk-react-adapter", () => ({
  useDevices: () => useDevicesMock(),
  useContainerSnapshots: (keys: string[]) => useContainerSnapshotsMock(keys),
}))

const row = (overrides: Partial<DeviceExplorerDeviceData>): DeviceExplorerDeviceData =>
  ({ id: "d1", ...overrides }) as DeviceExplorerDeviceData

type StoreOverrides = {
  selectedContainers?: Record<string, unknown>
  selectedDevices?: unknown[]
  selectedLvCabinets?: Record<string, unknown>
}

const storeActions = {
  selectMultipleContainers: vi.fn(),
  selectDeviceTag: vi.fn(),
  setSelectDevice: vi.fn(),
  selectLVCabinet: vi.fn(),
  setSelectedSockets: vi.fn(),
  setResetSelections: vi.fn(),
}

const mockStore = (overrides: StoreOverrides = {}) => {
  useDevicesMock.mockReturnValue({
    ...storeActions,
    selectedDevicesTags: {},
    selectedContainers: {},
    selectedDevices: [],
    selectedLvCabinets: {},
    ...overrides,
  })
}

describe("useExplorerSelection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore()
    useContainerSnapshotsMock.mockReturnValue({ containers: [], isLoading: false })
  })

  it("resets the store and dispatches nothing for an empty selection", () => {
    const { result } = renderHook(() =>
      useExplorerSelection({
        deviceType: DEVICE_EXPLORER_DEVICE_TYPE.CONTAINER,
        rows: [row({ id: "c1" })],
        selected: {},
      }),
    )

    expect(result.current.selectedRows).toEqual([])
    expect(storeActions.setResetSelections).toHaveBeenCalled()
    expect(storeActions.selectMultipleContainers).not.toHaveBeenCalled()
    expect(storeActions.setSelectDevice).not.toHaveBeenCalled()
    expect(storeActions.selectLVCabinet).not.toHaveBeenCalled()
  })

  it("dispatches the selected containers and fetches their detail snapshots", () => {
    const rows = [
      row({ id: "c1", info: { container: "antspace-1" } as never }),
      row({ id: "c2", info: { container: "antspace-1" } as never }),
      row({ id: "c3" }),
    ]

    const { result } = renderHook(() =>
      useExplorerSelection({
        deviceType: DEVICE_EXPLORER_DEVICE_TYPE.CONTAINER,
        rows,
        selected: { c1: true, c2: true },
      }),
    )

    expect(result.current.selectedRows.map((r) => r.id)).toEqual(["c1", "c2"])
    // Duplicate container keys collapse into one fetch key.
    expect(useContainerSnapshotsMock).toHaveBeenCalledWith(["antspace-1"])
    expect(storeActions.selectMultipleContainers).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "c1" })]),
    )
  })

  it("dispatches per-miner selection with an empty-info fallback on the miner tab", () => {
    const rows = [
      row({ id: "m1", info: { container: "antspace-1" } as never }),
      row({ id: "m2" }),
    ]

    renderHook(() =>
      useExplorerSelection({
        deviceType: DEVICE_EXPLORER_DEVICE_TYPE.MINER,
        rows,
        selected: { m1: true, m2: true },
      }),
    )

    // Each row dispatches twice on mount: the selection-change effect plus the
    // empty-store re-assert (the store starts blank).
    expect(storeActions.setSelectDevice).toHaveBeenCalledTimes(4)
    expect(storeActions.selectDeviceTag).toHaveBeenCalledWith({ id: "m1", info: { container: "antspace-1" } })
    expect(storeActions.selectDeviceTag).toHaveBeenCalledWith({ id: "m2", info: {} })
  })

  it("dispatches cabinet selection and skips the snapshot fetch on the cabinet tab", () => {
    renderHook(() =>
      useExplorerSelection({
        deviceType: DEVICE_EXPLORER_DEVICE_TYPE.CABINET,
        rows: [row({ id: "lv1" })],
        selected: { lv1: true },
      }),
    )

    expect(storeActions.selectLVCabinet).toHaveBeenCalledWith(expect.objectContaining({ id: "lv1" }))
    expect(useContainerSnapshotsMock).toHaveBeenCalledWith([])
    expect(storeActions.setSelectedSockets).not.toHaveBeenCalled()
  })

  it("upgrades the container selection once detail snapshots resolve", () => {
    const detail = [{ id: "c1", last: { snap: { config: {} } } }]
    useContainerSnapshotsMock.mockReturnValue({ containers: detail, isLoading: false })

    renderHook(() =>
      useExplorerSelection({
        deviceType: DEVICE_EXPLORER_DEVICE_TYPE.CONTAINER,
        rows: [row({ id: "c1", info: { container: "antspace-1" } as never })],
        selected: { c1: true },
      }),
    )

    expect(storeActions.selectMultipleContainers).toHaveBeenCalledWith(detail)
  })

  it("does not re-assert when the store already holds the active tab's selection", () => {
    mockStore({ selectedContainers: { c1: {} } })

    renderHook(() =>
      useExplorerSelection({
        deviceType: DEVICE_EXPLORER_DEVICE_TYPE.CONTAINER,
        rows: [row({ id: "c1" })],
        selected: { c1: true },
      }),
    )

    // Only the selection-change dispatch fires; the re-assert guard sees the
    // store already populated and stays quiet.
    expect(storeActions.selectMultipleContainers).toHaveBeenCalledTimes(1)
  })

  it("re-asserts a miner selection the store has lost", () => {
    mockStore({ selectedDevices: [] })

    renderHook(() =>
      useExplorerSelection({
        deviceType: DEVICE_EXPLORER_DEVICE_TYPE.MINER,
        rows: [row({ id: "m1" })],
        selected: { m1: true },
      }),
    )

    // Initial dispatch + the empty-store re-assert.
    expect(storeActions.setSelectDevice).toHaveBeenCalledTimes(2)
  })

  it("skips the cabinet re-assert when the store still holds the cabinet", () => {
    mockStore({ selectedLvCabinets: { lv1: {} } })

    renderHook(() =>
      useExplorerSelection({
        deviceType: DEVICE_EXPLORER_DEVICE_TYPE.CABINET,
        rows: [row({ id: "lv1" })],
        selected: { lv1: true },
      }),
    )

    expect(storeActions.selectLVCabinet).toHaveBeenCalledTimes(1)
  })

  it("derives the socket selection for the miner tab", () => {
    renderHook(() =>
      useExplorerSelection({
        deviceType: DEVICE_EXPLORER_DEVICE_TYPE.MINER,
        rows: [row({ id: "m1" })],
        selected: { m1: true },
      }),
    )

    expect(storeActions.setSelectedSockets).toHaveBeenCalled()
  })

  it("clears the store when the consumer unmounts", () => {
    const { unmount } = renderHook(() =>
      useExplorerSelection({
        deviceType: DEVICE_EXPLORER_DEVICE_TYPE.CONTAINER,
        rows: [],
        selected: {},
      }),
    )

    const callsBeforeUnmount = storeActions.setResetSelections.mock.calls.length
    unmount()
    expect(storeActions.setResetSelections.mock.calls.length).toBe(callsBeforeUnmount + 1)
  })

  it("exposes the snapshot loading state", () => {
    useContainerSnapshotsMock.mockReturnValue({ containers: [], isLoading: true })

    const { result } = renderHook(() =>
      useExplorerSelection({
        deviceType: DEVICE_EXPLORER_DEVICE_TYPE.CONTAINER,
        rows: [],
        selected: {},
      }),
    )

    expect(result.current.isLoading).toBe(true)
  })
})
