/**
 * Container Widgets derivation — pure per-container slicing of the realtime
 * miner aggregate, container-settings threshold matching, and (generic) alarm
 * state.
 *
 * This module owns the aggregate-field-name knowledge (`*_cnt`,
 * `*_group_*_aggr`) so the React layers never reference those strings — the
 * separation-of-concerns rule in `docs/ARCHITECTURE.md`. The widget cards feed
 * on the shapes returned here; the devkit hook formats them into card props.
 *
 * Ported from the reference app's `Views/ContainerWidgets/ContainerWidget.util.ts` and
 * `app/utils/containerThresholdsHelpers` (verified against staging 2026-07-01).
 *
 * @category op-centre
 */

import { CONTAINER_SETTINGS_MODEL } from '../constants/container-constants'
import { MinerStatuses } from '../constants/device-constants'
import { MINER_POWER_MODE, SOCKET_STATUSES } from '../constants/status-constants'
import type {
  ContainerSettingsEntry,
  ListThingsDevice,
  TailLogEntry,
} from '../types/api-mining.types'
import {
  isAntspaceHydroContainer,
  isAntspaceImmersionContainer,
  isBitdeerContainer,
  isMicroBTContainer,
} from './container-tabs'

/**
 * Realtime aggregate count field → activity status key (the reference app's
 * `PowerModesMap`). Each field carries a `Record<containerModel, number>`.
 */
const ACTIVITY_COUNT_FIELD = {
  offline_cnt: MinerStatuses.OFFLINE,
  not_mining_cnt: MinerStatuses.NOT_MINING,
  power_mode_normal_include_error_cnt: MinerStatuses.ERROR,
  power_mode_low_cnt: MINER_POWER_MODE.LOW,
  power_mode_normal_cnt: MINER_POWER_MODE.NORMAL,
  power_mode_high_cnt: MINER_POWER_MODE.HIGH,
} as const

/** Realtime summary aggregate field names (these carry the `_aggr` suffix). */
export const CONTAINER_WIDGETS_SUMMARY_FIELD = {
  HASHRATE_MHS_1M_SUM: 'hashrate_mhs_1m_group_sum_aggr',
  TEMPERATURE_MAX: 'temperature_c_group_max_aggr',
  TEMPERATURE_AVG: 'temperature_c_group_avg_aggr',
} as const

/** All realtime aggregate fields the cards read — the tail-log `aggrFields` set. */
export const CONTAINER_WIDGETS_AGGR_FIELD_KEYS = [
  ...Object.keys(ACTIVITY_COUNT_FIELD),
  ...Object.values(CONTAINER_WIDGETS_SUMMARY_FIELD),
] as const

const MEGA_PER_TERA = 1_000_000

/** Per-container-model value map carried by each realtime aggregate field. */
type ContainerModelValueMap = Record<string, number | undefined>

const modelValue = (
  realtime: TailLogEntry | undefined,
  field: string,
  containerModel: string,
): number | undefined => {
  const map = realtime?.[field] as ContainerModelValueMap | undefined
  return map?.[containerModel]
}

/**
 * Per-status miner counts for one container. Keyed by miner status/power-mode
 * (`offline`, `error`, `low`, `normal`, `high`, `disconnected`) plus the
 * derived totals — the shape the activity chart reads.
 */
export type ContainerActivity = {
  total: number
  actualMiners: number
  [status: string]: number
}

/**
 * Slice the realtime aggregate into one container's per-status miner counts.
 * `total` is the container's nominal miner capacity; miners not accounted for
 * by any status count collapse into `disconnected` (never negative). With no
 * realtime sample yet, every miner reads as `disconnected`.
 */
export const deriveContainerActivity = (
  realtime: TailLogEntry | undefined,
  containerModel: string,
  total: number,
): ContainerActivity => {
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 0

  if (!realtime) {
    return {
      [SOCKET_STATUSES.MINER_DISCONNECTED]: safeTotal,
      total: safeTotal,
      actualMiners: 0,
    }
  }

  const counts: Record<string, number> = {}
  let counted = 0
  for (const [field, status] of Object.entries(ACTIVITY_COUNT_FIELD)) {
    const value = modelValue(realtime, field, containerModel) ?? 0
    counts[status] = value
    counted += value
  }

  const disconnected = Math.max(0, safeTotal - counted)
  return {
    ...counts,
    [SOCKET_STATUSES.MINER_DISCONNECTED]: disconnected,
    total: safeTotal,
    actualMiners: safeTotal - disconnected,
  }
}

/**
 * One container's headline numbers, sliced from the realtime aggregate. Raw
 * numbers only — hashrate is converted MH/s → TH/s; the devkit hook formats
 * these into display strings with units. Fields are `undefined` when the
 * aggregate has no sample for the container yet.
 */
export type ContainerSummary = {
  hashrateThs?: number
  maxTempC?: number
  avgTempC?: number
}

export const deriveContainerSummary = (
  realtime: TailLogEntry | undefined,
  containerModel: string,
): ContainerSummary => {
  const hashrateMhs = modelValue(
    realtime,
    CONTAINER_WIDGETS_SUMMARY_FIELD.HASHRATE_MHS_1M_SUM,
    containerModel,
  )
  return {
    hashrateThs: hashrateMhs === undefined ? undefined : hashrateMhs / MEGA_PER_TERA,
    maxTempC: modelValue(realtime, CONTAINER_WIDGETS_SUMMARY_FIELD.TEMPERATURE_MAX, containerModel),
    avgTempC: modelValue(realtime, CONTAINER_WIDGETS_SUMMARY_FIELD.TEMPERATURE_AVG, containerModel),
  }
}

/**
 * Map a container type string to its settings-model key (`bd` / `mbt` /
 * `hydro` / `immersion`), or `null` for an unknown family. Mirrors the reference app's
 * `getContainerSettingsModel`.
 */
export const getContainerSettingsModel = (containerType: string | undefined): string | null => {
  if (!containerType) return null
  if (isBitdeerContainer(containerType)) return CONTAINER_SETTINGS_MODEL.BITDEER
  if (isMicroBTContainer(containerType)) return CONTAINER_SETTINGS_MODEL.MICROBT
  if (isAntspaceHydroContainer(containerType)) return CONTAINER_SETTINGS_MODEL.HYDRO
  if (isAntspaceImmersionContainer(containerType)) return CONTAINER_SETTINGS_MODEL.IMMERSION
  return null
}

/**
 * Find the container-settings row for a container type: an exact `model`
 * match first, else the settings-model family fallback. Mirrors the reference app's
 * `findMatchingContainer`.
 */
export const findMatchingContainer = (
  settings: ContainerSettingsEntry[] | undefined,
  containerType: string | undefined,
): ContainerSettingsEntry | null => {
  if (!settings || !Array.isArray(settings) || !containerType) return null

  const exactMatch = settings.find(({ model }) => model === containerType)
  if (exactMatch) return exactMatch

  const settingsModel = getContainerSettingsModel(containerType)
  if (settingsModel) return settings.find(({ model }) => model === settingsModel) ?? null

  return null
}

/**
 * Whether a container's card should flash (a live alarm) and whether that
 * alarm is critically-high (drives the confirmation-modal beep).
 */
export type ContainerAlarmState = {
  shouldFlash: boolean
  isCriticallyHigh: boolean
}

const NO_ALARM: ContainerAlarmState = { shouldFlash: false, isCriticallyHigh: false }

/**
 * Resolve a container's alarm state from its live stats and matched settings.
 *
 * TODO(MDK Op Centre #7): port the per-vendor threshold comparisons
 * (`bitdeerHasAlarmingValue`, `immersionHasAlarmingValue`,
 * `microBtHasAlarmingValue`, `antspaceHydroHasAlarmingValue`) that read
 * `last.snap.stats.container_specific`. Until the vendor boxes land, every
 * container reads as non-alarming — the generic grid never flashes, which is
 * the correct read-only behaviour for now.
 */
export const getWidgetAlarmState = (
  _container: ListThingsDevice,
  _settings: ContainerSettingsEntry | null = null,
): ContainerAlarmState => NO_ALARM

/** One immersion tank's readings for the widget tanks box. */
export type TankReading = {
  /** `Tank 1`, `Tank 2`, … (1-based from the oil-pump index). */
  label: string
  /** Cold-side oil temperature (°C), or undefined when unavailable. */
  temperatureC?: number
  /** Whether this tank's oil pump is running. */
  oilPumpEnabled: boolean
  /** Whether this tank's water pump is running. */
  waterPumpEnabled: boolean
  /** Tank pressure (bar), when the container reports it. */
  pressureBar?: number
}

type CoolingPump = { enabled?: boolean; cold_temp_c?: number }
type CoolingSystem = {
  oil_pump?: CoolingPump[]
  water_pump?: CoolingPump[]
  tank1_bar?: number
  tank2_bar?: number
}

const readNum = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

/**
 * Derive the per-tank readings for a container's immersion cooling system —
 * one entry per oil pump, joined with the matching water pump and (when
 * present) the tank pressure. Returns an empty array for containers without an
 * immersion cooling system (non-immersion vendors), so the tanks box only
 * renders where it applies. Mirrors the reference app's `getTanksBoxData`; the per-vendor
 * temperature/pressure threshold colouring is a follow-up (MDK Op Centre #7).
 */
export const deriveContainerTanks = (container: ListThingsDevice): TankReading[] => {
  const containerSpecific = container.last?.snap?.stats?.container_specific as
    | { cooling_system?: CoolingSystem }
    | undefined
  const cooling = containerSpecific?.cooling_system
  const oilPumps = Array.isArray(cooling?.oil_pump) ? cooling.oil_pump : []
  const waterPumps = Array.isArray(cooling?.water_pump) ? cooling.water_pump : []
  const bars = [cooling?.tank1_bar, cooling?.tank2_bar]

  return oilPumps.map((pump, index) => ({
    label: `Tank ${index + 1}`,
    temperatureC: readNum(pump?.cold_temp_c),
    oilPumpEnabled: Boolean(pump?.enabled),
    waterPumpEnabled: Boolean(waterPumps[index]?.enabled),
    pressureBar: readNum(bars[index]),
  }))
}
