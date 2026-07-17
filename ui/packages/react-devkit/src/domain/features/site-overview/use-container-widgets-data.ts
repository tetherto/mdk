import { createElement, useMemo } from 'react'
import type { ReactNode } from 'react'

import { formatValueUnit, UNITS } from '@primitives'

import { useContainerSettings, useContainerWidgets } from '@tetherto/mdk-react-adapter'
import type { UseContainerWidgetsOptions } from '@tetherto/mdk-react-adapter'
import {
  CONTAINER_STATUS,
  deriveContainerActivity,
  deriveContainerSummary,
  deriveContainerTanks,
  findMatchingContainer,
  getWidgetAlarmState,
} from '@tetherto/mdk-ui-foundation'
import type { ListThingsDevice, TailLogEntry } from '@tetherto/mdk-ui-foundation'

import { getContainerName } from '../../utils/container-utils'
import { TanksBox } from '../../components/container/tanks-box/tanks-box'
import type { MinersSummaryParam } from '../../components/container/miners-summary-box'
import type { ContainerWidgetItem } from './container-widgets/container-widgets'

const THS_PER_PHS = 1_000

/** Format a raw number + unit, falling back to `-` when the value is absent. */
const formatSummaryValue = (value: number | undefined, unit: string): string =>
  formatValueUnit(value ?? Number.NaN, unit)

/**
 * Build the four miners-summary rows one card shows — Efficiency, Hash Rate,
 * Max Temp, Avg Temp — from the container power (W) and the sliced realtime
 * summary. Efficiency is `power_w / hashrate(TH/s)`; hash rate is shown in
 * PH/s. Mirrors the reference app's `MinersSummaryBox`.
 */
const buildSummaryRows = (
  powerW: number | undefined,
  hashrateThs: number | undefined,
  maxTempC: number | undefined,
  avgTempC: number | undefined,
): MinersSummaryParam[] => {
  const efficiency =
    powerW !== undefined && hashrateThs !== undefined && hashrateThs > 0
      ? powerW / hashrateThs
      : undefined
  const hashratePhs = hashrateThs === undefined ? undefined : hashrateThs / THS_PER_PHS

  return [
    { label: 'Efficiency', value: formatSummaryValue(efficiency, UNITS.EFFICIENCY_W_PER_TH_S) },
    { label: 'Hash Rate', value: formatSummaryValue(hashratePhs, UNITS.HASHRATE_PH_S) },
    { label: 'Max Temp', value: formatSummaryValue(maxTempC, UNITS.TEMPERATURE_C) },
    { label: 'Avg Temp', value: formatSummaryValue(avgTempC, UNITS.TEMPERATURE_C) },
  ]
}

const readNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

/**
 * Build the vendor-specific card content — currently the immersion tanks box.
 * Returns `undefined` for containers without an immersion cooling system, so
 * the generic card carries no per-model branching. Threshold-based temperature
 * colouring is a follow-up (MDK Op Centre #7); the pump Running/Off status is
 * already conveyed by the box.
 */
const buildVendorContent = (container: ListThingsDevice): ReactNode => {
  const tanks = deriveContainerTanks(container)
  if (tanks.length === 0) return undefined

  return createElement(TanksBox, {
    data: {
      oil_pump: tanks.map((tank) => ({
        cold_temp_c: tank.temperatureC ?? 0,
        enabled: tank.oilPumpEnabled,
      })),
      water_pump: tanks.map((tank) => ({ enabled: tank.waterPumpEnabled })),
      pressure: tanks.map((tank) => ({ value: tank.pressureBar })),
    },
  })
}

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

/** Card-ready payload for one container plus its live critical-high flag. */
type ShapedContainer = { item: ContainerWidgetItem; isCriticallyHigh: boolean }

const shapeContainer = (
  container: ListThingsDevice,
  realtime: TailLogEntry | undefined,
  settings: Parameters<typeof findMatchingContainer>[0],
): ShapedContainer => {
  const containerModel = readString(container.info?.container) ?? ''
  const stats = (container.last?.snap?.stats ?? {}) as Record<string, unknown>

  const powerW = readNumber(stats.power_w)
  const status = readString(stats.status)
  const isOffline = status === CONTAINER_STATUS.OFFLINE
  const total = Number(container.info?.nominalMinerCapacity ?? 0)

  const activity = deriveContainerActivity(realtime, containerModel, total)
  const { hashrateThs, maxTempC, avgTempC } = deriveContainerSummary(realtime, containerModel)

  const matchedSettings = findMatchingContainer(settings, container.type ?? containerModel)
  const { shouldFlash, isCriticallyHigh } = getWidgetAlarmState(container, matchedSettings)

  return {
    item: {
      id: container.id,
      title: getContainerName(containerModel, container.type) || containerModel || container.id,
      power: powerW,
      powerUnit: UNITS.POWER_KW,
      summary: buildSummaryRows(powerW, hashrateThs, maxTempC, avgTempC),
      vendorContent: buildVendorContent(container),
      activity,
      isOffline,
      statsErrorMessage: readString(stats.error_msg) ?? null,
      errorMessage: readString(container.last?.err) ?? undefined,
      flash: shouldFlash,
    },
    isCriticallyHigh,
  }
}

export type UseContainerWidgetsDataOptions = UseContainerWidgetsOptions

export type UseContainerWidgetsDataResult = {
  /** Card-ready data for every container, one entry per widget card. */
  containers: ContainerWidgetItem[]
  isLoading: boolean
  /** Human-readable message when either underlying query errors, else undefined. */
  errorMessage?: string
  /** True when any container is in a critical-high alarm (drives the beep/modal). */
  hasAnyCriticallyHigh: boolean
  refetch: () => void
}

/**
 * Site Overview data hook: composes the container inventory + realtime miner
 * aggregate ({@link useContainerWidgets}) with the per-model thresholds
 * ({@link useContainerSettings}) and shapes them into the card-ready
 * `ContainerWidgetItem[]` the `<ContainerWidgets>` grid renders. All
 * aggregate-field slicing and alarm math lives in `@tetherto/mdk-ui-foundation`;
 * this hook only formats display values and selects card props.
 *
 * @category dashboards
 * @domain mining-operations
 * @kernelCapability device-management
 * @tier agent-ready
 */
export const useContainerWidgetsData = (
  options: UseContainerWidgetsDataOptions = {},
): UseContainerWidgetsDataResult => {
  const { containers, realtime, isLoading, error, refetch } = useContainerWidgets(options)
  const { settings } = useContainerSettings()

  const shaped = useMemo(
    () => containers.map((container) => shapeContainer(container, realtime, settings)),
    [containers, realtime, settings],
  )

  return {
    containers: shaped.map((entry) => entry.item),
    isLoading,
    errorMessage: error ? 'Failed to load containers.' : undefined,
    hasAnyCriticallyHigh: shaped.some((entry) => entry.isCriticallyHigh),
    refetch,
  }
}
