import { CROSS_THING_TYPES } from "../constants/devices"
import type { Alert } from "../types/alerts"
import type { Device } from "../types/device"
import {
  getLvCabinetTempSensorColor,
  getLvCabinetTransformerTempSensorColor,
} from "./device-utils"

/** `info.pos` on a cabinet device is `<root>_<devicePos>` (e.g. `lv1_a`). */
const CABINET_POS_SEPARATOR = "_"
/** Thing-type prefixes for the two cabinet device kinds. */
const POWERMETER_TYPE_PREFIX = "powermeter-"
const TEMP_SENSOR_TYPE_PREFIX = "sensor-temp-"
/** A device position that starts with this belongs to a transformer sensor. */
const TRANSFORMER_POS_PREFIX = "tr"
/** How many `-`-separated segments of a powermeter type form its display name. */
const POWERMETER_NAME_SEGMENTS = 2

export const isPowerMeter = (type: string | undefined): boolean =>
  typeof type === "string" && type.startsWith(POWERMETER_TYPE_PREFIX)

export const isTempSensor = (type: string | undefined): boolean =>
  typeof type === "string" && type.startsWith(TEMP_SENSOR_TYPE_PREFIX)

export const getIsTransformerTempSensor = (devicePos: string | undefined): boolean =>
  typeof devicePos === "string" && devicePos.startsWith(TRANSFORMER_POS_PREFIX)

/** Split a cabinet device's `info.pos` into its `{ root, devicePos }`. */
export const getCabinetPos = (device: {
  info?: { pos?: string }
}): { root: string; devicePos: string } => {
  const [root = "", devicePos = ""] = (device?.info?.pos ?? "").split(CABINET_POS_SEPARATOR)
  return { root, devicePos }
}

/**
 * Display name for a power sensor: the vendor/model segments of the powermeter
 * type plus the device position (e.g. `powermeter-demo-x1` at `a` → `DEMO X1 A`).
 * Non-powermeter types fall back to the upper-cased type.
 */
export const getPowerSensorName = (
  powerSensorType: string | undefined,
  pos: string | undefined,
): string => {
  const { devicePos } = getCabinetPos({ info: { pos } })
  if (!powerSensorType) return ""
  if (!isPowerMeter(powerSensorType)) return powerSensorType.toUpperCase()

  const model = powerSensorType
    .replace(POWERMETER_TYPE_PREFIX, "")
    .split("-")
    .slice(0, POWERMETER_NAME_SEGMENTS)
    .join(" ")
  return `${model.toUpperCase()} ${devicePos.toUpperCase()}`.trim()
}

/**
 * Display name for a temperature sensor — the cabinet-root sensor, a
 * transformer sensor, and a regular sensor each read differently.
 */
export const getTemperatureSensorName = (
  type: string | undefined,
  pos: string | undefined,
): string => {
  const { root, devicePos } = getCabinetPos({ info: { pos } })
  if (root === devicePos) {
    return `Cabinet Temp Sensor ${devicePos ? getPowerSensorName(devicePos, pos) : ""}`.trim()
  }
  if (getIsTransformerTempSensor(devicePos)) {
    return `Transformer Temp Sensor ${devicePos ? getPowerSensorName(devicePos, pos) : ""}`.trim()
  }
  return isTempSensor(type) ? `Temperature Sensor ${devicePos}`.trim() : ""
}

/** Severity colour for a temp reading — transformer sensors run hotter. */
export const getTempSensorColor = (temp: number, pos: string | undefined): string => {
  const { root, devicePos } = getCabinetPos({ info: { pos } })
  if (root === devicePos) return getLvCabinetTempSensorColor(temp)
  if (getIsTransformerTempSensor(devicePos)) return getLvCabinetTransformerTempSensorColor(temp)
  return ""
}

/** An alert kept together with the sensor/powermeter it was raised on. */
export type CabinetAlert = Alert & { sensorData: Device }

/** One physical LV cabinet with its grouped sensors, powermeters and alerts. */
export type GroupedCabinet = {
  /** The cabinet root (`getCabinetPos(...).root`) — its identity. */
  id: string
  type: string
  code?: unknown
  rack?: unknown
  /** The thing id of the last device folded in (parity with the reference app). */
  thingId?: unknown
  rootTempSensor?: Device
  rootPowerMeter?: Device
  transformerTempSensor?: Device
  powerMeters: Device[]
  tempSensors: Device[]
  connectedDevices: string[]
  alerts: CabinetAlert[]
}

const foldCabinetAlerts = (acc: CabinetAlert[], device: Device): CabinetAlert[] => {
  const alerts = device.last?.alerts
  if (!Array.isArray(alerts) || alerts.length === 0) return acc
  return alerts.map((alert) => ({ ...(alert as Alert), sensorData: device })).concat(acc)
}

/**
 * Group a flat list of cabinet devices (powermeters + temperature sensors) into
 * one entry per physical cabinet, keyed by the root parsed from each device's
 * `info.pos`. Mirrors the reference app's `groupCabinetDevices`: the root-position sensor /
 * meter become `rootTempSensor` / `rootPowerMeter`, transformer sensors collect
 * under `transformerTempSensor`, the rest fill `powerMeters` / `tempSensors`,
 * and every device's `last.alerts` are folded (with their source device) into
 * `alerts`. Cabinets with an empty root id are dropped.
 */
export const groupCabinetDevices = (devices: Device[]): GroupedCabinet[] => {
  const byRoot = new Map<string, Device[]>()
  for (const device of devices) {
    const { root } = getCabinetPos(device)
    const bucket = byRoot.get(root)
    if (bucket) bucket.push(device)
    else byRoot.set(root, [device])
  }

  const cabinets: GroupedCabinet[] = []
  for (const [, group] of byRoot) {
    const cabinet = group.reduce<GroupedCabinet>(
      (acc, device) => {
        const { root, devicePos } = getCabinetPos(device)
        const isTempSensorData = isTempSensor(device.type)
        const isPowerMeterData = isPowerMeter(device.type)
        const isRootTempSensor = root === devicePos && isTempSensorData
        const isRootPowerMeter = root === devicePos && isPowerMeterData
        const connectedDevices = (device.info?.connectedDevices as string[] | undefined) ?? []

        return {
          ...acc,
          id: root,
          type: CROSS_THING_TYPES.CABINET,
          code: device.code,
          rack: device.rack,
          thingId: device.id,
          rootTempSensor: isRootTempSensor ? device : acc.rootTempSensor,
          rootPowerMeter: isRootPowerMeter ? device : acc.rootPowerMeter,
          transformerTempSensor: getIsTransformerTempSensor(devicePos)
            ? device
            : acc.transformerTempSensor,
          powerMeters:
            isPowerMeterData && !isRootPowerMeter ? [...acc.powerMeters, device] : acc.powerMeters,
          tempSensors:
            isTempSensorData && !isRootTempSensor ? [...acc.tempSensors, device] : acc.tempSensors,
          connectedDevices: Array.from(new Set([...acc.connectedDevices, ...connectedDevices])),
          alerts: foldCabinetAlerts(acc.alerts, device),
        }
      },
      {
        id: "",
        type: CROSS_THING_TYPES.CABINET,
        powerMeters: [],
        tempSensors: [],
        connectedDevices: [],
        alerts: [],
      },
    )

    if (cabinet.id.trim() !== "") cabinets.push(cabinet)
  }

  return cabinets
}
