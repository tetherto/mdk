'use strict'

const VALID_ENABLE_VALUES = ['0', '1']
const ALARM_STATE_ON = '1'

const isValidTemperature = (temp) => {
  return temp !== null && temp !== undefined && parseFloat(temp) >= 0
}

const isValidEnableValue = (value) => {
  return value !== null && value !== undefined && VALID_ENABLE_VALUES.includes(value)
}

const checkTemperatureAlarm = (state, threshold, tank1Temp, tank2Temp) => {
  const thresholdValue = parseFloat(threshold)
  if (parseFloat(tank1Temp) >= thresholdValue || parseFloat(tank2Temp) >= thresholdValue) {
    state.AlarmState = ALARM_STATE_ON
  }
}

const setTemperatureParameter = (state, runningParams, paramName, value, checkAlarm, tank1Field, tank2Field) => {
  if (!isValidTemperature(value)) {
    return
  }

  runningParams[paramName] = value

  if (checkAlarm && tank1Field && tank2Field) {
    const tempData = state.TemperatureData
    checkTemperatureAlarm(state, value, tempData[tank1Field], tempData[tank2Field])
  }
}

const setEnableParameter = (runningParams, paramName, value) => {
  if (isValidEnableValue(value)) {
    runningParams[paramName] = value
  }
}

module.exports = function (state, packet, cb) {
  try {
    const cmd = JSON.parse(packet.payload.toString())
    const runningParams = state.Tactics.RunningParameter
    const params = cmd.RunningParameter

    // Temperature parameters with alarm checking
    setTemperatureParameter(state, runningParams, 'CoolOilAlarmTemp', params.CoolOilAlarmTemp, true, 'Tank1OilL', 'Tank2OilL')
    setTemperatureParameter(state, runningParams, 'HotOilAlarmTemp', params.HotOilAlarmTemp, true, 'Tank1OilH', 'Tank2OilH')
    setTemperatureParameter(state, runningParams, 'CoolWaterAlarmTemp', params.CoolWaterAlarmTemp, true, 'Tank1WaterL', 'Tank2WaterL')
    setTemperatureParameter(state, runningParams, 'HotWaterAlarmTemp', params.HotWaterAlarmTemp, true, 'Tank1WaterH', 'Tank2WaterH')
    setTemperatureParameter(state, runningParams, 'CoolOilSettingTemp', params.CoolOilSettingTemp, true, 'Tank1OilL', 'Tank2OilL')

    // Temperature parameters without alarm checking
    setTemperatureParameter(state, runningParams, 'ExhausFansRunTemp', params.ExhausFansRunTemp, false)

    // Pressure parameter (conditional on _pressureEnabled)
    if (state._pressureEnabled && isValidTemperature(params.PressureAlarmValue)) {
      runningParams.PressureAlarmValue = params.PressureAlarmValue
    }

    // Enable parameters
    setEnableParameter(runningParams, 'Tank1Enable', params.Tank1Enable)
    setEnableParameter(runningParams, 'Tank2Enable', params.Tank2Enable)
    setEnableParameter(runningParams, 'AirExhaustEnable', params.AirExhaustEnable)
  } catch (e) {
    // Error handling: silently continue to maintain existing behavior
  }
  cb()
}
