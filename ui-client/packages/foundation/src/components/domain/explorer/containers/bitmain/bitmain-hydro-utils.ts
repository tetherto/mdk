import type { UnknownRecord } from '@tetherto/mdk-core-ui'
import { CONTAINER_MODEL } from '../../../../../constants/container-constants'
import type { ContainerSnap, Device } from '../../../../../types/device'
import {
  getColorFromThresholds,
  getShouldFlashFromThresholds,
  getShouldFlashWidgetFromThresholds,
  transformThresholdsForUtility,
} from '../../../../../utils/container-threshold-utils'
import { getDeviceData } from '../../../../../utils/device-utils'
import { CONTAINER_STATUS } from '../../../../../utils/status-utils'

type AntspaceSupplyLiquidThresholds = {
  COLD: number
  LIGHT_WARM: number
  WARM: number
  HOT: number
  SUPERHOT: number
}

type AntspacePressureThresholds = {
  LOW: number
  MEDIUM_LOW: number
  MEDIUM_HIGH: number
  HIGH: number
}

type ContainerSettings = {
  thresholds?: Record<string, UnknownRecord>
}

const DEFAULT_ANTSPACE_SUPPLY_LIQUID_THRESHOLDS: AntspaceSupplyLiquidThresholds = {
  COLD: 21,
  LIGHT_WARM: 25,
  WARM: 30,
  HOT: 37,
  SUPERHOT: 40,
}

const DEFAULT_ANTSPACE_SUPPLY_LIQUID_PRESSURE_THRESHOLDS: AntspacePressureThresholds = {
  LOW: 2,
  MEDIUM_LOW: 2.3,
  MEDIUM_HIGH: 3.5,
  HIGH: 4,
}

export const BITMAIN_HYDRO_WATER_TEMP_MIN_BY_CHARACTER_MAP = {
  'Critical Low': -Infinity,
  'Alarm Low': DEFAULT_ANTSPACE_SUPPLY_LIQUID_THRESHOLDS.COLD,
  Alert: DEFAULT_ANTSPACE_SUPPLY_LIQUID_THRESHOLDS.LIGHT_WARM,
  Normal: DEFAULT_ANTSPACE_SUPPLY_LIQUID_THRESHOLDS.WARM,
  'Alarm High': DEFAULT_ANTSPACE_SUPPLY_LIQUID_THRESHOLDS.HOT,
  'Critical High': DEFAULT_ANTSPACE_SUPPLY_LIQUID_THRESHOLDS.SUPERHOT,
} as const

export const BITMAIN_HYDRO_SUPPLY_LIQUID_PRESSURE_MIN_BY_CHARACTER_MAP = {
  'Critical Low': -Infinity,
  'Alarm Low': DEFAULT_ANTSPACE_SUPPLY_LIQUID_PRESSURE_THRESHOLDS.LOW,
  Normal: DEFAULT_ANTSPACE_SUPPLY_LIQUID_PRESSURE_THRESHOLDS.MEDIUM_LOW,
  'Alarm High': DEFAULT_ANTSPACE_SUPPLY_LIQUID_PRESSURE_THRESHOLDS.MEDIUM_HIGH,
  'Critical High': DEFAULT_ANTSPACE_SUPPLY_LIQUID_PRESSURE_THRESHOLDS.HIGH,
} as const

/**
 * Check if value is a valid object with properties
 */
const isValidObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Get Antspace supply liquid temperature thresholds
 */
const getAntspaceSupplyLiquidThresholds = (
  _data?: Device,
  containerSettings: ContainerSettings | null = null,
): AntspaceSupplyLiquidThresholds => {
  if (!containerSettings?.thresholds) {
    return DEFAULT_ANTSPACE_SUPPLY_LIQUID_THRESHOLDS
  }

  const transformed = transformThresholdsForUtility(
    CONTAINER_MODEL.HYDRO_THRESHOLD,
    containerSettings.thresholds,
  )

  if (isValidObject(transformed?.waterTemperature)) {
    const waterTemp = transformed.waterTemperature as Partial<AntspaceSupplyLiquidThresholds>
    if (
      typeof waterTemp.COLD === 'number' &&
      typeof waterTemp.LIGHT_WARM === 'number' &&
      typeof waterTemp.WARM === 'number' &&
      typeof waterTemp.HOT === 'number' &&
      typeof waterTemp.SUPERHOT === 'number'
    ) {
      return waterTemp as AntspaceSupplyLiquidThresholds
    }
  }

  return DEFAULT_ANTSPACE_SUPPLY_LIQUID_THRESHOLDS
}

/**
 * Get Antspace pressure thresholds
 */
const getAntspacePressureThresholds = (
  _data?: Device,
  containerSettings: ContainerSettings | null = null,
): AntspacePressureThresholds => {
  if (!containerSettings?.thresholds) {
    return DEFAULT_ANTSPACE_SUPPLY_LIQUID_PRESSURE_THRESHOLDS
  }

  const transformed = transformThresholdsForUtility(
    CONTAINER_MODEL.HYDRO_THRESHOLD,
    containerSettings.thresholds,
  )

  if (isValidObject(transformed?.supplyLiquidPressure)) {
    const supplyPressure = transformed.supplyLiquidPressure as Partial<AntspacePressureThresholds>
    if (
      typeof supplyPressure.LOW === 'number' &&
      typeof supplyPressure.MEDIUM_LOW === 'number' &&
      typeof supplyPressure.MEDIUM_HIGH === 'number' &&
      typeof supplyPressure.HIGH === 'number'
    ) {
      return supplyPressure as AntspacePressureThresholds
    }
  }

  return DEFAULT_ANTSPACE_SUPPLY_LIQUID_PRESSURE_THRESHOLDS
}

/**
 * Get color for supply liquid temperature based on value and status
 */
export const getAntspaceSupplyLiquidTemperatureColor = (
  currentTemp: number,
  containerStatus?: string,
  data?: Device,
  containerSettings: ContainerSettings | null = null,
): string => {
  const thresholds = getAntspaceSupplyLiquidThresholds(data, containerSettings)

  // Everything between COLD and WARM should be YELLOW (alert)
  return getColorFromThresholds(
    currentTemp,
    {
      criticalLow: thresholds.COLD,
      alert: thresholds.COLD, // Alert starts where critical low ends
      normal: thresholds.WARM,
      alarm: thresholds.HOT,
      criticalHigh: thresholds.SUPERHOT,
    },
    false,
    containerStatus,
  )
}

/**
 * Get color for supply liquid pressure based on value and status
 */
export const getAntspaceSupplyLiquidPressureColor = (
  currentPressure: number,
  containerStatus?: string,
  data?: Device,
  containerSettings: ContainerSettings | null = null,
): string => {
  const thresholds = getAntspacePressureThresholds(data, containerSettings)

  return getColorFromThresholds(
    currentPressure,
    {
      criticalLow: thresholds.LOW,
      alarmLow: thresholds.LOW,
      normal: thresholds.MEDIUM_LOW,
      alarmHigh: thresholds.MEDIUM_HIGH,
      criticalHigh: thresholds.HIGH,
    },
    false,
    containerStatus,
  )
}

/**
 * Check if pressure should flash
 */
export const shouldAntspacePressureFlash = (
  pressure: number,
  status?: string,
  data?: Device,
  containerSettings: ContainerSettings | null = null,
): boolean => {
  const thresholds = getAntspacePressureThresholds(data, containerSettings)

  if (pressure == null || Number.isNaN(pressure)) {
    return false
  }

  return getShouldFlashFromThresholds(
    pressure,
    {
      criticalLow: thresholds.LOW,
      alarmLow: thresholds.LOW,
      normal: thresholds.MEDIUM_LOW,
      alarmHigh: thresholds.MEDIUM_HIGH,
      criticalHigh: thresholds.HIGH,
    },
    status,
  )
}

/**
 * Check if pressure should superflash
 */
export const shouldAntspacePressureSuperflash = (
  pressure: number,
  status?: string,
  data?: Device,
  containerSettings: ContainerSettings | null = null,
): boolean => {
  const thresholds = getAntspacePressureThresholds(data, containerSettings)

  return getShouldFlashWidgetFromThresholds(
    pressure,
    {
      criticalLow: thresholds.LOW,
      alarmLow: thresholds.LOW,
      normal: thresholds.MEDIUM_LOW,
      alarmHigh: thresholds.MEDIUM_HIGH,
      criticalHigh: thresholds.HIGH,
    },
    status,
  )
}

/**
 * Check if supply liquid temperature should flash
 */
export const shouldAntspaceSupplyLiquidTempFlash = (
  currentTemp: number,
  status?: string,
  data?: Device,
  containerSettings: ContainerSettings | null = null,
): boolean => {
  const thresholds = getAntspaceSupplyLiquidThresholds(data, containerSettings)

  return getShouldFlashFromThresholds(
    currentTemp,
    {
      criticalLow: thresholds.COLD,
      alarmLow: thresholds.COLD,
      alert: thresholds.LIGHT_WARM,
      normal: thresholds.WARM,
      alarmHigh: thresholds.HOT,
      criticalHigh: thresholds.SUPERHOT,
    },
    status,
  )
}

/**
 * Check if supply liquid temperature should superflash
 */
export const shouldAntspaceSupplyLiquidTempSuperflash = (
  currentTemp: number,
  status?: string,
  data?: Device,
  containerSettings: ContainerSettings | null = null,
): boolean => {
  const thresholds = getAntspaceSupplyLiquidThresholds(data, containerSettings)

  return getShouldFlashWidgetFromThresholds(
    currentTemp,
    {
      criticalLow: thresholds.COLD,
      alarmLow: thresholds.COLD,
      alert: thresholds.LIGHT_WARM,
      normal: thresholds.WARM,
      alarmHigh: thresholds.HOT,
      criticalHigh: thresholds.SUPERHOT,
    },
    status,
  )
}

/**
 * Check if Antspace Hydro has any alarming values
 */
export const antspaceHydroHasAlarmingValue = (
  temp1: number,
  temp2: number,
  pressure1: number,
  pressure2: number,
  data?: Device,
  containerSettings: ContainerSettings | null = null,
): { hasAlarm: boolean; isCriticallyHigh: boolean } => {
  const tempThresholds = getAntspaceSupplyLiquidThresholds(data, containerSettings)
  const pressureThresholds = getAntspacePressureThresholds(data, containerSettings)

  // Extract status from device data
  const [, deviceData] = getDeviceData(data)
  const snap = deviceData?.snap as ContainerSnap | undefined
  const status = snap?.stats?.status as string | undefined

  const isContainerStopped = status === CONTAINER_STATUS.STOPPED
  const isContainerOffline = status === CONTAINER_STATUS.OFFLINE

  // Critical high temp - should not trigger for offline/stopped containers
  const alarmingTemp =
    !isContainerStopped &&
    !isContainerOffline &&
    (temp1 >= tempThresholds.SUPERHOT || temp2 >= tempThresholds.SUPERHOT)

  // Critical low should trigger regardless of tank status, but not offline/stopped
  const alarmingTempLow =
    !isContainerStopped &&
    !isContainerOffline &&
    (temp1 < tempThresholds.COLD || temp2 < tempThresholds.COLD)

  // Critical high pressure - should not trigger for offline/stopped containers
  const alarmingPressure =
    !isContainerStopped &&
    !isContainerOffline &&
    (pressure1 >= pressureThresholds.HIGH || pressure2 >= pressureThresholds.HIGH)

  // Critical low pressure should trigger regardless of tank status, but not offline/stopped
  const alarmingPressureLow =
    !isContainerStopped &&
    !isContainerOffline &&
    (pressure1 < pressureThresholds.LOW || pressure2 < pressureThresholds.LOW)

  const hasAlarm = alarmingTemp || alarmingTempLow || alarmingPressure || alarmingPressureLow
  const isCriticallyHigh = alarmingTemp || alarmingPressure

  return { hasAlarm, isCriticallyHigh }
}
