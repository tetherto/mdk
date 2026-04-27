import { CONTAINER_MODEL } from '../../../../../../constants/container-constants'
import type { ContainerSnap, Device } from '../../../../../../types'
import {
  getColorFromThresholds,
  getShouldFlashFromThresholds,
  transformThresholdsForUtility,
} from '../../../../../../utils/container-threshold-utils'
import { getDeviceData } from '../../../../../../utils/device-utils'
import { CONTAINER_STATUS } from '../../../../../../utils/status-utils'

type MicroBTTempThresholds = {
  COLD: number
  LIGHT_WARM: number
  WARM: number
  HOT: number
}

/**
 * Default MicroBT temperature thresholds
 */
export const DEFAULT_MICROBT_TEMP_THRESHOLDS: MicroBTTempThresholds = {
  COLD: 25,
  LIGHT_WARM: 33,
  WARM: 37,
  HOT: 39,
}

/**
 * Water temperature min thresholds by character
 */
export const MICROBT_WATER_TEMP_MIN_BY_CHARACTER_MAP = {
  'Critical Low': -Infinity,
  'Alarm Low': DEFAULT_MICROBT_TEMP_THRESHOLDS.COLD,
  Normal: DEFAULT_MICROBT_TEMP_THRESHOLDS.LIGHT_WARM,
  'Alarm High': DEFAULT_MICROBT_TEMP_THRESHOLDS.WARM,
  'Critical High': DEFAULT_MICROBT_TEMP_THRESHOLDS.HOT,
} as const

/**
 * Get MicroBT temperature thresholds from device and container settings
 */
export const getMicroBTTempThresholds = (
  containerSettings: { thresholds?: Record<string, unknown> } | null = null,
): MicroBTTempThresholds => {
  if (!containerSettings?.thresholds) {
    return DEFAULT_MICROBT_TEMP_THRESHOLDS
  }

  const transformed = transformThresholdsForUtility(
    CONTAINER_MODEL.MICROBT_THRESHOLD,
    containerSettings.thresholds as Record<string, Record<string, unknown>>,
  )

  if (transformed?.waterTemperature) {
    const waterTemp = transformed.waterTemperature as Record<string, unknown>
    return {
      COLD: (waterTemp.COLD as number) ?? DEFAULT_MICROBT_TEMP_THRESHOLDS.COLD,
      LIGHT_WARM: (waterTemp.LIGHT_WARM as number) ?? DEFAULT_MICROBT_TEMP_THRESHOLDS.LIGHT_WARM,
      WARM: (waterTemp.WARM as number) ?? DEFAULT_MICROBT_TEMP_THRESHOLDS.WARM,
      HOT: (waterTemp.HOT as number) ?? DEFAULT_MICROBT_TEMP_THRESHOLDS.HOT,
    }
  }

  return DEFAULT_MICROBT_TEMP_THRESHOLDS
}

/**
 * Check if MicroBT has alarming temperature value
 */
export const microBtHasAlarmingValue = (
  currentTemp: number,
  data?: Device,
  containerSettings: { thresholds?: Record<string, unknown> } | null = null,
): { hasAlarm: boolean; isCriticallyHigh: boolean } => {
  const thresholds = getMicroBTTempThresholds(containerSettings)
  const status = data?.status as string
  const isContainerStopped = status === CONTAINER_STATUS.STOPPED
  const isContainerOffline = status === CONTAINER_STATUS.OFFLINE

  // Critical low should trigger regardless of cooling status, but not offline/stopped
  const isCriticalLow = !isContainerStopped && !isContainerOffline && currentTemp < thresholds.COLD

  // Critical high should also not trigger for offline/stopped containers
  const isCriticalHigh = !isContainerStopped && !isContainerOffline && currentTemp >= thresholds.HOT

  const hasAlarm = isCriticalLow || isCriticalHigh

  return { hasAlarm, isCriticallyHigh: isCriticalHigh }
}

/**
 * Get MicroBT threshold settings data from device
 */
export const getMicroBTThresholdSettingsData = (
  data?: Device,
): {
  coolingFanRunningSpeedThreshold: number | undefined
  coolingFanStartTemperatureThreshold: number | undefined
  coolingFanStopTemperatureThreshold: number | undefined
} => {
  const [, deviceData] = getDeviceData(data)
  const snap = deviceData?.snap as ContainerSnap
  const containerSpecific = snap?.stats?.container_specific
  const cdu = containerSpecific?.cdu as Record<string, unknown> | undefined

  return {
    coolingFanRunningSpeedThreshold: cdu?.cooling_fan_running_speed_threshold as number | undefined,
    coolingFanStartTemperatureThreshold: cdu?.cooling_fan_start_temperature_threshold as
      | number
      | undefined,
    coolingFanStopTemperatureThreshold: cdu?.cooling_fan_stop_temperature_threshold as
      | number
      | undefined,
  }
}

/**
 * Get color for MicroBT inlet temperature based on thresholds
 */
export const getMicroBtInletTempColor = (
  currentTemp: number,
  isCoolingEnabled: boolean,
  containerSettings: { thresholds?: Record<string, unknown> } | null = null,
): string => {
  const thresholds = getMicroBTTempThresholds(containerSettings)

  return getColorFromThresholds(
    currentTemp,
    {
      criticalLow: thresholds.COLD,
      alarmLow: thresholds.COLD,
      normal: thresholds.LIGHT_WARM,
      alarmHigh: thresholds.WARM,
      criticalHigh: thresholds.HOT,
    },
    !isCoolingEnabled, // disabled if cooling is not enabled
  )
}

/**
 * Determine if MicroBT temperature should flash
 */
export const shouldMicroBtTemperatureFlash = (
  currentTemp: number,
  isCoolingEnabled: boolean,
  data?: Device,
  containerSettings: { thresholds?: Record<string, unknown> } | null = null,
): boolean => {
  // If cooling is disabled, don't flash
  if (!isCoolingEnabled) {
    return false
  }

  const thresholds = getMicroBTTempThresholds(containerSettings)
  const status = data?.status as string

  return getShouldFlashFromThresholds(
    currentTemp,
    {
      criticalLow: thresholds.COLD,
      alarmLow: thresholds.COLD,
      normal: thresholds.LIGHT_WARM,
      alarmHigh: thresholds.WARM,
      criticalHigh: thresholds.HOT,
    },
    status,
  )
}

/**
 * Determine if MicroBT temperature should superflash (widget flash)
 */
export const shouldMicroBtTemperatureSuperflash = (
  currentTemp: number,
  data?: Device,
  containerSettings: { thresholds?: Record<string, unknown> } | null = null,
): boolean => {
  // Superflash logic is the same as alarming value logic for MicroBT
  return microBtHasAlarmingValue(currentTemp, data, containerSettings).hasAlarm
}
