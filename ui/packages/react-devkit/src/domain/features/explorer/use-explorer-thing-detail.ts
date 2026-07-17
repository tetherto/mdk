import { useMemo } from "react"

import { formatValueUnit, UNITS, unitToKilo } from "@primitives"

import { useThingDetail } from "@tetherto/mdk-react-adapter"
import type { UseThingDetailOptions } from "@tetherto/mdk-react-adapter"
import { CONTAINER_STATUS } from "@tetherto/mdk-ui-foundation"
import type { ListThingsDevice } from "@tetherto/mdk-ui-foundation"

import { getContainerName, isContainerOffline } from "../../utils/container-utils"
import type { ContainerSnap } from "../../types/device"

const readNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined

const readString = (value: unknown): string =>
  typeof value === "string" ? value : ""

export type ExplorerThingDetailRow = {
  label: string
  value: string
}

export type UseExplorerThingDetailResult = {
  /** Whether an id was provided at all — drives the "select a row" empty state. */
  hasSelection: boolean
  /** Display name of the selected thing (container name / pos / id fallback). */
  title: string
  /** Raw status string, or `offline`. Empty when unknown. */
  status: string
  isOffline: boolean
  /** Label/value rows ready to render (Status, Temp, Humidity, Consumption). */
  rows: ExplorerThingDetailRow[]
  /** Count of active alarms on the thing. */
  alarmsCount: number
  isLoading: boolean
  /** Human-readable message when the query errors, else undefined. */
  errorMessage?: string
}

/**
 * Explorer detail hook: fetches one thing by id ({@link useThingDetail}) and
 * shapes it into display-ready rows for the Explorer detail panel. Reads the
 * same snapshot fields the container table columns show (status, ambient temp,
 * humidity, power → kW) so the panel and the row stay consistent. Returns a
 * `hasSelection: false` result when no id is given.
 *
 * @category cards
 * @domain device-management
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const useExplorerThingDetail = (
  id: string | undefined,
  options: UseThingDetailOptions = {},
): UseExplorerThingDetailResult => {
  const { thing, isLoading, error } = useThingDetail(id, options)

  return useMemo(() => {
    if (!id) {
      return {
        hasSelection: false,
        title: "",
        status: "",
        isOffline: false,
        rows: [],
        alarmsCount: 0,
        isLoading: false,
      }
    }

    const row = thing as ListThingsDevice | undefined
    const snap = row?.last?.snap as ContainerSnap | undefined
    const stats = snap?.stats
    const offline = isContainerOffline(snap ?? {})
    const status = offline ? CONTAINER_STATUS.OFFLINE : readString(stats?.status)

    const ambientTempC = readNumber(stats?.ambient_temp_c)
    const humidityPercent = readNumber(stats?.humidity_percent)
    const powerW = readNumber(stats?.power_w)

    const rows: ExplorerThingDetailRow[] = [
      { label: "Status", value: status || "-" },
      {
        label: "Temp",
        value: offline || ambientTempC === undefined ? "-" : formatValueUnit(ambientTempC, UNITS.TEMPERATURE_C),
      },
      {
        label: "Humidity",
        value: offline || humidityPercent === undefined ? "-" : formatValueUnit(humidityPercent, UNITS.PERCENT),
      },
      {
        label: "Consumption",
        value: offline || powerW === undefined ? "-" : formatValueUnit(unitToKilo(powerW), UNITS.POWER_KW),
      },
    ]

    return {
      hasSelection: true,
      title:
        getContainerName(row?.info?.container) || readString(row?.info?.pos) || id,
      status,
      isOffline: offline,
      rows,
      alarmsCount: Array.isArray(row?.last?.alerts) ? row.last.alerts.length : 0,
      isLoading,
      errorMessage: error ? "Failed to load device details." : undefined,
    }
  }, [id, thing, isLoading, error])
}
