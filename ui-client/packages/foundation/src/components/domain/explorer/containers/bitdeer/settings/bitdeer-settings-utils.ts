import {
  getColorAndTooltipFromThresholds,
  getColorFromThresholds,
  getShouldFlashFromThresholds,
  getShouldFlashWidgetFromThresholds,
  transformThresholdsForUtility,
} from '../../../../../../utils/container-threshold-utils'
import {
  getContainerSpecificConfig,
  getContainerSpecificStats,
  getCoolingSystem,
  getStats,
} from '../../../../../../utils/device-utils'
import { CONTAINER_STATUS } from '../../../../../../utils/status-utils'

import type { UnknownRecord } from '@tetherto/core'
import { COLOR } from '@tetherto/core'
import { CONTAINER_MODEL } from '../../../../../../constants/container-constants'
import type { Container, Device } from '../../../../../../types/device'
import type { ColorAndTooltipResult } from '../../../../../../utils/container-threshold-utils'

export type OilTempThresholds = {
  COLD: number
  LIGHT_WARM: number
  WARM: number
  HOT: number
  SUPERHOT?: number
  [key: string]: unknown
}

export type PressureThresholds = {
  CRITICAL_LOW: number
  MEDIUM_LOW: number
  NORMAL?: number
  MEDIUM_HIGH: number
  CRITICAL_HIGH: number
  [key: string]: unknown
}

// Default thresholds (fallback values)
const DEFAULT_BITDEER_OIL_TEMP_THRESHOLDS: OilTempThresholds = {
  COLD: 33,
  LIGHT_WARM: 39,
  WARM: 42,
  HOT: 45,
}

const DEFAULT_BITDEER_PRESSURE_THRESHOLDS: PressureThresholds = {
  CRITICAL_LOW: 2,
  MEDIUM_LOW: 2.3,
  NORMAL: 2.3,
  MEDIUM_HIGH: 3.5,
  CRITICAL_HIGH: 4,
}

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Helper function to get thresholds from container settings or use defaults
const getBitdeerOilTempThresholds = (
  containerSettings: UnknownRecord | null = null,
): OilTempThresholds => {
  if (!containerSettings?.thresholds) {
    return DEFAULT_BITDEER_OIL_TEMP_THRESHOLDS
  }

  const transformed = transformThresholdsForUtility(
    CONTAINER_MODEL.BITDEER_THRESHOLD,
    containerSettings.thresholds as Record<string, UnknownRecord>,
  ) as UnknownRecord

  if (transformed?.oilTemperature && isObject(transformed.oilTemperature)) {
    const oilTemp = transformed.oilTemperature as unknown as OilTempThresholds
    if (
      oilTemp.COLD !== undefined &&
      oilTemp.LIGHT_WARM !== undefined &&
      oilTemp.WARM !== undefined &&
      oilTemp.HOT !== undefined
    ) {
      return oilTemp
    }
  }

  return DEFAULT_BITDEER_OIL_TEMP_THRESHOLDS
}

const getBitdeerPressureThresholds = (
  containerSettings: UnknownRecord | null = null,
): PressureThresholds => {
  if (!containerSettings?.thresholds) {
    return DEFAULT_BITDEER_PRESSURE_THRESHOLDS
  }

  const transformed = transformThresholdsForUtility(
    CONTAINER_MODEL.BITDEER_THRESHOLD,
    containerSettings.thresholds as Record<string, UnknownRecord>,
  ) as UnknownRecord

  if (transformed?.tankPressure && isObject(transformed.tankPressure)) {
    const tankPressure = transformed.tankPressure as unknown as PressureThresholds
    if (
      tankPressure.CRITICAL_LOW !== undefined &&
      tankPressure.MEDIUM_LOW !== undefined &&
      tankPressure.MEDIUM_HIGH !== undefined &&
      tankPressure.CRITICAL_HIGH !== undefined
    ) {
      return tankPressure
    }
  }

  return DEFAULT_BITDEER_PRESSURE_THRESHOLDS
}

type getBitdeerCoolingSystemDataReturn = {
  exhaustFanEnabled?: boolean
  dryCooler?: boolean
  waterPump?: boolean
  oilPump?: boolean
}

type getContainerSpecificStatsReturn = {
  exhaust_fan_enabled?: boolean
  dry_cooler?: boolean
  water_pump?: boolean
  oil_pump?: boolean
}

export const getBitdeerCoolingSystemData = (
  data: UnknownRecord,
): getBitdeerCoolingSystemDataReturn => {
  const cooling_system = getContainerSpecificStats(data as Device)?.cooling_system as
    | getContainerSpecificStatsReturn
    | undefined

  return {
    exhaustFanEnabled: cooling_system?.exhaust_fan_enabled,
    dryCooler: cooling_system?.dry_cooler,
    waterPump: cooling_system?.water_pump,
    oilPump: cooling_system?.oil_pump,
  }
}

export const getBitdeerTacticsData = (data: UnknownRecord): unknown =>
  getContainerSpecificConfig(data as Device)?.tactics

export const getBitdeerParameterSettingsData = (
  data: UnknownRecord,
): { alarms: unknown; set_temps: { cold_oil_temp_c?: number } | undefined } => {
  const alarms = getContainerSpecificConfig(data as Device)?.alarms
  const set_temps = getContainerSpecificConfig(data as Device)?.set_temps as
    | { cold_oil_temp_c?: number }
    | undefined
  return { alarms, set_temps }
}

export const getBitdeerTemperatureColor = (data: UnknownRecord, currentTemp: number): string => {
  const { set_temps } = getBitdeerParameterSettingsData(data)
  const coldOilSetTemp = set_temps?.cold_oil_temp_c

  if (coldOilSetTemp !== undefined) {
    if (currentTemp > coldOilSetTemp + 5) {
      return 'red'
    }
    if (currentTemp > coldOilSetTemp) {
      return 'orange'
    }
  }
  return ''
}

export const getBitdeerOilTemperatureColor = (
  isOilPumpEnabled: boolean,
  currentTemp: number | undefined,
  containerSettings: UnknownRecord | null = null,
): string => {
  const thresholds = getBitdeerOilTempThresholds(containerSettings)

  return getColorFromThresholds(
    currentTemp,
    {
      criticalLow: thresholds.COLD,
      alert: thresholds.COLD,
      normal: thresholds.WARM,
      alarm: thresholds.HOT,
      criticalHigh: thresholds.SUPERHOT,
    },
    !isOilPumpEnabled,
  )
}

export const getBitdeerOilTemperatureColorAndTooltip = (
  isOilPumpEnabled: boolean,
  currentTemp: number | undefined,
  containerStatus: string,
  containerSettings: UnknownRecord | null = null,
): ColorAndTooltipResult => {
  const thresholds = getBitdeerOilTempThresholds(containerSettings)

  if (!isOilPumpEnabled) {
    return {
      color: COLOR.WHITE,
      tooltip: 'Temperature monitoring disabled - Oil pump is turned off',
    }
  }

  return getColorAndTooltipFromThresholds(
    currentTemp,
    {
      criticalLow: thresholds.COLD,
      alert: thresholds.COLD,
      normal: thresholds.WARM,
      alarm: thresholds.HOT,
      criticalHigh: thresholds.SUPERHOT,
    },
    false,
    containerStatus,
  )
}

export const shouldBitdeerOilTemperatureFlash = (
  _isOilPumpEnabled: boolean,
  currentTemp: number,
  status: string,
  _data: UnknownRecord,
  containerSettings: UnknownRecord | null = null,
): boolean => {
  const thresholds = getBitdeerOilTempThresholds(containerSettings)

  return getShouldFlashFromThresholds(
    currentTemp,
    {
      criticalLow: thresholds.COLD,
      alert: thresholds.COLD,
      normal: thresholds.WARM,
      alarm: thresholds.HOT,
      criticalHigh: thresholds.SUPERHOT,
    },
    status,
  )
}

export const shouldBitdeerOilTemperatureSuperflash = (
  _isOilPumpEnabled: boolean,
  currentTemp: number,
  status: string,
  _data: UnknownRecord,
  containerSettings: UnknownRecord | null = null,
): boolean => {
  const thresholds = getBitdeerOilTempThresholds(containerSettings)

  return getShouldFlashWidgetFromThresholds(
    currentTemp,
    {
      criticalLow: thresholds.COLD,
      alert: thresholds.COLD,
      normal: thresholds.WARM,
      alarm: thresholds.HOT,
      criticalHigh: thresholds.SUPERHOT,
    },
    status,
  )
}

export const shouldBitdeerTankPressureFlash = (
  isOilPumpEnabled: boolean,
  currentPressure: number,
  containerStatus: string,
  _data: UnknownRecord,
  containerSettings: UnknownRecord | null = null,
): boolean => {
  if (!isOilPumpEnabled) {
    return false
  }

  const thresholds = getBitdeerPressureThresholds(containerSettings)

  return getShouldFlashFromThresholds(
    currentPressure,
    {
      criticalLow: thresholds.CRITICAL_LOW,
      alarmLow: thresholds.MEDIUM_LOW,
      normal: thresholds.NORMAL,
      alarmHigh: thresholds.MEDIUM_HIGH,
      criticalHigh: thresholds.CRITICAL_HIGH,
    },
    containerStatus,
  )
}

export const shouldBitdeerTankPressureSuperflash = (
  _isOilPumpEnabled: boolean,
  currentPressure: number,
  status: string,
  _data: UnknownRecord,
  containerSettings: UnknownRecord | null = null,
): boolean => {
  const thresholds = getBitdeerPressureThresholds(containerSettings)

  return getShouldFlashWidgetFromThresholds(
    currentPressure,
    {
      criticalLow: thresholds.CRITICAL_LOW,
      alarmLow: thresholds.MEDIUM_LOW,
      normal: thresholds.NORMAL,
      alarmHigh: thresholds.MEDIUM_HIGH,
      criticalHigh: thresholds.CRITICAL_HIGH,
    },
    status,
  )
}

export const bitdeerHasAlarmingValue = (
  container: Container,
  containerSettings: UnknownRecord | null = null,
): { hasAlarm: boolean; isCriticallyHigh: boolean } => {
  const coolingSystem = getCoolingSystem(container) as {
    oil_pump?: Array<{ cold_temp_c?: number; enabled?: boolean }>
    tank1_bar?: number
    tank2_bar?: number
  }

  const {
    oil_pump: [{ cold_temp_c: cold_temp_c_1 } = {}, { cold_temp_c: cold_temp_c_2 } = {}] = [],
    oil_pump = [],
    tank1_bar,
    tank2_bar,
  } = coolingSystem

  const pressureThresholds = getBitdeerPressureThresholds(containerSettings)
  const oilTempThresholds = getBitdeerOilTempThresholds(containerSettings)

  const { status } = getStats(container) as { status: string }
  const isContainerStopped = status === CONTAINER_STATUS.STOPPED
  const isContainerOffline = status === CONTAINER_STATUS.OFFLINE

  const pump1Enabled = oil_pump?.[0]?.enabled ?? false
  const pump2Enabled = oil_pump?.[1]?.enabled ?? false

  const pressuresToCheck: number[] = []
  if (pump1Enabled && tank1_bar !== undefined) {
    pressuresToCheck.push(tank1_bar)
  }
  if (pump2Enabled && tank2_bar !== undefined) {
    pressuresToCheck.push(tank2_bar)
  }

  const anyPressureTooLow =
    !isContainerStopped &&
    !isContainerOffline &&
    pressuresToCheck.some((value) => (value ?? 0) < pressureThresholds.CRITICAL_LOW)

  const anyPressureTooHigh =
    !isContainerStopped &&
    !isContainerOffline &&
    pressuresToCheck.some((value) => (value ?? 0) >= pressureThresholds.CRITICAL_HIGH)

  const superhotThreshold = oilTempThresholds.SUPERHOT
  const tempsToCheck: (number | undefined)[] = []

  if (pump1Enabled) tempsToCheck.push(cold_temp_c_1)
  if (pump2Enabled) tempsToCheck.push(cold_temp_c_2)

  const anyTempCriticalHigh =
    !isContainerStopped &&
    !isContainerOffline &&
    superhotThreshold !== undefined &&
    tempsToCheck.some((value) => (value ?? 0) >= superhotThreshold)

  const anyTempCriticalLow =
    !isContainerStopped &&
    !isContainerOffline &&
    tempsToCheck.some((value) => (value ?? 0) < oilTempThresholds.COLD)

  const hasAlarm =
    anyTempCriticalHigh || anyTempCriticalLow || anyPressureTooLow || anyPressureTooHigh
  const isCriticallyHigh = anyTempCriticalHigh || anyPressureTooHigh

  return { hasAlarm, isCriticallyHigh }
}

export const getBitdeerTankPressureColor = (
  _isOilPumpEnabled: boolean,
  currentPressure: number,
  _data: UnknownRecord,
  containerSettings: UnknownRecord | null = null,
): string => {
  const thresholds = getBitdeerPressureThresholds(containerSettings)

  return getColorFromThresholds(
    currentPressure,
    {
      criticalLow: thresholds.CRITICAL_LOW,
      alarmLow: thresholds.MEDIUM_LOW,
      normal: thresholds.NORMAL,
      alarmHigh: thresholds.MEDIUM_HIGH,
      criticalHigh: thresholds.CRITICAL_HIGH,
    },
    false,
  )
}

export const getBitdeerTankPressureColorAndTooltip = (
  isOilPumpEnabled: boolean,
  currentPressure: number,
  containerStatus: string,
  containerSettings: UnknownRecord | null = null,
): ColorAndTooltipResult => {
  const thresholds = getBitdeerPressureThresholds(containerSettings)

  if (!isOilPumpEnabled) {
    return {
      color: COLOR.WHITE,
      tooltip: 'Pressure monitoring disabled - Oil pump is turned off',
    }
  }

  return getColorAndTooltipFromThresholds(
    currentPressure,
    {
      criticalLow: thresholds.CRITICAL_LOW,
      alarmLow: thresholds.MEDIUM_LOW,
      normal: thresholds.NORMAL,
      alarmHigh: thresholds.MEDIUM_HIGH,
      criticalHigh: thresholds.CRITICAL_HIGH,
    },
    false,
    containerStatus,
  )
}
