'use strict'

const { getRandomPower } = require('./../utils')
const { MAPPINGS, DEVICE_TYPE_MAP } = require('../../lib/utils/constants')

function generatePDU (type) {
  const deviceType = DEVICE_TYPE_MAP[type]
  if (!deviceType || !MAPPINGS[deviceType]) {
    return []
  }

  const pduKeys = Object.keys(MAPPINGS[deviceType])
  return pduKeys.map((pduKey, index) => {
    const socketCount = MAPPINGS[deviceType][pduKey].length
    return {
      SocketStatus: Array.from({ length: socketCount }, () => '0'),
      PowerData: Array.from({ length: socketCount }, () => '0.0'),
      CurrentData: Array.from({ length: socketCount }, () => '0.0'),
      PDUIndex: `${index}`,
      ReadStatus: '1'
    }
  })
}

module.exports = function (ctx) {
  function getInitialState () {
    const powerData = {
      PowerA: getRandomPower(),
      PowerB: getRandomPower(),
      PowerC: getRandomPower()
    }

    powerData.TotalPower = (powerData.PowerA + powerData.PowerB + powerData.PowerC).toFixed(1)

    return {
      _pressureEnabled: ctx.cap.includes('P'),
      RunningState: '1',
      AlarmState: '0',
      AlarmInfo: ctx.error ? ['OilPump1 error', 'OilPump2 error', 'Unknown_test'] : [],
      DeviceInfo: {
        OilPump1: '0',
        OilPump2: '1',
        WaterPump1: '0',
        WaterPump2: '1',
        DryCooler: [
          {
            CoolerIndex: '0',
            MainContactor: '1',
            FansStatus: ['0', '0', '0', '0', '0', '0', '0', '0']
          }, {
            CoolerIndex: '1',
            MainContactor: '1',
            FansStatus: ['0', '0', '0', '0', '0', '0', '0', '0']
          }
        ]
      },
      PDU: generatePDU(ctx.type),
      PowerData: {
        ...powerData,
        VoltageA: '236.2',
        VoltageB: '236.7',
        VoltageC: '236.0',
        CurrentA: '89.5',
        CurrentB: '88.3',
        CurrentC: '90.2'
      },
      TemperatureData: {
        ContainerTemperature: '28.8',
        ContainerHumidity: '83.4',
        Tank1OilH: '0.0',
        Tank1OilL: '44',
        Tank1WaterH: '0.0',
        Tank1WaterL: '0.0',
        Tank2OilH: '27.7',
        Tank2OilL: '44',
        Tank2WaterH: '27.2',
        Tank2WaterL: '26.6',
        Tank1Pressure: ctx.cap.includes('P') ? '3.4' : undefined,
        Tank2Pressure: ctx.cap.includes('P') ? '3.5' : undefined
      },
      UPSData: {
        InputVoltage: '235.5',
        InputFrequency: '49.9',
        OutputVoltage: '219.9',
        OutputFrequency: '49.9',
        Temperature: '38.0',
        BatteryStatus: '100.0'
      },
      Tactics: {
        StopTactics: {
          ElectricityPrice: {
            StopPrice: '2.0',
            CurrentPrice: '1.5'
          },
          CoinPrice: {
            StopPrice: '24000.0',
            CurrentPrice: '26000.0'
          },
          TacticsType: '0'
        },
        PDU: generatePDU(ctx.type),
        PowerData: {
          TotalPower: '63.4',
          PowerA: '21.1',
          PowerB: '21.0',
          PowerC: '21.3',
          VoltageA: '236.2',
          VoltageB: '236.7',
          VoltageC: '236.0',
          CurrentA: '89.5',
          CurrentB: '88.3',
          CurrentC: '90.2'
        },
        TemperatureData: {
          ContainerTemperature: '28.8',
          ContainerHumidity: '83.4',
          Tank1OilH: '0.0',
          Tank1OilL: '44',
          Tank1WaterH: '0.0',
          Tank1WaterL: '0.0',
          Tank2OilH: '27.7',
          Tank2OilL: '44',
          Tank2WaterH: '27.2',
          Tank2WaterL: '26.6',
          Tank1Pressure: ctx?.cap?.includes('P') ? '3.4' : undefined,
          Tank2Pressure: ctx?.cap?.includes('P') ? '3.5' : undefined
        },
        UPSData: {
          InputVoltage: '235.5',
          InputFrequency: '49.9',
          OutputVoltage: '219.9',
          OutputFrequency: '49.9',
          Temperature: '38.0',
          BatteryStatus: '100.0'
        },
        Tactics: {
          StopTactics: {
            ElectricityPrice: {
              StopPrice: '2.0',
              CurrentPrice: '1.5'
            },
            CoinPrice: {
              StopPrice: '24000.0',
              CurrentPrice: '26000.0'
            },
            TacticsType: '0'
          },
          RunTactics: {
            ElectricityPrice: {
              RunPrice: '0.8',
              CurrentPrice: '1.5'
            },
            CoinPrice: {
              RunPrice: '25000.0',
              CurrentPrice: '26000.0'
            },
            TacticsType: '0'
          }
        },
        RunningParameter: {
          CoolOilAlarmTemp: '50.0',
          HotOilAlarmTemp: '60.0',
          CoolWaterAlarmTemp: '45.0',
          HotWaterAlarmTemp: '50.0',
          CoolOilSettingTemp: '45.0',
          ExhausFansRunTemp: '30.0',
          PressureAlarmValue: ctx?.cap?.includes('P') ? '0.1' : undefined,
          Tank1Enable: '0',
          Tank2Enable: '1',
          AirExhaustEnable: '1'
        }
      }
    }
  }

  const state = getInitialState()
  const initialState = JSON.parse(JSON.stringify(getInitialState()))

  function cleanup () {
    Object.assign(state, initialState)
    return state
  }

  return { state, cleanup }
}
