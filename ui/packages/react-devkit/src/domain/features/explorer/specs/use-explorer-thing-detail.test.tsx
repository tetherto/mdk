// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useExplorerThingDetail } from "../use-explorer-thing-detail"

const useThingDetailMock = vi.fn()

vi.mock("@tetherto/mdk-react-adapter", () => ({
  useThingDetail: (id: string | undefined, options: object) => useThingDetailMock(id, options),
}))

const rowValue = (rows: Array<{ label: string, value: string }>, label: string): string | undefined =>
  rows.find((row) => row.label === label)?.value

describe("useExplorerThingDetail", () => {
  beforeEach(() => {
    useThingDetailMock.mockReturnValue({ thing: undefined, isLoading: false, error: undefined })
  })

  it("reports no selection when no id is given", () => {
    const { result } = renderHook(() => useExplorerThingDetail(undefined))

    expect(result.current.hasSelection).toBe(false)
    expect(result.current.title).toBe("")
    expect(result.current.rows).toEqual([])
    expect(result.current.alarmsCount).toBe(0)
  })

  it("shapes an online thing into display rows", () => {
    useThingDetailMock.mockReturnValue({
      thing: {
        id: "thing-1",
        info: { pos: "A1" },
        last: {
          snap: { stats: { status: "running", ambient_temp_c: 25, humidity_percent: 40, power_w: 1500 } },
          alerts: [{ uuid: "u1" }, { uuid: "u2" }],
        },
      },
      isLoading: false,
      error: undefined,
    })

    const { result } = renderHook(() => useExplorerThingDetail("thing-1"))

    expect(result.current.hasSelection).toBe(true)
    expect(result.current.title).toBe("A1")
    expect(result.current.status).toBe("running")
    expect(result.current.isOffline).toBe(false)
    expect(rowValue(result.current.rows, "Status")).toBe("running")
    expect(rowValue(result.current.rows, "Temp")).toContain("25")
    expect(rowValue(result.current.rows, "Humidity")).toContain("40")
    expect(rowValue(result.current.rows, "Consumption")).toContain("1.5")
    expect(result.current.alarmsCount).toBe(2)
  })

  it("dashes out every reading when the thing is offline", () => {
    useThingDetailMock.mockReturnValue({
      thing: {
        id: "thing-1",
        last: { snap: { stats: { status: "offline", ambient_temp_c: 25, humidity_percent: 40, power_w: 1500 } } },
      },
      isLoading: false,
      error: undefined,
    })

    const { result } = renderHook(() => useExplorerThingDetail("thing-1"))

    expect(result.current.isOffline).toBe(true)
    expect(result.current.status).toBe("offline")
    expect(rowValue(result.current.rows, "Temp")).toBe("-")
    expect(rowValue(result.current.rows, "Humidity")).toBe("-")
    expect(rowValue(result.current.rows, "Consumption")).toBe("-")
  })

  it("falls back to the id as title and dashes when the thing has not resolved", () => {
    const { result } = renderHook(() => useExplorerThingDetail("thing-9"))

    expect(result.current.hasSelection).toBe(true)
    expect(result.current.title).toBe("thing-9")
    expect(result.current.status).toBe("")
    expect(rowValue(result.current.rows, "Status")).toBe("-")
    expect(rowValue(result.current.rows, "Temp")).toBe("-")
    expect(result.current.alarmsCount).toBe(0)
  })

  it("surfaces a human-readable error message when the query fails", () => {
    useThingDetailMock.mockReturnValue({ thing: undefined, isLoading: false, error: new Error("boom") })

    const { result } = renderHook(() => useExplorerThingDetail("thing-1"))

    expect(result.current.errorMessage).toBe("Failed to load device details.")
  })

  it("passes the id and options through to the detail query", () => {
    const options = { enabled: true }
    renderHook(() => useExplorerThingDetail("thing-1", options))

    expect(useThingDetailMock).toHaveBeenCalledWith("thing-1", options)
  })
})
