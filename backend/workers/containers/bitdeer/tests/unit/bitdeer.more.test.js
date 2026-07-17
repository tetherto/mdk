'use strict'

const { test } = require('brittle')
const Bitdeer = require('../../lib/bitdeer')

function createMockServer () {
  const subscriptions = {}
  return {
    subscribe (topic, handler) {
      subscriptions[topic] = handler
    },
    publish (opts) {},
    _subscriptions: subscriptions,
    _deliver (topic, payload) {
      const handler = subscriptions[topic]
      if (handler) handler({ topic, payload: Buffer.from(JSON.stringify(payload)) }, () => {})
    }
  }
}

function createContainer (opts = {}) {
  const server = createMockServer()
  const published = []
  server.publish = (msg) => { published.push(msg) }
  const c = new Bitdeer({ server, containerId: 'C1', type: 'm56', conf: { delay: 0 }, ...opts })
  return { c, server, published }
}

function seedTemplateCache (c) {
  c.lastMessageCache.alarmTemperatures = { coldOil: 50, hotOil: 60, coldWater: 45, hotWater: 50, pressure: undefined }
  c.lastMessageCache.setTemperatures = { coldOil: 45, exhaustFan: 30 }
  c.lastMessageCache.tankStatus = { tank1Enabled: false, tank2Enabled: true }
  c.lastMessageCache.exhaustFanStatus = { airExhaustEnabled: true }
}

function deliverAll (server, id, { alarmInfo = [], pduIndex = '0' } = {}) {
  server._deliver(`${id}RunningInfo`, {
    AlarmState: alarmInfo.length ? '1' : '0',
    AlarmInfo: alarmInfo,
    RunningState: '1',
    DeviceInfo: {
      OilPump1: '1',
      OilPump2: '0',
      WaterPump1: '1',
      WaterPump2: '0',
      DryCooler: [{ CoolerIndex: '0', MainContactor: '1', FansStatus: ['1', '0'] }]
    }
  })
  server._deliver(`${id}PDUData`, {
    PDUData: [{
      PDUIndex: pduIndex,
      SocketStatus: ['1', '0'],
      PowerData: ['7.0', '0.0'],
      CurrentData: ['10.1', '0.0']
    }]
  })
  server._deliver(`${id}MainData`, {
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
      Tank1Pressure: '3.4',
      Tank2Pressure: '3.5'
    },
    UPSData: {
      InputVoltage: '235.5',
      InputFrequency: '49.9',
      OutputVoltage: '219.9',
      OutputFrequency: '49.9',
      Temperature: '38.0',
      BatteryStatus: '100.0'
    }
  })
  server._deliver(`${id}TacticsData`, {
    Tactics: {
      StopTactics: {
        TacticsType: '1',
        ElectricityPrice: { StopPrice: '2.0', CurrentPrice: '1.5' },
        CoinPrice: { StopPrice: '24000.0', CurrentPrice: '26000.0' }
      },
      RunTactics: {
        TacticsType: '2',
        ElectricityPrice: { RunPrice: '0.8', CurrentPrice: '1.5' },
        CoinPrice: { RunPrice: '25000.0', CurrentPrice: '26000.0' }
      }
    }
  })
  server._deliver(`${id}ParameterData`, {
    RunningParameter: {
      CoolOilAlarmTemp: '50.0',
      HotOilAlarmTemp: '60.0',
      CoolWaterAlarmTemp: '45.0',
      HotWaterAlarmTemp: '50.0',
      CoolOilSettingTemp: '45.0',
      ExhausFansRunTemp: '30.0',
      PressureAlarmValue: '0.1',
      Tank1Enable: '1',
      Tank2Enable: '0',
      AirExhaustEnable: '1'
    }
  })
}

test('Bitdeer remaining getters read from lastMessageCache', async (t) => {
  const { c } = createContainer()
  c.lastMessageCache.UPSInformation = { batteryLevel: 100 }
  c.lastMessageCache.tactics = { startPolicy: {} }
  c.lastMessageCache.alarmTemperatures = { coldOil: 50 }
  c.lastMessageCache.setTemperatures = { coldOil: 45 }
  c.lastMessageCache.tankStatus = { tank1Enabled: true }
  c.lastMessageCache.exhaustFanStatus = { airExhaustEnabled: false }

  t.alike(await c.getUPSInformation(), { batteryLevel: 100 }, 'getUPSInformation')
  t.alike(await c.getTactics(), { startPolicy: {} }, 'getTactics')
  t.alike(await c.getAlarmTemperatures(), { coldOil: 50 }, 'getAlarmTemperatures')
  t.alike(await c.getSetTemperatures(), { coldOil: 45 }, 'getSetTemperatures')
  t.alike(await c.getTankStatus(), { tank1Enabled: true }, 'getTankStatus')
  t.alike(await c.getExhaustFanStatus(), { airExhaustEnabled: false }, 'getExhaustFanStatus')
})

test('Bitdeer setDryCoolerState publishes CoolerOperate', async (t) => {
  const { c, published } = createContainer()
  const result = await c.setDryCoolerState(0, -1, true)
  t.alike(result, { success: true }, 'returns success')
  t.ok(published[0].topic.includes('CoolerOperate'), 'CoolerOperate topic')
  t.alike(JSON.parse(published[0].payload), { CoolerIndex: '0', FansIndex: '-1', Operate: '1' }, 'on payload')
  await c.setDryCoolerState(1, 3, false)
  t.alike(JSON.parse(published[1].payload), { CoolerIndex: '1', FansIndex: '3', Operate: '0' }, 'off payload')
})

test('Bitdeer setTactics maps tactic types onto the cached base', async (t) => {
  const { c, published } = createContainer()
  c.lastMessageCache._tacticsBase = {
    RunTactics: { TacticsType: '0', ElectricityPrice: { RunPrice: '0.0', CurrentPrice: '0.0' } },
    StopTactics: { TacticsType: '0', CoinPrice: { StopPrice: '0.0', CurrentPrice: '0.0' } }
  }
  const result = await c.setTactics({
    start: { tacticType: 'electricity', startPrice: 0.8, currentPrice: 1.5 },
    stop: { tacticType: 'coin', stopPrice: 24000, currentPrice: 26000 }
  })
  t.alike(result, { success: true }, 'returns success')
  const payload = JSON.parse(published[0].payload)
  t.is(payload.Tactics.RunTactics.TacticsType, '1', 'electricity maps to 1')
  t.is(payload.Tactics.RunTactics.ElectricityPrice.RunPrice, '0.8', 'run price set')
  t.is(payload.Tactics.StopTactics.TacticsType, '2', 'coin maps to 2')
  t.is(payload.Tactics.StopTactics.CoinPrice.StopPrice, '24000', 'stop price set')
})

test('Bitdeer setTemperatureSettings applies every provided setting', async (t) => {
  const { c, published } = createContainer()
  seedTemplateCache(c)
  c.lastMessageCache.alarmTemperatures.pressure = 3.4
  const result = await c.setTemperatureSettings({
    coldOil: 51,
    hotOil: 61,
    coldWater: 46,
    hotWater: 52,
    coldOilSet: 44,
    exhaustFan: 31,
    pressureAlarm: 0.2
  })
  t.alike(result, { success: true }, 'returns success')
  const params = JSON.parse(published[0].payload).RunningParameter
  t.is(params.CoolOilAlarmTemp, '51', 'coldOil')
  t.is(params.HotOilAlarmTemp, '61', 'hotOil')
  t.is(params.CoolWaterAlarmTemp, '46', 'coldWater')
  t.is(params.HotWaterAlarmTemp, '52', 'hotWater')
  t.is(params.CoolOilSettingTemp, '44', 'coldOilSet')
  t.is(params.ExhausFansRunTemp, '31', 'exhaustFan')
  t.is(params.PressureAlarmValue, '0.2', 'pressureAlarm')
})

test('Bitdeer setTemperatureSettings keeps template values when settings empty', async (t) => {
  const { c, published } = createContainer()
  seedTemplateCache(c)
  await c.setTemperatureSettings({})
  const params = JSON.parse(published[0].payload).RunningParameter
  t.is(params.CoolOilAlarmTemp, '50', 'template coldOil kept')
  t.is(params.PressureAlarmValue, undefined, 'pressure absent when not cached')
  t.is(params.Tank1Enable, '0', 'tank1 template value')
  t.is(params.Tank2Enable, '1', 'tank2 template value')
  t.is(params.AirExhaustEnable, '1', 'air exhaust template value')
})

test('Bitdeer setTankEnabled and setAirExhaustEnabled toggle flags', async (t) => {
  const { c, published } = createContainer()
  seedTemplateCache(c)
  await c.setTankEnabled(1, true)
  t.is(JSON.parse(published[0].payload).RunningParameter.Tank1Enable, '1', 'tank1 on')
  await c.setTankEnabled(2, false)
  t.is(JSON.parse(published[1].payload).RunningParameter.Tank2Enable, '0', 'tank2 off')
  await c.setAirExhaustEnabled(false)
  t.is(JSON.parse(published[2].payload).RunningParameter.AirExhaustEnable, '0', 'exhaust off')
  await c.setAirExhaustEnabled(true)
  t.is(JSON.parse(published[3].payload).RunningParameter.AirExhaustEnable, '1', 'exhaust on')
})

test('Bitdeer switchCoolingSystem drives coolers and tanks', async (t) => {
  const { c, published } = createContainer()
  seedTemplateCache(c)
  const result = await c.switchCoolingSystem(true)
  t.alike(result, { success: true }, 'returns success')
  const coolerOps = published.filter((p) => p.topic.includes('CoolerOperate'))
  const paramOps = published.filter((p) => p.topic.includes('ParameterSet'))
  t.is(coolerOps.length, 2, 'both dry coolers addressed')
  t.is(paramOps.length, 2, 'both tanks addressed')
  t.ok(coolerOps.every((p) => JSON.parse(p.payload).Operate === '1'), 'coolers on')
  published.length = 0
  await c.switchCoolingSystem(false)
  t.ok(published.filter((p) => p.topic.includes('CoolerOperate')).every((p) => JSON.parse(p.payload).Operate === '0'), 'coolers off')
})

test('Bitdeer _handleMessage ignores unmapped topics', (t) => {
  const { c } = createContainer()
  let called = false
  c._handleMessage({ topic: 'C1Bogus', payload: Buffer.from('{}') }, () => { called = true })
  t.is(called, false, 'callback not invoked for unknown topic')
})

test('Bitdeer topic mappings tolerate empty messages', (t) => {
  const { c, server } = createContainer()
  server._deliver('C1TacticsData', {})
  t.is(c.lastMessageCache.tactics.startPolicy.tactic, undefined, 'missing tactic type')
  t.ok(Number.isNaN(c.lastMessageCache.tactics.startPolicy.electricityParameters.runPrice), 'missing run price')
  server._deliver('C1MainData', {})
  t.is(c.lastMessageCache.temperatureInformation.tank1Pressure, undefined, 'missing tank1 pressure')
  t.is(c.lastMessageCache.temperatureInformation.tank2Pressure, undefined, 'missing tank2 pressure')
  server._deliver('C1ParameterData', {})
  t.is(c.lastMessageCache.alarmTemperatures.pressure, undefined, 'missing pressure alarm')
  server._deliver('C1RunningInfo', {})
  t.is(c.lastMessageCache.deviceInformation.dryCoolerStatus, undefined, 'missing dry coolers')
})

test('Bitdeer _prepSnap throws ERR_OFFLINE when never seen', (t) => {
  const { c } = createContainer()
  try {
    c._prepSnap()
    t.fail('expected throw')
  } catch (err) {
    t.is(err.message, 'ERR_OFFLINE', 'offline error')
  }
})

test('Bitdeer _prepSnap builds full snapshot with offline PDUs', (t) => {
  const { c, server } = createContainer()
  deliverAll(server, 'C1')
  const snap = c._prepSnap()
  t.is(snap.stats.status, 'running', 'running status')
  t.is(snap.stats.errors, undefined, 'no errors field when healthy')
  t.is(snap.stats.power_w, 63400, 'total power in watts')
  t.is(snap.stats.container_specific.pdu_data.length, 8, 'all m56 PDUs present')
  const online = snap.stats.container_specific.pdu_data[0]
  t.is(online.pdu, '1-1', 'first PDU mapped')
  t.is(online.sockets.length, 2, 'reported sockets')
  t.is(online.sockets[0].enabled, true, 'socket state mapped')
  const offline = snap.stats.container_specific.pdu_data[1]
  t.is(offline.offline, true, 'missing PDU marked offline')
  t.alike(offline.sockets, [], 'offline PDU has no sockets')
  t.is(snap.config.container_specific.tactics.start_policy.type, 'coin', 'run tactic mapped')
  t.is(snap.config.container_specific.tactics.stop_policy.type, 'electricity', 'stop tactic mapped')
  t.is(snap.config.container_specific.alarms.pressure_bar, 0.1, 'pressure alarm mapped')
})

test('Bitdeer _prepSnap reports errors from alarm info', (t) => {
  const { c, server } = createContainer()
  deliverAll(server, 'C1', { alarmInfo: ['OilPump1 error', 'Totally unknown alarm'] })
  const snap = c._prepSnap()
  t.is(snap.stats.status, 'error', 'error status')
  t.is(snap.stats.errors.length, 2, 'both alarms reported')
  t.ok(snap.stats.errors.some((e) => e.name === 'unknown' && e.message === 'Totally unknown alarm'), 'unknown alarm falls back')
  t.is(snap.stats.alarm_status, true, 'alarm state true')
})

test('Bitdeer _prepSnap skips null-mapped sockets for a1346', (t) => {
  const server = createMockServer()
  const c = new Bitdeer({ server, containerId: 'C2', type: 'a1346', conf: { delay: 0 } })
  deliverAll(server, 'C2', { pduIndex: '2' })
  const snap = c._prepSnap()
  const pdu = snap.stats.container_specific.pdu_data[2]
  t.is(pdu.pdu, '1-3', 'PDU mapped')
  t.is(pdu.sockets.length, 1, 'null-mapped socket skipped')
  t.is(pdu.sockets[0].socket, 'a2', 'second socket kept')
})
