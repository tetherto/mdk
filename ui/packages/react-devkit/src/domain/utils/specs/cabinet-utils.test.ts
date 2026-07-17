import { describe, expect, it } from "vitest"

import type { Device } from "../../types/device"
import {
  getCabinetPos,
  getIsTransformerTempSensor,
  getPowerSensorName,
  getTemperatureSensorName,
  getTempSensorColor,
  groupCabinetDevices,
  isPowerMeter,
  isTempSensor,
} from "../cabinet-utils"
import { getLvCabinetTempSensorColor, getLvCabinetTransformerTempSensorColor } from "../device-utils"

const device = (overrides: Partial<Device>): Device =>
  ({ id: "d", type: "sensor-temp-x", ...overrides }) as Device

describe("getCabinetPos", () => {
  it("splits info.pos into root and devicePos", () => {
    expect(getCabinetPos({ info: { pos: "lv1_a" } })).toEqual({ root: "lv1", devicePos: "a" })
  })

  it("returns empty parts for a missing pos", () => {
    expect(getCabinetPos({})).toEqual({ root: "", devicePos: "" })
  })
})

describe("type predicates", () => {
  it("detects powermeters and temp sensors by type prefix", () => {
    expect(isPowerMeter("powermeter-demo")).toBe(true)
    expect(isPowerMeter("sensor-temp-x")).toBe(false)
    expect(isTempSensor("sensor-temp-x")).toBe(true)
    expect(isTempSensor(undefined)).toBe(false)
  })

  it("detects transformer sensors by device position", () => {
    expect(getIsTransformerTempSensor("tr1")).toBe(true)
    expect(getIsTransformerTempSensor("a")).toBe(false)
  })
})

describe("getPowerSensorName", () => {
  it("builds an upper-cased vendor/model + position name", () => {
    expect(getPowerSensorName("powermeter-demo-x1-extra", "lv1_a")).toBe("DEMO X1 A")
  })

  it("upper-cases a non-powermeter type", () => {
    expect(getPowerSensorName("sensor-temp-x", "lv1_a")).toBe("SENSOR-TEMP-X")
  })

  it("returns empty for a missing type", () => {
    expect(getPowerSensorName(undefined, "lv1_a")).toBe("")
  })
})

describe("getTemperatureSensorName", () => {
  it("names the cabinet-root sensor", () => {
    expect(getTemperatureSensorName("sensor-temp-x", "lv1_lv1")).toBe("Cabinet Temp Sensor LV1")
  })

  it("names a transformer sensor", () => {
    expect(getTemperatureSensorName("sensor-temp-x", "lv1_tr1")).toBe("Transformer Temp Sensor TR1")
  })

  it("names a regular sensor by position", () => {
    expect(getTemperatureSensorName("sensor-temp-x", "lv1_a")).toBe("Temperature Sensor a")
  })

  it("returns empty for a non-temp-sensor regular device", () => {
    expect(getTemperatureSensorName("powermeter-demo", "lv1_a")).toBe("")
  })
})

describe("getTempSensorColor", () => {
  it("uses the cabinet thresholds for the root sensor", () => {
    expect(getTempSensorColor(75, "lv1_lv1")).toBe(getLvCabinetTempSensorColor(75))
  })

  it("uses the transformer thresholds for a transformer sensor", () => {
    expect(getTempSensorColor(85, "lv1_tr1")).toBe(getLvCabinetTransformerTempSensorColor(85))
    expect(getTempSensorColor(75, "lv1_tr1")).toBe("")
  })

  it("returns no colour for a regular sensor", () => {
    expect(getTempSensorColor(999, "lv1_a")).toBe("")
  })
})

describe("groupCabinetDevices", () => {
  it("groups devices by root and assigns root sensor/meter, transformer, and lists", () => {
    const devices = [
      device({ id: "rt", type: "sensor-temp-x", info: { pos: "lv1_lv1" } }),
      device({ id: "rp", type: "powermeter-demo", info: { pos: "lv1_lv1" } }),
      device({ id: "pm", type: "powermeter-demo", info: { pos: "lv1_a" } }),
      device({ id: "ts", type: "sensor-temp-x", info: { pos: "lv1_b" } }),
      device({ id: "tr", type: "sensor-temp-x", info: { pos: "lv1_tr1" } }),
    ]

    const [cabinet] = groupCabinetDevices(devices)

    expect(cabinet.id).toBe("lv1")
    expect(cabinet.rootTempSensor?.id).toBe("rt")
    expect(cabinet.rootPowerMeter?.id).toBe("rp")
    expect(cabinet.transformerTempSensor?.id).toBe("tr")
    expect(cabinet.powerMeters.map((d) => d.id)).toEqual(["pm"])
    // the transformer sensor is also a temp sensor, so it lands in tempSensors too
    expect(cabinet.tempSensors.map((d) => d.id)).toEqual(["ts", "tr"])
  })

  it("folds each device's alerts with its source device", () => {
    const devices = [
      device({
        id: "pm",
        type: "powermeter-demo",
        info: { pos: "lv1_a" },
        last: { alerts: [{ name: "over_power" }] } as never,
      }),
    ]

    const [cabinet] = groupCabinetDevices(devices)
    expect(cabinet.alerts).toHaveLength(1)
    expect(cabinet.alerts[0]?.name).toBe("over_power")
    expect(cabinet.alerts[0]?.sensorData.id).toBe("pm")
  })

  it("drops groups whose root id is empty", () => {
    const devices = [device({ id: "x", type: "powermeter-demo", info: { pos: "" } })]
    expect(groupCabinetDevices(devices)).toEqual([])
  })

  it("separates two cabinets by root", () => {
    const devices = [
      device({ id: "a", type: "powermeter-demo", info: { pos: "lv1_a" } }),
      device({ id: "b", type: "powermeter-demo", info: { pos: "lv2_a" } }),
    ]
    expect(groupCabinetDevices(devices).map((c) => c.id).sort()).toEqual(["lv1", "lv2"])
  })
})
