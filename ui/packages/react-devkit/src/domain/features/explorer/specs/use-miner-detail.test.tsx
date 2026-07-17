// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Device } from "../../../types/device"
import { useMinerDetail } from "../use-miner-detail"

const useDevicesMock = vi.fn()

vi.mock("@tetherto/mdk-react-adapter", () => ({
  useDevices: () => useDevicesMock(),
}))

const miner = (overrides: Partial<Device>): Device =>
  ({ id: "m1", type: "miner-am-s21", ...overrides }) as Device

describe("useMinerDetail", () => {
  beforeEach(() => {
    useDevicesMock.mockReturnValue({ selectedDevices: [] })
  })

  it("returns an empty result when nothing is selected", () => {
    const { result } = renderHook(() => useMinerDetail())

    expect(result.current.miners).toEqual([])
    expect(result.current.headMiner).toBeUndefined()
    expect(result.current.infoItems).toEqual([])
    expect(result.current.chipsData).toBeUndefined()
  })

  it("keeps only miner-type devices from the selection", () => {
    useDevicesMock.mockReturnValue({
      selectedDevices: [
        miner({ id: "m1" }),
        { id: "c1", type: "container-antspace-hk3" } as Device,
      ],
    })

    const { result } = renderHook(() => useMinerDetail())

    expect(result.current.miners.map((device) => device.id)).toEqual(["m1"])
    expect(result.current.headMiner?.id).toBe("m1")
  })

  it("shapes a fully-populated head miner into info rows and chips data", () => {
    const stats = { status: "mining", frequency_mhz: [500], temperature_c: [60] }
    useDevicesMock.mockReturnValue({
      selectedDevices: [
        miner({
          code: "M-042",
          info: { serialNum: "SN123", pos: "a1" },
          last: {
            snap: {
              config: {
                firmware_ver: "fw-2.1",
                power_mode: "normal",
                network_config: { ip_address: "10.0.0.5" },
              },
              stats,
            },
          } as never,
        }),
      ],
    })

    const { result } = renderHook(() => useMinerDetail())
    const byTitle = Object.fromEntries(result.current.infoItems.map((item) => [item.title, item.value]))

    expect(byTitle.Code).toBe("M-042")
    expect(byTitle.Model).toBe("Antminer S21")
    expect(byTitle.Serial).toBe("SN123")
    expect(byTitle.Firmware).toBe("fw-2.1")
    expect(byTitle.IP).toBe("10.0.0.5")
    expect(byTitle.Location).toBe("a1")
    expect(byTitle["Power mode"]).toBe("normal")
    expect(byTitle.Status).toBe("mining")
    expect(result.current.chipsData).toEqual(stats)
  })

  it("falls back to dashes, the raw type and the device address when fields are missing", () => {
    useDevicesMock.mockReturnValue({
      selectedDevices: [miner({ type: "miner-unknown-x", address: "10.0.0.9" })],
    })

    const { result } = renderHook(() => useMinerDetail())
    const byTitle = Object.fromEntries(result.current.infoItems.map((item) => [item.title, item.value]))

    expect(byTitle.Code).toBe("N/A")
    expect(byTitle.Model).toBe("miner-unknown-x")
    expect(byTitle.Serial).toBe("-")
    expect(byTitle.Firmware).toBe("-")
    expect(byTitle.IP).toBe("10.0.0.9")
    expect(byTitle.Location).toBe("-")
    expect(byTitle["Power mode"]).toBe("-")
    expect(byTitle.Status).toBe("-")
    expect(result.current.chipsData).toBeUndefined()
  })
})
