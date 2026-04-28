import type { UnknownRecord } from '@tetherto/mdk-core-ui'
import { getBitdeerParameterSettingsData } from '../components/domain'
import { isAntspaceHydro, isAntspaceImmersion, isBitdeer, isMicroBT } from './container-utils'

export type ParameterValue = {
  value?: number
}

export type Parameters = {
  coolOilAlarmTemp?: ParameterValue
  coolWaterAlarmTemp?: ParameterValue
  coolOilSetTemp?: ParameterValue
  hotOilAlarmTemp?: ParameterValue
  hotWaterAlarmTemp?: ParameterValue
  exhaustFansRunTemp?: ParameterValue
  alarmPressure?: ParameterValue
  runningSpeed?: ParameterValue
  startTemp?: ParameterValue
  stopTemp?: ParameterValue
  miner1CoolingConsumptionW?: ParameterValue
  miner1MinPowerW?: ParameterValue
  miner2CoolingConsumptionW?: ParameterValue
  miner2MinPowerW?: ParameterValue
}

export type ThresholdRange = {
  criticalLow?: number
  alarmLow?: number
  alert?: number
  normal?: number
  alarm?: number
  alarmHigh?: number
  criticalHigh?: number
}

export type Thresholds = {
  oilTemperature?: ThresholdRange
  tankPressure?: ThresholdRange
  waterTemperature?: ThresholdRange
  supplyLiquidPressure?: ThresholdRange
}

export type ContainerData = {
  type?: string
}

/**
 * Transforms container parameters data for the setContainerSettings API
 *
 * @param data - Container data with type
 * @param parameters - Raw parameters with nested value objects
 * @returns Flattened parameters object
 *
 * @example
 * ```ts
 * const params = transformContainerParameters(
 *   { type: 'container-bd-d40' },
 *   { coolOilAlarmTemp: { value: 45 } }
 * )
 * // Returns: { coolOilAlarmTemp: 45 }
 * ```
 */
export const transformContainerParameters = (
  data: ContainerData,
  parameters: Parameters,
): Record<string, number | undefined> => {
  const containerType = data?.type

  if (!containerType || !parameters) {
    return {}
  }

  // Transform based on container type
  if (isBitdeer(containerType)) {
    return {
      coolOilAlarmTemp: parameters.coolOilAlarmTemp?.value,
      coolWaterAlarmTemp: parameters.coolWaterAlarmTemp?.value,
      coolOilSetTemp: parameters.coolOilSetTemp?.value,
      hotOilAlarmTemp: parameters.hotOilAlarmTemp?.value,
      hotWaterAlarmTemp: parameters.hotWaterAlarmTemp?.value,
      exhaustFansRunTemp: parameters.exhaustFansRunTemp?.value,
      alarmPressure: parameters.alarmPressure?.value,
    }
  }

  if (isMicroBT(containerType)) {
    return {
      runningSpeed: parameters.runningSpeed?.value,
      startTemp: parameters.startTemp?.value,
      stopTemp: parameters.stopTemp?.value,
    }
  }

  return {}
}

/**
 * Transforms container thresholds data for the setContainerSettings API
 * These are editable threshold values that define the boundaries for different states
 *
 * @param data - Container data with type
 * @param thresholds - Threshold ranges by type
 * @returns Transformed thresholds specific to container type
 *
 * @example
 * ```ts
 * const thresholds = transformContainerThresholds(
 *   { type: 'container-bd-d40' },
 *   { oilTemperature: { criticalLow: 33, normal: 42 } }
 * )
 * ```
 */
export const transformContainerThresholds = (
  data: ContainerData,
  thresholds: Thresholds,
): Thresholds => {
  const containerType = data?.type

  if (!containerType || !thresholds) {
    return {}
  }

  // Transform based on container type
  if (isBitdeer(containerType)) {
    return {
      oilTemperature: {
        criticalLow: thresholds.oilTemperature?.criticalLow,
        alert: thresholds.oilTemperature?.alert,
        normal: thresholds.oilTemperature?.normal,
        alarm: thresholds.oilTemperature?.alarm,
        criticalHigh: thresholds.oilTemperature?.criticalHigh,
      },
      tankPressure: {
        criticalLow: thresholds.tankPressure?.criticalLow,
        alarmLow: thresholds.tankPressure?.alarmLow,
        normal: thresholds.tankPressure?.normal,
        alarmHigh: thresholds.tankPressure?.alarmHigh,
        criticalHigh: thresholds.tankPressure?.criticalHigh,
      },
    }
  }

  if (isMicroBT(containerType)) {
    return {
      waterTemperature: {
        criticalLow: thresholds.waterTemperature?.criticalLow,
        alarmLow: thresholds.waterTemperature?.alarmLow,
        normal: thresholds.waterTemperature?.normal,
        alarmHigh: thresholds.waterTemperature?.alarmHigh,
        criticalHigh: thresholds.waterTemperature?.criticalHigh,
      },
    }
  }

  if (isAntspaceHydro(containerType)) {
    return {
      waterTemperature: {
        criticalLow: thresholds.waterTemperature?.criticalLow,
        alarmLow: thresholds.waterTemperature?.alarmLow,
        alert: thresholds.waterTemperature?.alert,
        normal: thresholds.waterTemperature?.normal,
        alarmHigh: thresholds.waterTemperature?.alarmHigh,
        criticalHigh: thresholds.waterTemperature?.criticalHigh,
      },
      supplyLiquidPressure: {
        criticalLow: thresholds.supplyLiquidPressure?.criticalLow,
        alarmLow: thresholds.supplyLiquidPressure?.alarmLow,
        normal: thresholds.supplyLiquidPressure?.normal,
        alarmHigh: thresholds.supplyLiquidPressure?.alarmHigh,
        criticalHigh: thresholds.supplyLiquidPressure?.criticalHigh,
      },
    }
  }

  if (isAntspaceImmersion(containerType)) {
    return {
      oilTemperature: {
        criticalLow: thresholds.oilTemperature?.criticalLow,
        alert: thresholds.oilTemperature?.alert,
        normal: thresholds.oilTemperature?.normal,
        alarm: thresholds.oilTemperature?.alarm,
        criticalHigh: thresholds.oilTemperature?.criticalHigh,
      },
    }
  }

  return {}
}

export type ContainerSettingsPayload = {
  data: {
    model?: string
    parameters: Record<string, number | undefined>
    thresholds: Thresholds
  }
}

/**
 * Prepares the complete payload for setContainerSettings API
 *
 * @param data - Container data with type
 * @param parameters - Container parameters
 * @param thresholds - Container thresholds
 * @returns Complete API payload
 *
 * @example
 * ```ts
 * const payload = prepareContainerSettingsPayload(
 *   { type: 'container-bd-d40' },
 *   { coolOilSetTemp: { value: 40 } },
 *   { oilTemperature: { normal: 42 } }
 * )
 * ```
 */
export const prepareContainerSettingsPayload = (
  data: ContainerData,
  parameters: Parameters,
  thresholds: Thresholds,
): ContainerSettingsPayload => ({
  data: {
    model: data?.type,
    parameters: transformContainerParameters(data, parameters),
    thresholds: transformContainerThresholds(data, thresholds),
  },
})

/**
 * Gets the default threshold structure for a container type
 * This helps initialize empty threshold forms
 *
 * @param containerType - Container type identifier
 * @returns Default threshold values for the container type
 *
 * @example
 * ```ts
 * const defaults = getDefaultThresholdStructure('container-bd-d40')
 * // Returns bitdeer oil temp and tank pressure defaults
 * ```
 */
export const getDefaultThresholdStructure = (containerType: string): Thresholds => {
  if (isBitdeer(containerType)) {
    return {
      oilTemperature: {
        criticalLow: 33,
        alert: 39,
        normal: 42,
        alarm: 46,
        criticalHigh: 48,
      },
      tankPressure: {
        criticalLow: 2,
        alarmLow: 2.3,
        normal: 2.3,
        alarmHigh: 3.5,
        criticalHigh: 4,
      },
    }
  }

  if (isMicroBT(containerType)) {
    return {
      waterTemperature: {
        criticalLow: 25,
        alarmLow: 33,
        normal: 33,
        alarmHigh: 37,
        criticalHigh: 39,
      },
    }
  }

  if (isAntspaceHydro(containerType)) {
    return {
      waterTemperature: {
        criticalLow: 21,
        alarmLow: 25,
        alert: 25,
        normal: 30,
        alarmHigh: 37,
        criticalHigh: 40,
      },
      supplyLiquidPressure: {
        criticalLow: 2,
        alarmLow: 2.3,
        normal: 2.3,
        alarmHigh: 3.5,
        criticalHigh: 4,
      },
    }
  }

  if (isAntspaceImmersion(containerType)) {
    return {
      oilTemperature: {
        criticalLow: 33,
        alert: 42,
        normal: 42,
        alarm: 46,
        criticalHigh: 48,
      },
    }
  }

  return {}
}

export type ParameterSetting = {
  name: string
  value?: number | string
  suffix?: string
  type?: string
}

type AlarmsData = {
  oil_temp?: { low_c?: number; high_c?: number }
  water_temp?: { low_c?: number; high_c?: number }
  pressure_bar?: number
}

type SetTempsData = {
  cold_oil_temp_c?: number
  exhaust_fan_temp_c?: number
}

type ParamsGetter = {
  isType: (type: string) => boolean
  getParams: (data: UnknownRecord) => Record<string, ParameterSetting>
}

/**
 * Gets Bitdeer container parameter settings
 *
 * Extracts and formats parameter settings for Bitdeer containers including
 * temperature alarms, pressure alarms, and fan control settings.
 *
 * @param data - Container data object
 * @returns Formatted parameter settings
 */
export const getBitdeerParametersSettings = (
  data: UnknownRecord,
): Record<string, ParameterSetting> => {
  const { alarms, set_temps } = getBitdeerParameterSettingsData(data)
  const alarmsTyped = alarms as AlarmsData
  const setTempsTyped = set_temps as SetTempsData

  return {
    coolOilAlarmTemp: {
      name: 'Cool Oil Alarm Temp',
      value: alarmsTyped?.oil_temp?.low_c,
      suffix: '°C',
      type: 'number',
    },
    coolWaterAlarmTemp: {
      name: 'Cool Water Alarm Temp',
      value: alarmsTyped?.water_temp?.low_c,
      suffix: '°C',
      type: 'number',
    },
    coolOilSetTemp: {
      name: 'Cool Oil Setting Temp',
      value: setTempsTyped?.cold_oil_temp_c,
      suffix: '°C',
      type: 'number',
    },
    hotOilAlarmTemp: {
      name: 'Hot Oil Alarm Temp',
      value: alarmsTyped?.oil_temp?.high_c,
      suffix: '°C',
      type: 'number',
    },
    hotWaterAlarmTemp: {
      name: 'Hot Water Alarm Temp',
      value: alarmsTyped?.water_temp?.high_c,
      suffix: '°C',
      type: 'number',
    },
    exhaustFansRunTemp: {
      name: 'Exhaust Fans Run Temp',
      value: setTempsTyped?.exhaust_fan_temp_c,
      suffix: '°C',
      type: 'number',
    },
    alarmPressure: {
      name: 'Alarm Pressure',
      value: alarmsTyped?.pressure_bar,
      suffix: 'bar',
      type: 'number',
    },
  }
}

/**
 * Registry of container parameter getters
 */
const CONTAINER_PARAMS_GETTERS: ParamsGetter[] = [
  {
    isType: isBitdeer,
    getParams: getBitdeerParametersSettings,
  },
]

/**
 * Gets container-specific parameter settings based on container type
 *
 * Looks up the appropriate parameter getter for the container type
 * and returns the formatted parameter settings.
 *
 * @param data - Container data object containing type and parameter values
 * @returns Parameter settings object or undefined if type not found
 *
 * @example
 * ```ts
 * const params = getContainerParametersSettings({
 *   type: 'container-bd-d40',
 *   alarms: { oil_temp: { low_c: 33, high_c: 48 } }
 * })
 * ```
 */
export const getContainerParametersSettings = (
  data: UnknownRecord,
): Record<string, ParameterSetting> | undefined => {
  const containerType = data?.type as string | undefined

  if (!containerType) {
    return undefined
  }

  // Find the first matching params getter using native Array.find
  const matched = CONTAINER_PARAMS_GETTERS.find((getter) => getter.isType(containerType))

  if (!matched) {
    return undefined
  }

  return matched.getParams(data)
}
