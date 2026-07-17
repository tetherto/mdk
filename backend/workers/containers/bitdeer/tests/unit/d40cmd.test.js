'use strict'

const { test } = require('brittle')
const initialState = require('../../mock/d40/initialState')
const PumpOperate = require('../../mock/d40/cmd/PumpOperate')
const CoolerOperate = require('../../mock/d40/cmd/CoolerOperate')
const PDUOperate = require('../../mock/d40/cmd/PDUOperate')
const RunningOperate = require('../../mock/d40/cmd/RunningOperate')
const TacticsSet = require('../../mock/d40/cmd/TacticsSet')
const ParameterSet = require('../../mock/d40/cmd/ParameterSet')
const emitter = require('../../mock/d40/default')

function createState (ctx = {}) {
  return initialState({ type: 'D40_M56', cap: [], error: false, ...ctx }).state
}

function packet (obj) {
  return { payload: Buffer.from(JSON.stringify(obj)) }
}

function validTactics () {
  return {
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
}

test('initialState with pressure cap and error flag', (t) => {
  const { state, cleanup } = initialState({ type: 'D40_M56', cap: ['P'], error: true })
  t.is(state._pressureEnabled, true, 'pressure enabled')
  t.ok(state.AlarmInfo.length > 0, 'alarm info populated')
  t.is(state.TemperatureData.Tank1Pressure, '3.4', 'tank1 pressure set')
  t.is(state.TemperatureData.Tank2Pressure, '3.5', 'tank2 pressure set')
  t.is(state.Tactics.RunningParameter.PressureAlarmValue, '0.1', 'pressure alarm value set')
  state.RunningState = '0'
  const reset = cleanup()
  t.is(reset.RunningState, '1', 'cleanup restores initial state')
})

test('initialState without pressure cap', (t) => {
  const state = createState()
  t.is(state._pressureEnabled, false, 'pressure disabled')
  t.alike(state.AlarmInfo, [], 'no alarms')
  t.is(state.TemperatureData.Tank1Pressure, undefined, 'no tank1 pressure')
  t.ok(state.PDU.length > 0, 'PDUs generated for known type')
})

test('initialState unknown device type yields no PDUs', (t) => {
  const state = createState({ type: 'nope' })
  t.alike(state.PDU, [], 'empty PDU list')
})

test('PumpOperate sets oil and water pumps', (t) => {
  const state = createState()
  PumpOperate(state, packet({ Type: 'OilPump', Index: '1', Operate: '1' }), () => {})
  t.is(state.DeviceInfo.OilPump1, '1', 'oil pump 1 on')
  PumpOperate(state, packet({ Type: 'OilPump', Index: '2', Operate: '0' }), () => {})
  t.is(state.DeviceInfo.OilPump2, '0', 'oil pump 2 off')
  PumpOperate(state, packet({ Type: 'WaterPump', Index: '1', Operate: '1' }), () => {})
  t.is(state.DeviceInfo.WaterPump1, '1', 'water pump 1 on')
  PumpOperate(state, packet({ Type: 'WaterPump', Index: '2', Operate: '0' }), () => {})
  t.is(state.DeviceInfo.WaterPump2, '0', 'water pump 2 off')
})

test('PumpOperate ignores unknown pump type, index and bad payload', (t) => {
  const state = createState()
  const before = JSON.stringify(state.DeviceInfo)
  PumpOperate(state, packet({ Type: 'GasPump', Index: '1', Operate: '1' }), () => {})
  PumpOperate(state, packet({ Type: 'OilPump', Index: '9', Operate: '1' }), () => {})
  PumpOperate(state, packet({ Type: 'WaterPump', Index: '9', Operate: '1' }), () => {})
  PumpOperate(state, { payload: Buffer.from('not-json') }, () => {})
  t.is(JSON.stringify(state.DeviceInfo), before, 'state unchanged')
})

test('CoolerOperate sets all fans and single fan', (t) => {
  const state = createState()
  CoolerOperate(state, packet({ CoolerIndex: '0', FansIndex: '-1', Operate: '1' }), () => {})
  t.ok(state.DeviceInfo.DryCooler[0].FansStatus.every((f) => f === '1'), 'all fans on')
  CoolerOperate(state, packet({ CoolerIndex: '1', FansIndex: '2', Operate: '1' }), () => {})
  t.is(state.DeviceInfo.DryCooler[1].FansStatus[2], '1', 'single fan on')
  CoolerOperate(state, packet({ CoolerIndex: '1', FansIndex: '2', Operate: '0' }), () => {})
  t.is(state.DeviceInfo.DryCooler[1].FansStatus[2], '0', 'single fan off')
})

test('CoolerOperate rejects invalid status', (t) => {
  const state = createState()
  CoolerOperate(state, packet({ CoolerIndex: '0', FansIndex: '-1', Operate: 'x' }), () => {})
  t.ok(state.DeviceInfo.DryCooler[0].FansStatus.every((f) => f === '0'), 'fans unchanged')
})

test('PDUOperate updates single socket and totals', (t) => {
  const state = createState()
  PDUOperate(state, packet({ PDUIndex: '0', SocketIndex: '3', Operate: '1' }), () => {})
  t.is(state.PDU[0].SocketStatus[3], '1', 'socket on')
  t.is(state.PDU[0].PowerData[3], '7.0', 'power on value')
  t.is(state.PDU[0].CurrentData[3], '10.1', 'current on value')
  t.is(state.PowerData.TotalPower, '7.0', 'total power recomputed')
})

test('PDUOperate all PDUs all sockets and off values', (t) => {
  const state = createState()
  PDUOperate(state, packet({ PDUIndex: '-1', SocketIndex: '-1', Operate: '1' }), () => {})
  t.ok(state.PDU.every((pdu) => pdu.SocketStatus.every((s) => s === '1')), 'all sockets on')
  PDUOperate(state, packet({ PDUIndex: '-1', SocketIndex: '-1', Operate: '0' }), () => {})
  t.ok(state.PDU.every((pdu) => pdu.SocketStatus.every((s) => s === '0')), 'all sockets off')
  t.is(state.PowerData.TotalPower, '0.0', 'zero total power')
})

test('PDUOperate adds dry cooler load when a fan is running', (t) => {
  const state = createState()
  state.DeviceInfo.DryCooler[0].FansStatus[0] = '1'
  PDUOperate(state, packet({ PDUIndex: '0', SocketIndex: '-1', Operate: '0' }), () => {})
  t.is(state.PowerData.TotalPower, '5.0', 'baseline cooler power added')
  t.is(state.PowerData.TotalCurrent, '10.0', 'baseline cooler current added')
})

test('PDUOperate ignores bad payload', (t) => {
  const state = createState()
  const before = JSON.stringify(state.PowerData)
  PDUOperate(state, { payload: Buffer.from('nope') }, () => {})
  t.is(JSON.stringify(state.PowerData), before, 'state unchanged')
})

test('RunningOperate handles AlarmReset, AutoRun, AutoStop and unknown', (t) => {
  const state = createState()
  state.AlarmState = '1'
  RunningOperate(state, packet({ Operate: 'AlarmReset' }), () => {})
  t.is(state.AlarmState, '0', 'alarm reset')
  RunningOperate(state, packet({ Operate: 'AutoStop' }), () => {})
  t.is(state.RunningState, '0', 'stopped')
  RunningOperate(state, packet({ Operate: 'AutoRun' }), () => {})
  t.is(state.RunningState, '1', 'running')
  RunningOperate(state, packet({ Operate: 'Whatever' }), () => {})
  t.is(state.RunningState, '1', 'unknown op is a no-op')
  RunningOperate(state, { payload: Buffer.from('bad') }, () => {})
  t.is(state.RunningState, '1', 'bad payload is a no-op')
})

test('TacticsSet applies valid tactics', (t) => {
  const state = createState()
  TacticsSet(state, packet({ Tactics: validTactics() }), () => {})
  t.is(state.Tactics.StopTactics.TacticsType, '1', 'stop tactics type set')
  t.is(state.Tactics.RunTactics.TacticsType, '2', 'run tactics type set')
})

test('TacticsSet rejects invalid tactics payloads', (t) => {
  const cases = [
    undefined,
    {},
    { StopTactics: validTactics().StopTactics },
    (() => { const v = validTactics(); v.StopTactics.TacticsType = '9'; return v })(),
    (() => { const v = validTactics(); delete v.StopTactics.ElectricityPrice.StopPrice; return v })(),
    (() => { const v = validTactics(); v.StopTactics.ElectricityPrice.CurrentPrice = '-1'; return v })(),
    (() => { const v = validTactics(); delete v.StopTactics.CoinPrice; return v })(),
    (() => { const v = validTactics(); v.StopTactics.CoinPrice.CurrentPrice = null; return v })(),
    (() => { const v = validTactics(); delete v.RunTactics.ElectricityPrice.RunPrice; return v })(),
    (() => { const v = validTactics(); v.RunTactics.CoinPrice.RunPrice = '-5'; return v })(),
    (() => { const v = validTactics(); v.RunTactics.TacticsType = 'x'; return v })()
  ]
  for (const tactics of cases) {
    const state = createState()
    TacticsSet(state, packet({ Tactics: tactics }), () => {})
    t.is(state.Tactics.StopTactics.TacticsType, '0', 'state unchanged for invalid tactics')
  }
})

test('ParameterSet updates temperatures and enables', (t) => {
  const state = createState()
  ParameterSet(state, packet({
    RunningParameter: {
      CoolOilAlarmTemp: '100.0',
      HotOilAlarmTemp: '100.0',
      CoolWaterAlarmTemp: '100.0',
      HotWaterAlarmTemp: '100.0',
      CoolOilSettingTemp: '100.0',
      ExhausFansRunTemp: '35.0',
      Tank1Enable: '1',
      Tank2Enable: '0',
      AirExhaustEnable: '0'
    }
  }), () => {})
  const params = state.Tactics.RunningParameter
  t.is(params.CoolOilAlarmTemp, '100.0', 'cool oil alarm updated')
  t.is(params.ExhausFansRunTemp, '35.0', 'exhaust fan temp updated')
  t.is(params.Tank1Enable, '1', 'tank1 enabled')
  t.is(params.Tank2Enable, '0', 'tank2 disabled')
  t.is(params.AirExhaustEnable, '0', 'air exhaust disabled')
})

test('ParameterSet raises alarm when threshold at or below tank temp', (t) => {
  const state = createState()
  ParameterSet(state, packet({
    RunningParameter: { CoolOilAlarmTemp: '40.0' }
  }), () => {})
  t.is(state.AlarmState, '1', 'alarm raised')
})

test('ParameterSet ignores invalid values', (t) => {
  const state = createState()
  const before = JSON.stringify(state.Tactics.RunningParameter)
  ParameterSet(state, packet({
    RunningParameter: {
      CoolOilAlarmTemp: '-1',
      HotOilAlarmTemp: null,
      Tank1Enable: '5',
      AirExhaustEnable: null,
      PressureAlarmValue: '1.0'
    }
  }), () => {})
  t.is(JSON.stringify(state.Tactics.RunningParameter), before, 'nothing applied')
  ParameterSet(state, { payload: Buffer.from('bad') }, () => {})
  t.is(JSON.stringify(state.Tactics.RunningParameter), before, 'bad payload ignored')
})

test('ParameterSet applies pressure only when pressure capability enabled', (t) => {
  const state = initialState({ type: 'D40_M56', cap: ['P'] }).state
  ParameterSet(state, packet({ RunningParameter: { PressureAlarmValue: '2.5' } }), () => {})
  t.is(state.Tactics.RunningParameter.PressureAlarmValue, '2.5', 'pressure applied')
})

test('default emitter accepts existing state and stops intervals', (t) => {
  const calls = { publish: 0, subscribe: 0 }
  const handlers = {}
  const server = {
    publish: () => { calls.publish++ },
    subscribe: () => { calls.subscribe++ },
    once: (ev, fn) => { handlers[ev] = fn },
    on: (ev, fn) => { handlers[ev] = fn }
  }
  const existed = createState()
  const stop = emitter({ id: 'C1', type: 'D40_M56', cap: [] }, server, existed)
  t.ok(calls.subscribe > 0, 'subscribed to cmd topics')
  handlers.connect()
  t.ok(calls.publish > 0, 'publishes on connect')
  handlers.message('C1RunningOperate', Buffer.from(JSON.stringify({ Operate: 'AutoStop' })))
  t.is(existed.RunningState, '0', 'command routed to existing state')
  handlers.message('C1Nope', Buffer.from('{}'))
  stop()
  t.pass('stop clears intervals')
})

test('default emitter builds state when none provided', (t) => {
  const handlers = {}
  const server = {
    publish: () => {},
    subscribe: () => {},
    once: (ev, fn) => { handlers[ev] = fn },
    on: (ev, fn) => { handlers[ev] = fn }
  }
  const stop = emitter({ id: 'C2', type: 'D40_M56', cap: [] }, server)
  stop()
  t.pass('emitter constructed with internal initial state')
})
