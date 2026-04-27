import { CONTAINER_MODEL } from '../../../../../constants/container-constants'
import type { ContainerSnap, Device } from '../../../../../types/device'
import {
  getColorFromThresholds,
  getShouldFlashFromThresholds,
  getShouldFlashWidgetFromThresholds,
  transformThresholdsForUtility,
} from '../../../../../utils/container-threshold-utils'
import { CONTAINER_STATUS } from '../../../../../utils/status-utils'

/**
 * Default temperature thresholds for immersion cooling
 */
const DEFAULT_IMMERSION_TEMP_THRESHOLDS = {
  COLD: 33,
  LIGHT_WARM: 42,
  WARM: 46,
  HOT: 48,
  SUPERHOT: 48, // Default to same as HOT if not provided
} as const

/**
 * Temperature threshold map by character/status
 */
export const BITMAIN_IMMERSION_OIL_TEMP_MIN_BY_CHARACTER_MAP = {
  'Critical Low': -Infinity,
  Alert: DEFAULT_IMMERSION_TEMP_THRESHOLDS.COLD,
  Normal: DEFAULT_IMMERSION_TEMP_THRESHOLDS.LIGHT_WARM,
  Alarm: DEFAULT_IMMERSION_TEMP_THRESHOLDS.WARM,
  'Critical High': DEFAULT_IMMERSION_TEMP_THRESHOLDS.HOT,
} as const

type ContainerSettings = {
  thresholds?: Record<string, unknown>
}

/**
 * Get immersion temperature thresholds from container settings or defaults
 */
const getImmersionTempThresholds = (
  containerSettings: ContainerSettings | null = null,
): Record<string, number> => {
  if (!containerSettings?.thresholds) {
    return { ...DEFAULT_IMMERSION_TEMP_THRESHOLDS }
  }

  const transformed = transformThresholdsForUtility(
    CONTAINER_MODEL.IMMERSION_THRESHOLD,
    containerSettings.thresholds as Record<string, Record<string, unknown>>,
  )

  if (transformed?.oilTemperature) {
    return transformed.oilTemperature as Record<string, number>
  }

  return { ...DEFAULT_IMMERSION_TEMP_THRESHOLDS }
}

/**
 * Get color based on current temperature and thresholds
 *
 * @param currentTemp - Current temperature value (undefined/null when not reported)
 * @param containerStatus - Container status
 * @param containerSettings - Optional container settings with custom thresholds
 * @returns Color string for the temperature
 */
export const getImmersionTemperatureColor = (
  currentTemp: number | null | undefined,
  containerStatus: string,
  containerSettings: ContainerSettings | null = null,
): string => {
  const thresholds = getImmersionTempThresholds(containerSettings)

  // Everything between COLD and LIGHT_WARM should be YELLOW (alert)
  return getColorFromThresholds(
    currentTemp,
    {
      criticalLow: thresholds.COLD,
      alert: thresholds.COLD, // Alert starts where critical low ends
      normal: thresholds.LIGHT_WARM,
      alarm: thresholds.WARM,
      criticalHigh: thresholds.HOT,
    },
    false,
    containerStatus,
  )
}

/**
 * Determine if temperature should flash based on thresholds
 *
 * @param currentTemp - Current temperature value (undefined/null when not reported)
 * @param containerStatus - Container status
 * @param containerSettings - Optional container settings with custom thresholds
 * @returns Whether the temperature display should flash
 */
export const shouldImmersionTemperatureFlash = (
  currentTemp: number | null | undefined,
  containerStatus: string,
  containerSettings: ContainerSettings | null = null,
): boolean => {
  const thresholds = getImmersionTempThresholds(containerSettings)

  return getShouldFlashFromThresholds(
    currentTemp,
    {
      criticalLow: thresholds.COLD,
      alert: thresholds.COLD,
      normal: thresholds.LIGHT_WARM,
      alarm: thresholds.WARM,
      criticalHigh: thresholds.HOT,
    },
    containerStatus,
  )
}

/**
 * Determine if temperature should super-flash (widget flash) based on thresholds
 *
 * @param currentTemp - Current temperature value (undefined/null when not reported)
 * @param containerStatus - Container status
 * @param containerSettings - Optional container settings with custom thresholds
 * @returns Whether the widget should flash
 */
export const shouldImmersionTemperatureSuperflash = (
  currentTemp: number | null | undefined,
  containerStatus: string,
  containerSettings: ContainerSettings | null = null,
): boolean => {
  const thresholds = getImmersionTempThresholds(containerSettings)

  return getShouldFlashWidgetFromThresholds(
    currentTemp,
    {
      criticalLow: thresholds.COLD,
      alert: thresholds.COLD,
      normal: thresholds.LIGHT_WARM,
      alarm: thresholds.WARM,
      criticalHigh: thresholds.HOT,
    },
    containerStatus,
  )
}

/**
 * Check if any temperature value is a number within critical thresholds
 */
const isNumberInRange = (value: unknown, predicate: (num: number) => boolean): value is number => {
  return typeof value === 'number' && !Number.isNaN(value) && predicate(value)
}

/**
 * Check if immersion container has any alarming values
 *
 * @param data - Device data
 * @param containerSettings - Optional container settings with custom thresholds
 * @returns Object with hasAlarm and isCriticallyHigh flags
 */
export const immersionHasAlarmingValue = (
  data: Device,
  containerSettings: ContainerSettings | null = null,
): { hasAlarm: boolean; isCriticallyHigh: boolean } => {
  const thresholds = getImmersionTempThresholds(containerSettings)
  const snap = data?.last?.snap as ContainerSnap
  const stats = snap?.stats

  const primary_supply_temp = stats?.primary_supply_temp
  const second_supply_temp1 = stats?.second_supply_temp1
  const second_supply_temp2 = stats?.second_supply_temp2
  const status = data?.status
  const isPrimaryCirculatingPumpAlarmOn = stats?.primary_circulating_pump

  // Check container status
  const isContainerStopped = status === CONTAINER_STATUS.STOPPED
  const isContainerOffline = status === CONTAINER_STATUS.OFFLINE

  // Critical low should trigger regardless of tank status, but not offline/stopped
  const temps = [primary_supply_temp, second_supply_temp1, second_supply_temp2]
  const anyTempCriticalLow =
    !isContainerStopped &&
    !isContainerOffline &&
    temps.some((temp) => isNumberInRange(temp, (num) => num < (thresholds.COLD as number)))

  // Critical high - only check SUPERHOT (never use HOT as fallback)
  const superhotThreshold = thresholds.SUPERHOT
  const anyTempCriticalHigh =
    !isContainerStopped &&
    !isContainerOffline &&
    superhotThreshold !== undefined &&
    temps.some((temp) => isNumberInRange(temp, (num) => num >= superhotThreshold))

  const hasAlarm = !!isPrimaryCirculatingPumpAlarmOn || anyTempCriticalLow || anyTempCriticalHigh
  const isCriticallyHigh = anyTempCriticalHigh

  return { hasAlarm, isCriticallyHigh }
}
