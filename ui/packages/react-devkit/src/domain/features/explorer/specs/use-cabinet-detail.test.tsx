// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Device } from "../../../types/device"
import { useCabinetDetail } from "../use-cabinet-detail"

const useDevicesMock = vi.fn()
const useCabinetDevicesMock = vi.fn()

vi.mock("@tetherto/mdk-react-adapter", () => ({
  useDevices: () => useDevicesMock(),
  useCabinetDevices: (root: string) => useCabinetDevicesMock(root),
  useTimezoneFormatter: () => ({ getFormattedDate: () => "2026-07-10" }),
}))

const device = (overrides: Partial<Device>): Device =>
  ({ id: "d", type: "sensor-temp-x", ...overrides }) as Device

const cabinetDevices: Device[] = [
  device({
    id: "rt",
    type: "sensor-temp-x",
    info: { pos: "lv1_lv1" },
    last: { snap: { stats: { temp_c: 55, status: "ok" } } } as never,
  }),
  device({
    id: "pm",
    type: "powermeter-demo-x1",
    info: { pos: "lv1_a" },
    last: {
      snap: { stats: { power_w: 12_500, status: "ok" } },
      alerts: [{ name: "over_power", createdAt: 123, severity: "critical", uuid: "u1" }],
    } as never,
  }),
  device({
    id: "ts",
    type: "sensor-temp-x",
    info: { pos: "lv1_b" },
    last: { snap: { stats: { temp_c: 80, status: "offline" } } } as never,
  }),
]

describe("useCabinetDetail", () => {
  beforeEach(() => {
    useDevicesMock.mockReturnValue({ selectedLvCabinets: {} })
    useCabinetDevicesMock.mockReturnValue({ devices: [], isLoading: false })
  })

  it("reports no selection when no cabinet is selected", () => {
    const { result } = renderHook(() => useCabinetDetail())
    expect(result.current.hasSelection).toBe(false)
    expect(result.current.title).toBe("")
  })

  it("fetches the selected cabinet's family by its root key", () => {
    useDevicesMock.mockReturnValue({ selectedLvCabinets: { lv1: { id: "lv1" } } })
    useCabinetDevicesMock.mockReturnValue({ devices: cabinetDevices, isLoading: false })

    renderHook(() => useCabinetDetail())
    expect(useCabinetDevicesMock).toHaveBeenCalledWith("lv1")
  })

  it("shapes the grouped cabinet into title, readings and warnings", () => {
    useDevicesMock.mockReturnValue({ selectedLvCabinets: { lv1: { id: "lv1" } } })
    useCabinetDevicesMock.mockReturnValue({ devices: cabinetDevices, isLoading: false })

    const { result } = renderHook(() => useCabinetDetail())

    expect(result.current.hasSelection).toBe(true)
    expect(result.current.title).toBe("LV Cabinet 1")

    expect(result.current.powerMeters).toEqual([
      { id: "pm", label: "DEMO X1 A", value: "12.5", unit: "kW", isOffline: false },
    ])

    expect(result.current.rootTempSensor?.label).toBe("Cabinet Temp Sensor LV1")
    expect(result.current.rootTempSensor?.value).toBe("55")

    expect(result.current.tempSensors).toHaveLength(1)
    expect(result.current.tempSensors[0]?.label).toBe("Temperature Sensor b")
    expect(result.current.tempSensors[0]?.isOffline).toBe(true)

    expect(result.current.alarmsDataItems).toHaveLength(1)
  })
})
