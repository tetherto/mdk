import type { UnknownRecord } from '@tetherto/mdk-core-ui'
import { COLOR } from '@tetherto/mdk-core-ui'
import { CONTAINER_MODEL } from '../constants/container-constants'
import { getDefaultThresholdStructure } from './container-settings-utils'
import { getContainerSettingsModel } from './container-utils'
import { CONTAINER_STATUS, THRESHOLD_LEVEL } from './status-utils'

export type ContainerSetting = {
  model?: string
  thresholds?: UnknownRecord
}

type ThresholdKeyMapping = {
  [key: string]: string
}

type ThresholdTypeMapping = {
  [thresholdType: string]: ThresholdKeyMapping
}

type ThresholdKeyMappings = {
  bitdeer: ThresholdTypeMapping
  microbt: ThresholdTypeMapping
  hydro: ThresholdTypeMapping
  immersion: ThresholdTypeMapping
}

// Helper function to get container type pattern from full model string
const getContainerTypePattern = (fullModelString: string): string | null => {
  if (fullModelString.startsWith('container-bd-')) return CONTAINER_MODEL.BITDEER_THRESHOLD
  if (fullModelString.startsWith('container-mbt-')) return CONTAINER_MODEL.MICROBT_THRESHOLD
  if (fullModelString.startsWith('container-as-hk3')) return CONTAINER_MODEL.HYDRO_THRESHOLD
  if (fullModelString.startsWith('container-as-immersion'))
    return CONTAINER_MODEL.IMMERSION_THRESHOLD
  return null
}

export const evaluateThresholdState = (
  currentValue: number | undefined | null,
  thresholds: {
    criticalLow?: number
    alert?: number
    normal?: number
    alarm?: number
    criticalHigh?: number
    alarmLow?: number
    alarmHigh?: number
  },
  isContainerStopped: boolean = false,
  isContainerOffline: boolean = false,
): ThresholdStateResult => {
  // Handle undefined/null values
  if (currentValue === undefined || currentValue === null) {
    return {
      state: THRESHOLD_LEVEL.NORMAL,
      color: COLOR.GREEN,
      shouldFlash: false,
      shouldFlashWidget: false,
    }
  }

  const { criticalLow, alert, normal, alarm, criticalHigh, alarmLow, alarmHigh } = thresholds

  // Check from most extreme to least extreme
  // Critical states always take priority

  // Critical High: value >= criticalHigh
  if (criticalHigh !== undefined && currentValue >= criticalHigh) {
    return {
      state: THRESHOLD_LEVEL.CRITICAL_HIGH,
      color: COLOR.RED,
      shouldFlash: !isContainerStopped && !isContainerOffline,
      shouldFlashWidget: !isContainerStopped && !isContainerOffline,
    }
  }

  // Critical Low: value < criticalLow
  if (criticalLow !== undefined && currentValue < criticalLow) {
    return {
      state: THRESHOLD_LEVEL.CRITICAL_LOW,
      color: COLOR.RED,
      shouldFlash: !isContainerStopped && !isContainerOffline,
      shouldFlashWidget: !isContainerStopped && !isContainerOffline,
    }
  }

  // Alarm High (for alternative threshold structure): value >= alarmHigh
  if (alarmHigh !== undefined && currentValue >= alarmHigh) {
    return {
      state: THRESHOLD_LEVEL.ALARM_HIGH,
      color: COLOR.ORANGE,
      shouldFlash: !isContainerStopped && !isContainerOffline,
      shouldFlashWidget: false,
    }
  }

  // Alarm (for standard threshold structure): value >= alarm
  if (alarm !== undefined && currentValue >= alarm) {
    return {
      state: THRESHOLD_LEVEL.ALARM,
      color: COLOR.ORANGE,
      shouldFlash: !isContainerStopped && !isContainerOffline,
      shouldFlashWidget: false,
    }
  }

  // Normal range: normal <= value < alarm
  if (normal !== undefined && currentValue >= normal) {
    return {
      state: THRESHOLD_LEVEL.NORMAL,
      color: COLOR.GREEN,
      shouldFlash: false,
      shouldFlashWidget: false,
    }
  }

  // Alarm Low (for alternative threshold structure): alarmLow <= value < normal
  if (alarmLow !== undefined && currentValue >= alarmLow) {
    return {
      state: THRESHOLD_LEVEL.ALARM_LOW,
      color: COLOR.GOLD,
      shouldFlash: !isContainerStopped && !isContainerOffline,
      shouldFlashWidget: false,
    }
  }

  // Alert range: criticalLow <= value < normal (when alert is defined)
  // This handles the case where alert == criticalLow, meaning everything between criticalLow and normal is alert
  if (
    alert !== undefined &&
    normal !== undefined &&
    currentValue >= alert &&
    currentValue < normal
  ) {
    return {
      state: THRESHOLD_LEVEL.ALERT,
      color: COLOR.GOLD,
      shouldFlash: false,
      shouldFlashWidget: false,
    }
  }

  // Fallback to normal if no specific threshold is met
  return {
    state: THRESHOLD_LEVEL.NORMAL,
    color: COLOR.GREEN,
    shouldFlash: false,
    shouldFlashWidget: false,
  }
}

/**
 * Gets dynamic thresholds for a container type from saved settings or falls back to defaults
 * @param containerType - Container type (e.g., "bd", "mbt", "hydro")
 * @param containerSettings - Array of container settings from API
 * @param defaultThresholds - Fallback default thresholds
 * @returns Thresholds to use
 */
export const getDynamicThresholds = <T extends UnknownRecord>(
  containerType: string,
  containerSettings: ContainerSetting[],
  defaultThresholds: T,
): T => {
  if (!containerType || !Array.isArray(containerSettings)) {
    return defaultThresholds
  }

  // Find container by matching the containerType to the container's threshold pattern
  const matchingContainer = containerSettings.find(({ model }) => {
    if (!model) return false

    // Use the helper function to get container type pattern
    const containerTypePattern = getContainerTypePattern(model)
    // Only return true if this container's pattern matches the requested containerType
    return containerTypePattern === containerType
  })

  if (matchingContainer?.thresholds && Object.keys(matchingContainer.thresholds).length > 0) {
    return matchingContainer.thresholds as T
  }

  return defaultThresholds
}

export const THRESHOLD_KEY_MAPPINGS: ThresholdKeyMappings = {
  // Bitdeer mappings
  bitdeer: {
    oilTemperature: {
      COLD: 'criticalLow',
      LIGHT_WARM: 'alert',
      WARM: 'normal',
      HOT: 'alarm',
      SUPERHOT: 'criticalHigh',
    },
    tankPressure: {
      CRITICAL_LOW: 'criticalLow',
      MEDIUM_LOW: 'alarmLow',
      NORMAL: 'normal',
      MEDIUM_HIGH: 'alarmHigh',
      CRITICAL_HIGH: 'criticalHigh',
    },
  },
  // MicroBT mappings
  microbt: {
    waterTemperature: {
      COLD: 'criticalLow',
      LIGHT_WARM: 'alarmLow',
      WARM: 'alarmHigh',
      HOT: 'criticalHigh',
    },
  },
  // Hydro mappings
  hydro: {
    waterTemperature: {
      COLD: 'criticalLow',
      LIGHT_WARM: 'alarmLow',
      WARM: 'normal',
      HOT: 'alarmHigh',
      SUPERHOT: 'criticalHigh',
    },
    supplyLiquidPressure: {
      LOW: 'criticalLow',
      MEDIUM_LOW: 'alarmLow',
      MEDIUM_HIGH: 'alarmHigh',
      HIGH: 'criticalHigh',
    },
  },
  // Immersion mappings
  immersion: {
    oilTemperature: {
      COLD: 'criticalLow',
      LIGHT_WARM: 'alert',
      WARM: 'normal',
      HOT: 'alarm',
      SUPERHOT: 'criticalHigh',
    },
  },
}

/**
 * Transforms API threshold format to utility function format
 * @param containerType - Container type
 * @param apiThresholds - Thresholds from API
 * @returns Transformed thresholds for utility functions
 */
export const transformThresholdsForUtility = (
  containerType: keyof ThresholdKeyMappings,
  apiThresholds: Record<string, UnknownRecord>,
): Record<string, UnknownRecord> | null => {
  if (!apiThresholds || !THRESHOLD_KEY_MAPPINGS[containerType]) {
    return null
  }

  const mappings = THRESHOLD_KEY_MAPPINGS[containerType]
  const transformed: Record<string, UnknownRecord> = {}

  Object.keys(mappings).forEach((thresholdType: string) => {
    const keyMappings = mappings[thresholdType] || {}
    if (apiThresholds[thresholdType]) {
      transformed[thresholdType] = {}
      Object.keys(keyMappings).forEach((utilityKey: string) => {
        const apiKey = keyMappings?.[utilityKey] as string
        if (
          apiThresholds?.[thresholdType]?.[apiKey] !== undefined &&
          apiThresholds?.[thresholdType]?.[apiKey] !== null
        ) {
          ;(transformed[thresholdType] ??= {})[utilityKey] = apiThresholds[thresholdType][apiKey]
        }
      })
    }
  })

  return transformed
}

/**
 * Threshold state result from evaluation
 */
export type ThresholdStateResult = {
  state: (typeof THRESHOLD_LEVEL)[keyof typeof THRESHOLD_LEVEL]
  color: string
  shouldFlash: boolean
  shouldFlashWidget: boolean
}

/**
 * Result from getColorAndTooltipFromThresholds
 */
export type ColorAndTooltipResult = {
  color: string
  tooltip: string
}

/**
 * Helper function to get color and tooltip based on thresholds and container status
 * Handles disabled/offline containers by returning white color with explanation tooltip
 */
export const getColorAndTooltipFromThresholds = (
  currentValue: number | undefined | null,
  thresholds: {
    criticalLow?: number
    alert?: number
    normal?: number
    alarm?: number
    criticalHigh?: number
    alarmLow?: number
    alarmHigh?: number
  },
  isDisabled: boolean = false,
  containerStatus?: string,
): ColorAndTooltipResult => {
  // Handle undefined/null values
  if (currentValue === undefined || currentValue === null) {
    return { color: '', tooltip: '' }
  }

  // If disabled, show white/default color with tooltip
  if (isDisabled) {
    return {
      color: COLOR.WHITE,
      tooltip: 'Value shown in white because the component is disabled',
    }
  }

  // If stopped/offline, show white/default color with tooltip
  if (containerStatus === CONTAINER_STATUS.STOPPED) {
    return {
      color: COLOR.WHITE,
      tooltip: 'Value shown in white because the container is stopped',
    }
  }

  if (containerStatus === CONTAINER_STATUS.OFFLINE) {
    return {
      color: COLOR.WHITE,
      tooltip: 'Value shown in white because the container is offline',
    }
  }

  // Use the evaluator to get the color
  const result = evaluateThresholdState(currentValue, thresholds, false, false)
  return { color: result.color, tooltip: '' }
}

/**
 * Helper function to get color based on thresholds and container status
 * Handles disabled/offline containers by returning white color
 */
export const getColorFromThresholds = (
  currentValue: number | undefined | null,
  thresholds: {
    criticalLow?: number
    alert?: number
    normal?: number
    alarm?: number
    criticalHigh?: number
    alarmLow?: number
    alarmHigh?: number
  },
  isDisabled: boolean = false,
  containerStatus?: string,
): string =>
  getColorAndTooltipFromThresholds(currentValue, thresholds, isDisabled, containerStatus).color

/**
 * Helper function to determine if text should flash based on thresholds
 * Returns true for critical low, alarm, and critical high states
 */
export const getShouldFlashFromThresholds = (
  currentValue: number | undefined | null,
  thresholds: {
    criticalLow?: number
    alert?: number
    normal?: number
    alarm?: number
    criticalHigh?: number
    alarmLow?: number
    alarmHigh?: number
  },
  containerStatus?: string,
): boolean => {
  if (currentValue === undefined || currentValue === null) {
    return false
  }

  const isContainerStopped = containerStatus === CONTAINER_STATUS.STOPPED
  const isContainerOffline = containerStatus === CONTAINER_STATUS.OFFLINE

  const result = evaluateThresholdState(
    currentValue,
    thresholds,
    isContainerStopped,
    isContainerOffline,
  )

  return result.shouldFlash
}

/**
 * Helper function to determine if widget should flash based on thresholds
 * Returns true only for critical low and critical high states
 */
export const getShouldFlashWidgetFromThresholds = (
  currentValue: number | undefined | null,
  thresholds: {
    criticalLow?: number
    alert?: number
    normal?: number
    alarm?: number
    criticalHigh?: number
    alarmLow?: number
    alarmHigh?: number
  },
  containerStatus?: string,
): boolean => {
  if (currentValue === undefined || currentValue === null) {
    return false
  }

  const isContainerStopped = containerStatus === CONTAINER_STATUS.STOPPED
  const isContainerOffline = containerStatus === CONTAINER_STATUS.OFFLINE

  const result = evaluateThresholdState(
    currentValue,
    thresholds,
    isContainerStopped,
    isContainerOffline,
  )

  return result.shouldFlashWidget
}

/**
 * Finds the matching container settings from an array of container settings
 * Tries to match by containerType first, then falls back to the settings model
 * @param containerSettings - Array of container settings from API
 * @param containerType - Container type to match (e.g., "container-bd-d40-m30", "bitdeer", "bd")
 * @returns Matching container settings or null
 */
export const findMatchingContainer = (
  containerSettings: ContainerSetting[],
  containerType: string,
): ContainerSetting | null => {
  if (!containerSettings || !Array.isArray(containerSettings) || !containerType) {
    return null
  }

  // Try exact match first
  const exactMatch = containerSettings.find(({ model }) => model === containerType)
  if (exactMatch) {
    return exactMatch
  }

  // Fall back to settings model match (e.g., "bd", "mbt", "hydro", "immersion")
  const settingsModel = getContainerSettingsModel(containerType)
  if (settingsModel) {
    return containerSettings.find(({ model }) => model === settingsModel) ?? null
  }

  return null
}

export type DetermineThresholdsOptions<T> = {
  matchingContainer: ContainerSetting | null
  parentThresholds?: UnknownRecord | null
  containerType: string
  defaultThresholds?: T | null
}

/**
 * Determines which thresholds to use based on priority:
 * 1. Fetched saved thresholds from BE
 * 2. Parent data thresholds
 * 3. Hardcoded defaults
 * @param options - Configuration options
 * @param options.matchingContainer - Matching container settings or null
 * @param options.parentThresholds - Parent data thresholds or null
 * @param options.containerType - Container type string
 * @param options.defaultThresholds - Hardcoded default thresholds or null
 * @returns Thresholds to use
 */
export const determineThresholdsToUse = <T extends UnknownRecord>({
  matchingContainer,
  parentThresholds,
  containerType,
  defaultThresholds = null,
}: DetermineThresholdsOptions<T>): T | UnknownRecord => {
  // Priority 1: Fetched saved thresholds from BE
  if (matchingContainer?.thresholds && Object.keys(matchingContainer.thresholds).length > 0) {
    return matchingContainer.thresholds as T
  }

  // Priority 2: Parent data thresholds
  if (parentThresholds && Object.keys(parentThresholds).length > 0) {
    return parentThresholds as T
  }

  // Priority 3: Hardcoded defaults
  if (defaultThresholds) {
    return defaultThresholds
  }

  return (getDefaultThresholdStructure(containerType) || {}) as T
}

export type ShouldAutoSaveDefaultsOptions = {
  isSiteLoading: boolean
  isSettingsLoading: boolean
  siteData?: { site?: unknown } | null
  matchingContainer: ContainerSetting | null
  parentThresholds?: UnknownRecord | null
  hasAutoSavedDefaults: boolean
}

/**
 * Checks if auto-save defaults should be triggered
 * @param options - Configuration options
 * @param options.isSiteLoading - Whether the site is loading
 * @param options.isSettingsLoading - Whether the settings are loading
 * @param options.siteData - Site data object
 * @param options.matchingContainer - Matching container settings or null
 * @param options.parentThresholds - Parent data thresholds or null
 * @param options.hasAutoSavedDefaults - Whether auto-saved defaults exist
 * @returns Whether to auto-save defaults
 */
export const shouldAutoSaveDefaults = ({
  isSiteLoading,
  isSettingsLoading,
  siteData,
  matchingContainer,
  parentThresholds,
  hasAutoSavedDefaults,
}: ShouldAutoSaveDefaultsOptions): boolean =>
  !isSiteLoading &&
  !isSettingsLoading &&
  !!siteData?.site &&
  !matchingContainer?.thresholds &&
  !parentThresholds &&
  !hasAutoSavedDefaults

export type ContainerData = {
  type?: string
}

export type SavePayload = {
  data: {
    model?: string
    parameters: UnknownRecord
    thresholds: UnknownRecord
    site: string
  }
}

/**
 * Prepares the payload for saving container settings
 * @param data - Container data
 * @param parameters - Container parameters
 * @param thresholds - Container thresholds
 * @param site - Site identifier
 * @returns Prepared payload
 */
export const prepareSavePayload = (
  data: ContainerData,
  parameters: UnknownRecord | null,
  thresholds: UnknownRecord | null,
  site: string,
): SavePayload => ({
  data: {
    model: data?.type,
    parameters: parameters || {},
    thresholds: thresholds || {},
    site,
  },
})
