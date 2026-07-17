// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useContainerWidgetsData } from "../use-container-widgets-data"

const useContainerWidgetsMock = vi.fn()
const useContainerSettingsMock = vi.fn()

vi.mock("@tetherto/mdk-react-adapter", () => ({
  useContainerWidgets: (options: object) => useContainerWidgetsMock(options),
  useContainerSettings: () => useContainerSettingsMock(),
}))

const deriveActivityMock = vi.fn()
const deriveSummaryMock = vi.fn()
const deriveTanksMock = vi.fn()
const findMatchingMock = vi.fn()
const alarmStateMock = vi.fn()

vi.mock("@tetherto/mdk-ui-foundation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tetherto/mdk-ui-foundation")>()
  return {
    ...actual,
    deriveContainerActivity: (...args: unknown[]) => deriveActivityMock(...args),
    deriveContainerSummary: (...args: unknown[]) => deriveSummaryMock(...args),
    deriveContainerTanks: (...args: unknown[]) => deriveTanksMock(...args),
    findMatchingContainer: (...args: unknown[]) => findMatchingMock(...args),
    getWidgetAlarmState: (...args: unknown[]) => alarmStateMock(...args),
  }
})

const container = (overrides: Record<string, unknown> = {}) => ({
  id: "c1",
  type: "container-antspace-hk3",
  info: { container: "antspace-1", nominalMinerCapacity: 40 },
  last: { snap: { stats: { status: "running", power_w: 1_000 } } },
  ...overrides,
})

const widgetsResult = (overrides: Record<string, unknown> = {}) => ({
  containers: [],
  realtime: undefined,
  isLoading: false,
  error: undefined,
  refetch: vi.fn(),
  ...overrides,
})

describe("useContainerWidgetsData", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useContainerWidgetsMock.mockReturnValue(widgetsResult())
    useContainerSettingsMock.mockReturnValue({ settings: [] })
    deriveActivityMock.mockReturnValue({ active: 0, total: 0 })
    deriveSummaryMock.mockReturnValue({})
    deriveTanksMock.mockReturnValue([])
    findMatchingMock.mockReturnValue(undefined)
    alarmStateMock.mockReturnValue({ shouldFlash: false, isCriticallyHigh: false })
  })

  it("returns an empty card list while nothing has loaded", () => {
    const { result } = renderHook(() => useContainerWidgetsData())

    expect(result.current.containers).toEqual([])
    expect(result.current.errorMessage).toBeUndefined()
    expect(result.current.hasAnyCriticallyHigh).toBe(false)
  })

  it("passes options through and exposes loading + refetch from the query", () => {
    const refetch = vi.fn()
    useContainerWidgetsMock.mockReturnValue(widgetsResult({ isLoading: true, refetch }))

    const options = { refetchInterval: 5_000 }
    const { result } = renderHook(() => useContainerWidgetsData(options))

    expect(useContainerWidgetsMock).toHaveBeenCalledWith(options)
    expect(result.current.isLoading).toBe(true)
    expect(result.current.refetch).toBe(refetch)
  })

  it("surfaces a human-readable message when the query errors", () => {
    useContainerWidgetsMock.mockReturnValue(widgetsResult({ error: new Error("boom") }))

    const { result } = renderHook(() => useContainerWidgetsData())

    expect(result.current.errorMessage).toBe("Failed to load containers.")
  })

  it("shapes a running container into a card with summary rows", () => {
    useContainerWidgetsMock.mockReturnValue(widgetsResult({ containers: [container()] }))
    deriveSummaryMock.mockReturnValue({ hashrateThs: 100, maxTempC: 70, avgTempC: 50 })

    const { result } = renderHook(() => useContainerWidgetsData())
    const [item] = result.current.containers

    expect(item?.power).toBe(1_000)
    expect(item?.isOffline).toBe(false)
    expect(item?.statsErrorMessage).toBeNull()
    expect(item?.errorMessage).toBeUndefined()
    expect(item?.vendorContent).toBeUndefined()

    const byLabel = Object.fromEntries((item?.summary ?? []).map((rowItem) => [rowItem.label, rowItem.value]))
    // 1000 W / 100 TH/s = 10 W/TH; 100 TH/s = 0.1 PH/s.
    expect(byLabel.Efficiency).toContain("10")
    expect(byLabel["Hash Rate"]).toContain("0.1")
    expect(byLabel["Max Temp"]).toContain("70")
    expect(byLabel["Avg Temp"]).toContain("50")
  })

  it("dashes the efficiency when the hashrate is zero or the power is missing", () => {
    useContainerWidgetsMock.mockReturnValue(
      widgetsResult({
        containers: [
          container({ id: "c1" }),
          container({ id: "c2", last: { snap: { stats: { status: "running" } } } }),
        ],
      }),
    )
    deriveSummaryMock.mockReturnValue({ hashrateThs: 0 })

    const { result } = renderHook(() => useContainerWidgetsData())

    for (const item of result.current.containers) {
      const byLabel = Object.fromEntries(item.summary.map((rowItem) => [rowItem.label, rowItem.value]))
      expect(byLabel.Efficiency).toBe("-")
      // A zero hashrate still formats as a number; only an absent one dashes.
      expect(byLabel["Hash Rate"]).toContain("0")
    }
  })

  it("dashes every summary row when the realtime slice has no data", () => {
    useContainerWidgetsMock.mockReturnValue(
      widgetsResult({ containers: [container({ last: { snap: { stats: { status: "running" } } } })] }),
    )
    deriveSummaryMock.mockReturnValue({})

    const { result } = renderHook(() => useContainerWidgetsData())
    const [item] = result.current.containers

    for (const rowItem of item?.summary ?? []) {
      expect(rowItem.value).toBe("-")
    }
  })

  it("marks offline containers and carries the stats and query error strings", () => {
    useContainerWidgetsMock.mockReturnValue(
      widgetsResult({
        containers: [
          container({
            last: {
              snap: { stats: { status: "offline", error_msg: "bad sensor" } },
              err: "rpc dead",
            },
          }),
        ],
      }),
    )

    const { result } = renderHook(() => useContainerWidgetsData())
    const [item] = result.current.containers

    expect(item?.isOffline).toBe(true)
    expect(item?.statsErrorMessage).toBe("bad sensor")
    expect(item?.errorMessage).toBe("rpc dead")
  })

  it("renders vendor tank content and propagates the alarm state", () => {
    useContainerWidgetsMock.mockReturnValue(widgetsResult({ containers: [container()] }))
    deriveTanksMock.mockReturnValue([
      { temperatureC: 42, oilPumpEnabled: true, waterPumpEnabled: false, pressureBar: 1.2 },
      { temperatureC: undefined, oilPumpEnabled: false, waterPumpEnabled: true, pressureBar: 0.9 },
    ])
    alarmStateMock.mockReturnValue({ shouldFlash: true, isCriticallyHigh: true })

    const { result } = renderHook(() => useContainerWidgetsData())
    const [item] = result.current.containers

    expect(item?.vendorContent).toBeDefined()
    expect(item?.flash).toBe(true)
    expect(result.current.hasAnyCriticallyHigh).toBe(true)
  })

  it("falls back to the container id as title when no model name resolves", () => {
    useContainerWidgetsMock.mockReturnValue(
      widgetsResult({ containers: [container({ info: {}, type: undefined })] }),
    )

    const { result } = renderHook(() => useContainerWidgetsData())

    expect(result.current.containers[0]?.title).toBe("c1")
  })
})
