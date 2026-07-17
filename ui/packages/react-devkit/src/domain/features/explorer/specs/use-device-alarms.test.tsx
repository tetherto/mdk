// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { Device } from "../../../types/device"
import { useDeviceAlarms } from "../use-device-alarms"

const device = (overrides: Partial<Device> = {}): Device => ({
  id: "device-1",
  type: "container-bd-d40-m56",
  info: { container: "container-1", pos: "a1" },
  last: { alerts: [] },
  ...overrides,
})

const alert = (overrides: Record<string, unknown> = {}) => ({
  severity: "critical",
  createdAt: 1_700_000_000_000,
  name: "Over-temp",
  description: "Ambient temperature high",
  uuid: "uuid-1",
  ...overrides,
})

describe("useDeviceAlarms", () => {
  it("returns no items for devices without alarms", () => {
    const { result } = renderHook(() => useDeviceAlarms([device()]))

    expect(result.current.alarmsDataItems).toEqual([])
    expect(result.current.alarmsCount).toBe(0)
  })

  it("flattens alarms across every selected device", () => {
    const devices = [
      device({ id: "a", last: { alerts: [alert(), alert({ uuid: "uuid-2" })] } }),
      device({ id: "b", last: { alerts: [alert({ uuid: "uuid-3" })] } }),
    ]

    const { result } = renderHook(() => useDeviceAlarms(devices))

    expect(result.current.alarmsCount).toBe(3)
    expect(result.current.alarmsDataItems).toHaveLength(3)
  })

  it("wires the navigate handler through to the timeline items", () => {
    const onNavigate = vi.fn()
    const devices = [device({ last: { alerts: [alert()] } })]

    const { result } = renderHook(() => useDeviceAlarms(devices, onNavigate))

    expect(result.current.alarmsDataItems).toHaveLength(1)
    expect(result.current.alarmsDataItems[0]?.item).toBeDefined()
  })

  it("ignores devices whose alerts are missing or not an array", () => {
    const devices = [
      device({ last: { alerts: null } }),
      device({ last: {} }),
      device({ last: { alerts: [alert()] } }),
    ]

    const { result } = renderHook(() => useDeviceAlarms(devices))

    expect(result.current.alarmsCount).toBe(1)
  })
})
