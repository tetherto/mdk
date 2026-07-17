import { useMemo } from "react"

import { formatNumber, UNITS, unitToKilo } from "@primitives"

import { useCabinetDevices, useDevices, useTimezoneFormatter } from "@tetherto/mdk-react-adapter"
import { CONTAINER_STATUS } from "@tetherto/mdk-ui-foundation"

import type { TimelineItemData } from "../../components/alarm/alarm-row/alarm-row"
import { CROSS_THING_TYPES } from "../../constants/devices"
import type { Device } from "../../types/device"
import {
  type CabinetAlert,
  getPowerSensorName,
  getTemperatureSensorName,
  getTempSensorColor,
  groupCabinetDevices,
} from "../../utils/cabinet-utils"
import { getCabinetTitle } from "../../utils/device-utils"
import { getAlertTimelineItems, getLogFormattedAlertData } from "../../utils/alerts-utils"

const DASH = "-"

/** One sensor / powermeter reading row rendered in the cabinet detail. */
export type CabinetReadingRow = {
  /** Stable key — the source device id. */
  id: string
  /** Display name (sensor / powermeter name). */
  label: string
  /** Formatted reading, or `-` when unavailable. */
  value: string
  /** Unit shown next to the value. */
  unit: string
  /** Severity colour for a temperature reading (empty when nominal). */
  color?: string
  /** Whether the source device reports offline. */
  isOffline: boolean
}

export type UseCabinetDetailResult = {
  /** Whether a cabinet is selected at all. */
  hasSelection: boolean
  /** Cabinet display title (`LV Cabinet 1` / transformer title). */
  title: string
  /** The non-root powermeter reading rows. */
  powerMeters: CabinetReadingRow[]
  /** The cabinet-root temperature reading, when present. */
  rootTempSensor?: CabinetReadingRow
  /** The non-root temperature sensor reading rows. */
  tempSensors: CabinetReadingRow[]
  /** Active-warnings timeline items for the "LV cabinet warnings" box. */
  alarmsDataItems: TimelineItemData[]
  isLoading: boolean
}

const readNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined

const isDeviceOffline = (device: Device): boolean =>
  device.last?.snap?.stats?.status === CONTAINER_STATUS.OFFLINE

const toPowerRow = (meter: Device): CabinetReadingRow => {
  const powerW = readNumber(meter.last?.snap?.stats?.power_w) ?? 0
  return {
    id: meter.id,
    label: getPowerSensorName(meter.type, meter.info?.pos),
    value: formatNumber(unitToKilo(powerW)),
    unit: UNITS.POWER_KW,
    isOffline: isDeviceOffline(meter),
  }
}

const toTempRow = (sensor: Device): CabinetReadingRow => {
  const tempC = readNumber(sensor.last?.snap?.stats?.temp_c)
  return {
    id: sensor.id,
    label: getTemperatureSensorName(sensor.type, sensor.info?.pos),
    value: tempC !== undefined ? String(tempC) : DASH,
    unit: UNITS.TEMPERATURE_C,
    color: getTempSensorColor(tempC ?? 0, sensor.info?.pos),
    isOffline: isDeviceOffline(sensor),
  }
}

/**
 * Reads the selected LV cabinet from `devicesStore`, re-fetches its family of
 * powermeters and temperature sensors by root ({@link useCabinetDevices}) at the
 * realtime cadence, and shapes them into the read-only rows the
 * {@link CabinetDetailCard} renders — powermeter readings (→ kW), the root plus
 * per-position temperature readings (severity-coloured), and the active-warnings
 * timeline folded from every device's `last.alerts`.
 *
 * @category cards
 * @domain device-management
 * @tier advanced
 */
export const useCabinetDetail = (
  onNavigate: (path: string) => void = () => {},
): UseCabinetDetailResult => {
  const { selectedLvCabinets } = useDevices()
  const { getFormattedDate } = useTimezoneFormatter()

  const rootKey = Object.keys(selectedLvCabinets)[0] ?? ""
  const { devices, isLoading } = useCabinetDevices(rootKey)

  return useMemo(() => {
    if (!rootKey) {
      return {
        hasSelection: false,
        title: "",
        powerMeters: [],
        tempSensors: [],
        alarmsDataItems: [],
        isLoading: false,
      }
    }

    const [cabinet] = groupCabinetDevices(devices as Device[])

    if (!cabinet) {
      return {
        hasSelection: true,
        title: "",
        powerMeters: [],
        tempSensors: [],
        alarmsDataItems: [],
        isLoading,
      }
    }

    const logs = (cabinet.alerts as CabinetAlert[]).map((alert) => {
      const formatted = getLogFormattedAlertData(
        {
          alert,
          id: alert.sensorData?.id ?? "",
          type: CROSS_THING_TYPES.CABINET,
          info: alert.sensorData?.info,
        },
        getFormattedDate,
      )
      // Timeline items need a string uuid for the click-through key.
      return { ...formatted, uuid: formatted.uuid ?? "" }
    })

    return {
      hasSelection: true,
      title: getCabinetTitle(cabinet),
      powerMeters: cabinet.powerMeters.map(toPowerRow),
      rootTempSensor: cabinet.rootTempSensor ? toTempRow(cabinet.rootTempSensor) : undefined,
      tempSensors: cabinet.tempSensors.map(toTempRow),
      alarmsDataItems: getAlertTimelineItems(logs, onNavigate),
      isLoading,
    }
  }, [rootKey, devices, isLoading, getFormattedDate, onNavigate])
}
