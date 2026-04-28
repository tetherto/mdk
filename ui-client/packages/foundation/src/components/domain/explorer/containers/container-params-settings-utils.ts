import { UNITS } from '@tetherto/core'
import type { Device } from '../../../../types'
import { isBitdeer, isMicroBT } from '../../../../utils/container-utils'
import { getBitdeerParameterSettingsData } from './bitdeer'
import { getMicroBTThresholdSettingsData } from './micro-bt/settings/micro-bt-utils'

export type ParameterSetting = {
  name: string
  value?: number | string
  suffix?: string
  type?: 'number' | 'string'
}

export type ParameterSettings = Record<string, ParameterSetting>

type AlarmsData = {
  oil_temp?: { low_c?: number; high_c?: number }
  water_temp?: { low_c?: number; high_c?: number }
  pressure_bar?: number
}

type SetTempsData = {
  cold_oil_temp_c?: number
  exhaust_fan_temp_c?: number
}

/**
 * Get Bitdeer container parameter settings
 */
export const getBitdeerParametersSettings = (data: Device): ParameterSettings => {
  const { alarms, set_temps } = getBitdeerParameterSettingsData(data)
  const alarmsTyped = alarms as AlarmsData
  const setTempsTyped = set_temps as SetTempsData

  return {
    coolOilAlarmTemp: {
      name: 'Cool Oil Alarm Temp',
      value: alarmsTyped?.oil_temp?.low_c,
      suffix: UNITS.TEMPERATURE_C,
      type: 'number',
    },
    coolWaterAlarmTemp: {
      name: 'Cool Water Alarm Temp',
      value: alarmsTyped?.water_temp?.low_c,
      suffix: UNITS.TEMPERATURE_C,
      type: 'number',
    },
    coolOilSetTemp: {
      name: 'Cool Oil Setting Temp',
      value: setTempsTyped?.cold_oil_temp_c,
      suffix: UNITS.TEMPERATURE_C,
      type: 'number',
    },
    hotOilAlarmTemp: {
      name: 'Hot Oil Alarm Temp',
      value: alarmsTyped?.oil_temp?.high_c,
      suffix: UNITS.TEMPERATURE_C,
      type: 'number',
    },
    hotWaterAlarmTemp: {
      name: 'Hot Water Alarm Temp',
      value: alarmsTyped?.water_temp?.high_c,
      suffix: UNITS.TEMPERATURE_C,
      type: 'number',
    },
    exhaustFansRunTemp: {
      name: 'Exhaust Fans Run Temp',
      value: setTempsTyped?.exhaust_fan_temp_c,
      suffix: UNITS.TEMPERATURE_C,
      type: 'number',
    },
    alarmPressure: {
      name: 'Alarm Pressure',
      value: alarmsTyped?.pressure_bar,
      suffix: UNITS.PRESSURE_BAR,
      type: 'number',
    },
  }
}

/**
 * Get MicroBT container parameter settings
 */
export const getMicroBTParametersSettings = (data: Device): ParameterSettings => {
  const thresholdsData = getMicroBTThresholdSettingsData(data)

  return {
    runningSpeed: {
      name: 'Running Speed',
      value: thresholdsData?.coolingFanRunningSpeedThreshold,
      suffix: 'RPM',
      type: 'number',
    },
    startTemp: {
      name: 'Start Temp',
      value: thresholdsData?.coolingFanStartTemperatureThreshold,
      suffix: UNITS.TEMPERATURE_C,
      type: 'number',
    },
    stopTemp: {
      name: 'Stop Temp',
      value: thresholdsData?.coolingFanStopTemperatureThreshold,
      suffix: UNITS.TEMPERATURE_C,
      type: 'number',
    },
  }
}

type ContainerParamsGetter = {
  isType: (type: string) => boolean
  getParams: (data: Device) => ParameterSettings
}

/**
 * Container parameter getters registry
 */
const CONTAINER_PARAMS_GETTERS: readonly ContainerParamsGetter[] = [
  {
    isType: isBitdeer,
    getParams: getBitdeerParametersSettings,
  },
  {
    isType: isMicroBT,
    getParams: getMicroBTParametersSettings,
  },
] as const

/**
 * Get container parameter settings based on container type
 *
 * @param data - Device data
 * @returns Parameter settings object or undefined if container type not supported
 *
 * @example
 * ```tsx
 * const settings = getContainerParametersSettings(deviceData)
 * if (settings) {
 *   console.log(settings.coolOilAlarmTemp.value)
 * }
 * ```
 */
export const getContainerParametersSettings = (data?: Device): ParameterSettings | undefined => {
  if (!data?.type) {
    return
  }

  const matched = CONTAINER_PARAMS_GETTERS.find((getter) => getter.isType(data.type))

  return matched?.getParams(data)
}
