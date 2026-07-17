import {
  CABINET_DEVICES_TYPES_NAME_MAP,
  COMPLETE_CONTAINER_TYPE,
  COMPLETE_MINER_TYPES,
  CONTAINER_STATUS,
  CONTAINER_TYPE_NAME_MAP,
  MINER_POWER_MODE,
  MINER_TYPE_NAME_MAP,
  MinerStatuses,
} from "@tetherto/mdk-ui-foundation"
import type { LocalFilters } from "@primitives"
import type { ListThingsDevice } from "@tetherto/mdk-ui-foundation"

import { isContainerOffline } from "../../utils/container-utils"
import type { ContainerSnap } from "../../types/device"
import type {
  DeviceExplorerDeviceType,
  DeviceExplorerFilterOption,
} from "../../components/device-explorer/types"

/**
 * Client-side Explorer filter categories, keyed by the response-field path each
 * one reads off a row. These are display filters over the fetched page (not
 * backend query strings) — mirrors the reference app's `LIST_VIEW_FILTER_OPTIONS`.
 *
 * @tier internal
 */
export const EXPLORER_FILTER_FIELD = {
  TYPE: "type",
  STATUS: "last.snap.stats.status",
  CONTAINER_ALARM: "last.snap.stats.alarm_status",
  POWER_MODE: "last.snap.config.power_mode",
  MINER_LED: "last.snap.config.led_status",
} as const

const BOOL_VALUE = { ON: "true", OFF: "false" } as const

const capitalize = (value: string): string =>
  value.length === 0 ? value : value[0]!.toUpperCase() + value.slice(1)

/** `{ value: label }` map → cascader children, preserving map order. */
const nameMapToOptions = (map: Record<string, string>): DeviceExplorerFilterOption[] =>
  Object.entries(map).map(([value, label]) => ({ value, label }))

const literalsToOptions = (values: readonly string[]): DeviceExplorerFilterOption[] =>
  values.map((value) => ({ value, label: capitalize(value) }))

const CONTAINER_TYPE_OPTION: DeviceExplorerFilterOption = {
  value: EXPLORER_FILTER_FIELD.TYPE,
  label: "Type",
  children: Object.values(COMPLETE_CONTAINER_TYPE).map((type) => ({
    value: type,
    label: CONTAINER_TYPE_NAME_MAP[type as keyof typeof CONTAINER_TYPE_NAME_MAP] ?? type,
  })),
}

const MINER_TYPE_OPTION: DeviceExplorerFilterOption = {
  value: EXPLORER_FILTER_FIELD.TYPE,
  label: "Type",
  children: Object.values(COMPLETE_MINER_TYPES).map((type) => ({
    value: type,
    label: MINER_TYPE_NAME_MAP[type as keyof typeof MINER_TYPE_NAME_MAP] ?? type,
  })),
}

const CABINET_TYPE_OPTION: DeviceExplorerFilterOption = {
  value: EXPLORER_FILTER_FIELD.TYPE,
  label: "Type",
  children: nameMapToOptions(CABINET_DEVICES_TYPES_NAME_MAP),
}

const CONTAINER_STATUS_OPTION: DeviceExplorerFilterOption = {
  value: EXPLORER_FILTER_FIELD.STATUS,
  label: "Status",
  children: literalsToOptions(Object.values(CONTAINER_STATUS)),
}

const MINER_STATUS_OPTION: DeviceExplorerFilterOption = {
  value: EXPLORER_FILTER_FIELD.STATUS,
  label: "Status",
  children: literalsToOptions(Object.values(MinerStatuses)),
}

const CONTAINER_ALARM_OPTION: DeviceExplorerFilterOption = {
  value: EXPLORER_FILTER_FIELD.CONTAINER_ALARM,
  label: "Container Alarm",
  children: [
    { value: BOOL_VALUE.ON, label: "Alarm on" },
    { value: BOOL_VALUE.OFF, label: "Alarm off" },
  ],
}

const POWER_MODE_OPTION: DeviceExplorerFilterOption = {
  value: EXPLORER_FILTER_FIELD.POWER_MODE,
  label: "Power mode",
  children: literalsToOptions(Object.values(MINER_POWER_MODE)),
}

const MINER_LED_OPTION: DeviceExplorerFilterOption = {
  value: EXPLORER_FILTER_FIELD.MINER_LED,
  label: "Miner LED",
  children: [
    { value: BOOL_VALUE.ON, label: "LED on" },
    { value: BOOL_VALUE.OFF, label: "LED off" },
  ],
}

const OPTIONS_BY_TAB: Record<DeviceExplorerDeviceType, DeviceExplorerFilterOption[]> = {
  container: [CONTAINER_TYPE_OPTION, CONTAINER_STATUS_OPTION, CONTAINER_ALARM_OPTION],
  miner: [MINER_TYPE_OPTION, MINER_STATUS_OPTION, POWER_MODE_OPTION, MINER_LED_OPTION],
  cabinet: [CABINET_TYPE_OPTION],
}

/** The filter cascader options for one Explorer tab (the reference app parity). */
export const getExplorerFilterOptions = (
  deviceType: DeviceExplorerDeviceType,
): DeviceExplorerFilterOption[] => OPTIONS_BY_TAB[deviceType] ?? []

const hasContainerAlarm = (row: ListThingsDevice): boolean => {
  const stats = (row.last?.snap as ContainerSnap | undefined)?.stats as
    | { alarm_status?: unknown }
    | undefined
  if (typeof stats?.alarm_status === "boolean") {
    return stats.alarm_status
  }
  return (Array.isArray(row.last?.alerts) && row.last.alerts.length > 0) || Boolean(row.last?.err)
}

/** Read the value a filter category compares against, as a string. */
const readFilterField = (row: ListThingsDevice, field: string): string => {
  const snap = row.last?.snap as ContainerSnap | undefined
  switch (field) {
    case EXPLORER_FILTER_FIELD.TYPE:
      return row.type ?? ""
    case EXPLORER_FILTER_FIELD.STATUS:
      return isContainerOffline(snap ?? {}) ? CONTAINER_STATUS.OFFLINE : String(snap?.stats?.status ?? "")
    case EXPLORER_FILTER_FIELD.CONTAINER_ALARM:
      return String(hasContainerAlarm(row))
    case EXPLORER_FILTER_FIELD.POWER_MODE:
      return String(snap?.config?.power_mode ?? "")
    case EXPLORER_FILTER_FIELD.MINER_LED:
      return String(snap?.config?.led_status ?? "")
    default:
      return ""
  }
}

/** A row passes when it matches every active filter category (values OR-ed within a category). */
export const matchesExplorerFilters = (row: ListThingsDevice, filters: LocalFilters): boolean =>
  Object.entries(filters).every(([field, wanted]) => {
    const values = (Array.isArray(wanted) ? wanted : [wanted]).map(String)
    if (values.length === 0) {
      return true
    }
    return values.includes(readFilterField(row, field))
  })
