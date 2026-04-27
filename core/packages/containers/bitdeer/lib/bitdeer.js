'use strict'

const Container = require('../../../tpls/tpl-lib-container/lib/container')
const { getPDUValues, unMapPDU, unMapSocket, MAPPINGS } = require('./utils/pduOps')
const { TaskQueue } = require('@bitfinex/lib-js-util-task-queue')
const { optimizeSocketCalls } = require('./utils/optimize')
const { promiseSleep } = require('@bitfinex/lib-js-util-promise')
const { ERROR_MAP } = require('./utils/constants')

class Bitdeer extends Container {
  constructor ({ server, ...opts }) {
    super(opts)
    this.server = server
    this.lastMessageCache = {}
    this._queue = new TaskQueue(1)

    this._subscribe()
  }

  _subscribe () {
    for (const topic of Object.keys(_TopicMapping)) {
      this.server.subscribe(`${this.opts.containerId}${topic}`, this._handleMessage.bind(this))
    }
  }

  _handleMessage (packet, cb) {
    const { topic, payload } = packet
    const _topic = topic.replace(this.opts.containerId, '')
    const _mappedFunction = _TopicMapping[_topic]
    if (_mappedFunction === undefined) return
    this.updateLastSeen()
    const _message = JSON.parse(payload.toString())
    const _mappedValue = _mappedFunction(_message)
    for (const bucket in _mappedValue) {
      this.lastMessageCache[bucket] = _mappedValue[bucket]
    }
    cb()
  }

  async _sendOperationMessage (topic, operation) {
    return this._queue.pushTask(async () => {
      this.server.publish({
        topic: `${this.opts.containerId}${topic}`,
        payload: JSON.stringify(operation)
      })
      await promiseSleep(this.conf.delay)
    })
  }

  async getDeviceInformation () {
    return this.lastMessageCache.deviceInformation
  }

  async getPDUSocketInformation () {
    return this.lastMessageCache.PDUSocketInformation
  }

  async getContainerPowerInformation () {
    return this.lastMessageCache.containerPowerInformation
  }

  async getTemperatureInformation () {
    return this.lastMessageCache.temperatureInformation
  }

  async getUPSInformation () {
    return this.lastMessageCache.UPSInformation
  }

  async getTactics () {
    return this.lastMessageCache.tactics
  }

  async getAlarmTemperatures () {
    return this.lastMessageCache.alarmTemperatures
  }

  async getSetTemperatures () {
    return this.lastMessageCache.setTemperatures
  }

  async getTankStatus () {
    return this.lastMessageCache.tankStatus
  }

  async getExhaustFanStatus () {
    return this.lastMessageCache.exhaustFanStatus
  }

  async setPumpState (pumpType, index, status) {
    await this._sendOperationMessage('PumpOperate', {
      Type: pumpType,
      Index: index.toString(),
      Operate: status ? '1' : '0'
    })
    return {
      success: true
    }
  }

  async switchSocket (args) {
    const optimizedOps = optimizeSocketCalls(args, this.lastMessageCache.PDUSocketInformation, this.opts.type)
    for (const operation of optimizedOps) {
      const [PDUIndex, socketIndex, enabled] = operation
      const [pdu, socket] = getPDUValues(this.opts.type, PDUIndex, socketIndex)
      if (typeof pdu !== 'number' || typeof socket !== 'number') continue
      await this._sendOperationMessage('PDUOperate', {
        PDUIndex: pdu,
        SocketIndex: socket,
        Operate: enabled ? '1' : '0'
      })
    }
    return {
      success: true
    }
  }

  async setDryCoolerState (dryCoolerIndex, fanIndex, status) {
    await this._sendOperationMessage('CoolerOperate', {
      // 'TimeStamp': "2023/06/16 19:33:00",
      CoolerIndex: dryCoolerIndex.toString(),
      FansIndex: fanIndex.toString(),
      Operate: status ? '1' : '0'
    })
    return {
      success: true
    }
  }

  async setTactics (tactics) {
    await this._sendOperationMessage('TacticsSet', {
      Tactics: {
        RunTactics: {
          ...this.lastMessageCache._tacticsBase.RunTactics,
          TacticsType: _getKeyByValue(_TacticsType, tactics.start.tacticType),
          [_TacticsKey[tactics.start.tacticType]]: {
            RunPrice: tactics.start.startPrice.toString(),
            CurrentPrice: tactics.start.currentPrice.toString()
          }
        },
        StopTactics: {
          ...this.lastMessageCache._tacticsBase.StopTactics,
          TacticsType: _getKeyByValue(_TacticsType, tactics.stop.tacticType),
          [_TacticsKey[tactics.stop.tacticType]]: {
            StopPrice: tactics.stop.stopPrice.toString(),
            CurrentPrice: tactics.stop.currentPrice.toString()
          }
        }
      }
    })
    return {
      success: true
    }
  }

  async _getRunningParameterTemplate () {
    const alarmTempData = this.lastMessageCache.alarmTemperatures
    const setTemp = this.lastMessageCache.setTemperatures
    const tankStatus = this.lastMessageCache.tankStatus
    const exhaustFanStatus = this.lastMessageCache.exhaustFanStatus
    return {
      TimeStamp: 'yyyy-MM-dd HH:mm:ss',
      RunningParameter: {
        CoolOilAlarmTemp: alarmTempData.coldOil.toString(),
        HotOilAlarmTemp: alarmTempData.hotOil.toString(),
        CoolWaterAlarmTemp: alarmTempData.coldWater.toString(),
        HotWaterAlarmTemp: alarmTempData.hotWater.toString(),
        CoolOilSettingTemp: setTemp.coldOil.toString(),
        ExhausFansRunTemp: setTemp.exhaustFan.toString(),
        PressureAlarmValue: alarmTempData.pressure?.toString(),
        Tank1Enable: tankStatus.tank1Enabled ? '1' : '0',
        Tank2Enable: tankStatus.tank2Enabled ? '1' : '0',
        AirExhaustEnable: exhaustFanStatus.airExhaustEnabled ? '1' : '0'
      }
    }
  }

  async setTemperatureSettings (settings) {
    const data = await this._getRunningParameterTemplate()
    if (settings.coldOil) data.RunningParameter.CoolOilAlarmTemp = settings.coldOil.toString()
    if (settings.hotOil) data.RunningParameter.HotOilAlarmTemp = settings.hotOil.toString()
    if (settings.coldWater) data.RunningParameter.CoolWaterAlarmTemp = settings.coldWater.toString()
    if (settings.hotWater) data.RunningParameter.HotWaterAlarmTemp = settings.hotWater.toString()
    if (settings.coldOilSet) data.RunningParameter.CoolOilSettingTemp = settings.coldOilSet.toString()
    if (settings.exhaustFan) data.RunningParameter.ExhausFansRunTemp = settings.exhaustFan.toString()
    if (settings.pressureAlarm) data.RunningParameter.PressureAlarmValue = settings.pressureAlarm.toString()
    await this._sendOperationMessage('ParameterSet', data)
    return {
      success: true
    }
  }

  async setTankEnabled (tankIndex, status) {
    const data = await this._getRunningParameterTemplate()
    data.RunningParameter[`Tank${tankIndex}Enable`] = status ? '1' : '0'
    await this._sendOperationMessage('ParameterSet', data)
    return {
      success: true
    }
  }

  async setAirExhaustEnabled (status) {
    const data = await this._getRunningParameterTemplate()
    data.RunningParameter.AirExhaustEnable = status ? '1' : '0'
    await this._sendOperationMessage('ParameterSet', data)
    return {
      success: true
    }
  }

  async switchCoolingSystem (enabled) {
    await this.setDryCoolerState(0, -1, enabled)
    await this.setDryCoolerState(1, -1, enabled)
    await this.setTankEnabled(1, enabled)
    await this.setTankEnabled(2, enabled)
    return {
      success: true
    }
  }

  async resetAlarm () {
    await this._sendOperationMessage('RunningOperate', {
      TimeStamp: 'yyyy-MM-dd HH:mm:ss',
      Operate: 'AlarmReset'
    })
    return {
      success: true
    }
  }

  async switchContainer (enabled) {
    await this._sendOperationMessage('RunningOperate', {
      TimeStamp: 'yyyy-MM-dd HH:mm:ss',
      Operate: enabled ? 'AutoRun' : 'AutoStop'
    })
    return {
      success: true
    }
  }

  _prepErrors () {
    const errors = this.lastMessageCache.alarmInfo
      ? this.lastMessageCache.alarmInfo?.map(err => ERROR_MAP[err] || { name: 'unknown', message: err })
      : []

    this._handleErrorUpdates(errors)

    return {
      isErrored: this._errorLog.length > 0,
      errors: this._errorLog
    }
  }

  _getStatus (isErrored) {
    if (isErrored) return 'error'
    if (this.lastMessageCache.runningState) return 'running'
    return 'stopped'
  }

  _prepSnap () {
    const { isErrored, errors } = this._prepErrors()

    if (!this.isThingOnline()) throw new Error('ERR_OFFLINE')

    return {
      stats: {
        status: this._getStatus(isErrored),
        errors: isErrored ? errors : undefined,
        power_w: this.lastMessageCache.containerPowerInformation.totalPower * 1000, // in w
        alarm_status: this.lastMessageCache.alarmState,
        ambient_temp_c: this.lastMessageCache.temperatureInformation.containerTemperature, // in celsius
        humidity_percent: this.lastMessageCache.temperatureInformation.containerHumidity, // in %
        container_specific: {
          alarms: this.lastMessageCache.alarmInfo,
          phase_data: {
            a: {
              voltage_v: this.lastMessageCache.containerPowerInformation.APhaseVoltage, // in volts
              current_a: this.lastMessageCache.containerPowerInformation.APhaseCurrent, // in amps
              power_w: this.lastMessageCache.containerPowerInformation.APhasePower * 1000 // in kwh
            },
            b: {
              voltage_v: this.lastMessageCache.containerPowerInformation.BPhaseVoltage, // in volts
              current_a: this.lastMessageCache.containerPowerInformation.BPhaseCurrent, // in amps
              power_w: this.lastMessageCache.containerPowerInformation.BPhasePower * 1000 // in kwh
            },
            c: {
              voltage_v: this.lastMessageCache.containerPowerInformation.CPhaseVoltage, // in volts
              current_a: this.lastMessageCache.containerPowerInformation.CPhaseCurrent, // in amps
              power_w: this.lastMessageCache.containerPowerInformation.CPhasePower * 1000 // in kwh
            }
          },
          pdu_data: Object.keys(MAPPINGS[this.opts.type])?.map((name, index) => {
            const pdu = this.lastMessageCache?.PDUSocketInformation?.find(p => p.index === index)
            if (pdu === undefined) {
              return {
                pdu: unMapPDU(this.opts.type, index),
                power_w: 0.0, // in kwh
                voltage_v: undefined,
                current_a: 0.0, // in amps
                sockets: [],
                offline: true
              }
            } else {
              return {
                pdu: unMapPDU(this.opts.type, pdu.index),
                power_w: pdu.powerValues.reduce((a, b) => a + b, 0.0) * 1000, // in kwh
                voltage_v: undefined,
                current_a: pdu.currentValues.reduce((a, b) => a + b, 0.0), // in amps
                sockets: pdu.socketStatus.reduce((acc, socket, index) => {
                  const socketIndex = unMapSocket(this.opts.type, pdu.index, index)
                  if (!socketIndex) return acc
                  acc.push({
                    socket: socketIndex,
                    enabled: socket,
                    power_w: pdu.powerValues[index] * 1000, // in kwh
                    voltage_v: undefined,
                    current_a: pdu.currentValues[index] // in amps
                  })
                  return acc
                }, [])
              }
            }
          }),
          cooling_system: {
            tank1_bar: this.lastMessageCache.temperatureInformation.tank1Pressure,
            tank2_bar: this.lastMessageCache.temperatureInformation.tank2Pressure,
            oil_pump: [0, 1].map((index) => ({
              index,
              enabled: this.lastMessageCache.deviceInformation[`oilPump${index + 1}RunningStatus`],
              hot_temp_c: this.lastMessageCache.temperatureInformation[`oilTank${index + 1}`].hotTemperature, // in celsius
              cold_temp_c: this.lastMessageCache.temperatureInformation[`oilTank${index + 1}`].coldTemperature, // in celsius
              tank: this.lastMessageCache.tankStatus[`tank${index + 1}Enabled`]
            })),
            water_pump: [0, 1].map((index) => ({
              index,
              enabled: this.lastMessageCache.deviceInformation[`waterPump${index + 1}RunningStatus`],
              hot_temp_c: this.lastMessageCache.temperatureInformation[`waterTank${index + 1}`].hotTemperature, // in celsius
              cold_temp_c: this.lastMessageCache.temperatureInformation[`waterTank${index + 1}`].coldTemperature // in celsius
            })),
            dry_cooler: this.lastMessageCache.deviceInformation.dryCoolerStatus?.map((drycooler) => ({
              index: drycooler.index,
              enabled: drycooler.mainContactorStatus,
              fans: drycooler.fanRunningStatus?.map((fan, index) => ({
                index,
                enabled: fan
              }))
            })),
            exhaust_fan_enabled: this.lastMessageCache.exhaustFanStatus.airExhaustEnabled
          },
          ups: {
            battery_percent: this.lastMessageCache.UPSInformation.batteryLevel, // in %
            temp_c: this.lastMessageCache.UPSInformation.temperature, // in celsius
            input: {
              voltage_v: this.lastMessageCache.UPSInformation.inputVoltage, // in volts
              freq_hz: this.lastMessageCache.UPSInformation.inputFrequency // in hz
            },
            output: {
              voltage_v: this.lastMessageCache.UPSInformation.outputVoltage, // in volts
              freq_hz: this.lastMessageCache.UPSInformation.outputFrequency // in hz
            }
          }
        }
      },
      config: {
        container_specific: {
          mqtt_url: `mqtt://${this.host}:${this.port}`,
          tactics: {
            start_policy: {
              type: this.lastMessageCache.tactics.startPolicy.tactic,
              coin: {
                start_price: this.lastMessageCache.tactics.startPolicy.coinPriceParameters.runPrice, // in USD
                current_price: this.lastMessageCache.tactics.startPolicy.coinPriceParameters.currentPrice // in USD
              },
              electricity: {
                start_price: this.lastMessageCache.tactics.startPolicy.electricityParameters.runPrice, // in USD
                current_price: this.lastMessageCache.tactics.startPolicy.electricityParameters.currentPrice // in USD
              }
            },
            stop_policy: {
              type: this.lastMessageCache.tactics.stopPolicy.tactic,
              coin: {
                stop_price: this.lastMessageCache.tactics.stopPolicy.coinPriceParameters.stopPrice, // in USD
                current_price: this.lastMessageCache.tactics.stopPolicy.coinPriceParameters.currentPrice // in USD
              },
              electricity: {
                stop_price: this.lastMessageCache.tactics.stopPolicy.electricityParameters.stopPrice, // in USD
                current_price: this.lastMessageCache.tactics.stopPolicy.electricityParameters.currentPrice // in USD
              }
            }
          },
          alarms: {
            pressure_bar: this.lastMessageCache.alarmTemperatures.pressure, // in bar
            oil_temp: {
              high_c: this.lastMessageCache.alarmTemperatures.hotOil, // in celsius
              low_c: this.lastMessageCache.alarmTemperatures.coldOil // in celsius
            },
            water_temp: {
              high_c: this.lastMessageCache.alarmTemperatures.hotWater, // in celsius
              low_c: this.lastMessageCache.alarmTemperatures.coldWater // in celsius
            }
          },
          set_temps: {
            cold_oil_temp_c: this.lastMessageCache.setTemperatures.coldOil, // in celsius
            exhaust_fan_temp_c: this.lastMessageCache.setTemperatures.exhaustFan // in celsius
          }
        }
      }
    }
  }
}

const _TopicMapping = {
  RunningInfo: (message) => ({
    alarmState: message?.AlarmState === '1',
    alarmInfo: message?.AlarmInfo,
    runningState: message?.RunningState === '1',
    deviceInformation: {
      oilPump1RunningStatus: message?.DeviceInfo?.OilPump1 === '1',
      oilPump2RunningStatus: message?.DeviceInfo?.OilPump2 === '1',
      waterPump1RunningStatus: message?.DeviceInfo?.WaterPump1 === '1',
      waterPump2RunningStatus: message?.DeviceInfo?.WaterPump2 === '1',
      dryCoolerStatus: message?.DeviceInfo?.DryCooler?.map((drycooler) => ({
        index: parseInt(drycooler?.CoolerIndex),
        mainContactorStatus: drycooler?.MainContactor === '1',
        fanRunningStatus: drycooler?.FansStatus?.map((fan) => fan === '1')
      }))
    }
  }),
  PDUData: (message) => ({
    PDUSocketInformation: message?.PDUData?.map((pdu) => ({
      index: parseInt(pdu?.PDUIndex),
      socketStatus: pdu?.SocketStatus?.map((socket) => socket === '1'),
      powerValues: pdu?.PowerData?.map((socket) => parseFloat(socket)),
      currentValues: pdu?.CurrentData?.map((socket) => parseFloat(socket))
    }))
  }),
  MainData: (message) => ({
    containerPowerInformation: {
      totalPower: parseFloat(message?.PowerData?.TotalPower),
      APhasePower: parseFloat(message?.PowerData?.PowerA),
      BPhasePower: parseFloat(message?.PowerData?.PowerB),
      CPhasePower: parseFloat(message?.PowerData?.PowerC),
      APhaseVoltage: parseFloat(message?.PowerData?.VoltageA),
      BPhaseVoltage: parseFloat(message?.PowerData?.VoltageB),
      CPhaseVoltage: parseFloat(message?.PowerData?.VoltageC),
      APhaseCurrent: parseFloat(message?.PowerData?.CurrentA),
      BPhaseCurrent: parseFloat(message?.PowerData?.CurrentB),
      CPhaseCurrent: parseFloat(message?.PowerData?.CurrentC)
    },
    temperatureInformation: {
      containerTemperature: parseFloat(message?.TemperatureData?.ContainerTemperature),
      containerHumidity: parseFloat(message?.TemperatureData?.ContainerHumidity),
      oilTank1: {
        hotTemperature: parseFloat(message?.TemperatureData?.Tank1OilH),
        coldTemperature: parseFloat(message?.TemperatureData?.Tank1OilL)
      },
      oilTank2: {
        hotTemperature: parseFloat(message?.TemperatureData?.Tank2OilH),
        coldTemperature: parseFloat(message?.TemperatureData?.Tank2OilL)
      },
      waterTank1: {
        hotTemperature: parseFloat(message?.TemperatureData?.Tank1WaterH),
        coldTemperature: parseFloat(message?.TemperatureData?.Tank1WaterL)
      },
      waterTank2: {
        hotTemperature: parseFloat(message?.TemperatureData?.Tank2WaterH),
        coldTemperature: parseFloat(message?.TemperatureData?.Tank2WaterL)
      },
      tank1Pressure: message?.TemperatureData?.Tank1Pressure ? parseFloat(message?.TemperatureData?.Tank1Pressure) : undefined,
      tank2Pressure: message?.TemperatureData?.Tank2Pressure ? parseFloat(message?.TemperatureData?.Tank2Pressure) : undefined
    },
    UPSInformation: {
      inputVoltage: parseFloat(message?.UPSData?.InputVoltage),
      inputFrequency: parseFloat(message?.UPSData?.InputFrequency),
      outputVoltage: parseFloat(message?.UPSData?.OutputVoltage),
      outputFrequency: parseFloat(message?.UPSData?.OutputFrequency),
      temperature: parseFloat(message?.UPSData?.Temperature),
      batteryLevel: parseFloat(message?.UPSData?.BatteryStatus)
    }
  }),
  TacticsData: (message) => ({
    tactics: {
      stopPolicy: {
        tactic: _TacticsType[message?.Tactics?.StopTactics?.TacticsType],
        electricityParameters: {
          stopPrice: parseFloat(message?.Tactics?.StopTactics?.ElectricityPrice?.StopPrice),
          currentPrice: parseFloat(message?.Tactics?.StopTactics?.ElectricityPrice?.CurrentPrice)
        },
        coinPriceParameters: {
          stopPrice: parseFloat(message?.Tactics?.StopTactics?.CoinPrice?.StopPrice),
          currentPrice: parseFloat(message?.Tactics?.StopTactics?.CoinPrice?.CurrentPrice)
        }
      },
      startPolicy: {
        tactic: _TacticsType[message?.Tactics?.RunTactics?.TacticsType],
        electricityParameters: {
          runPrice: parseFloat(message?.Tactics?.RunTactics?.ElectricityPrice?.RunPrice),
          currentPrice: parseFloat(message?.Tactics?.RunTactics?.ElectricityPrice?.CurrentPrice)
        },
        coinPriceParameters: {
          runPrice: parseFloat(message?.Tactics?.RunTactics?.CoinPrice?.RunPrice),
          currentPrice: parseFloat(message?.Tactics?.RunTactics?.CoinPrice?.CurrentPrice)
        }
      }
    },
    _tacticsBase: message?.Tactics
  }),
  ParameterData: (message) => ({
    alarmTemperatures: {
      coldOil: parseFloat(message?.RunningParameter?.CoolOilAlarmTemp),
      hotOil: parseFloat(message?.RunningParameter?.HotOilAlarmTemp),
      coldWater: parseFloat(message?.RunningParameter?.CoolWaterAlarmTemp),
      hotWater: parseFloat(message?.RunningParameter?.HotWaterAlarmTemp),
      pressure: message?.RunningParameter?.PressureAlarmValue ? parseFloat(message?.RunningParameter?.PressureAlarmValue) : undefined
    },
    setTemperatures: {
      coldOil: parseFloat(message?.RunningParameter?.CoolOilSettingTemp),
      exhaustFan: parseFloat(message?.RunningParameter?.ExhausFansRunTemp)
    },
    tankStatus: {
      tank1Enabled: message?.RunningParameter?.Tank1Enable === '1',
      tank2Enabled: message?.RunningParameter?.Tank2Enable === '1'
    },
    exhaustFanStatus: {
      airExhaustEnabled: message?.RunningParameter?.AirExhaustEnable === '1'
    }
  })
}

const _TacticsType = {
  0: 'disabled',
  1: 'electricity',
  2: 'coin'
}

const _TacticsKey = {
  electricity: 'ElectricityPrice',
  coin: 'CoinPrice'
}

function _getKeyByValue (object, value) {
  return Object.keys(object)?.find(key => object[key] === value)
}

module.exports = Bitdeer
