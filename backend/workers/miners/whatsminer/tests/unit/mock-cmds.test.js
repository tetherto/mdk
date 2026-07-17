'use strict'

const test = require('brittle')
const getToken = require('../../mock/cmds/get_token')
const setLed = require('../../mock/cmds/set_led')
const setPowerPctV2 = require('../../mock/cmds/set_power_pct_v2')
const updatePools = require('../../mock/cmds/update_pools')
const setHostname = require('../../mock/cmds/set_hostname')
const libUtils = require('../../mock/utils')
const defaultState = require('../../mock/initial_states/default')
const m56sState = require('../../mock/initial_states/m56s')

test('get_token - registers derived token sign for valid sessions', (t) => {
  const ctx = { password: 'admin', validTokens: new Set() }
  const state = { activeTokens: 0 }
  const res = getToken(ctx, state)
  t.is(res.Code, 131)
  t.alike(res.Msg, { time: '0000', salt: '5QAHiKMb', newsalt: 'kowEj187' })
  t.is(state.activeTokens, 1)
  t.is(ctx.validTokens.size, 1)
})

test('get_token - skips token registration without password context', (t) => {
  const res = getToken({}, { activeTokens: 0 })
  t.is(res.Code, 131)
})

test('get_token - rejects when max active tokens reached', (t) => {
  const state = { activeTokens: 16 }
  t.alike(getToken({}, state), { Code: 136 })
  t.is(state.activeTokens, 0)
})

test('set_led - auto and manual modes, invalid args rejected', (t) => {
  const state = { miner_info: { ledstat: 'manual' } }
  t.is(setLed({}, state, { param: 'auto' }).Code, 131)
  t.is(state.miner_info.ledstat, 'auto')

  t.is(setLed({}, state, { color: 'red', period: 200, duration: 100, start: 0 }).Code, 131)
  t.is(state.miner_info.ledstat, 'manual')

  t.is(setLed({}, state, {}).Code, 14)
})

test('set_power_pct_v2 - scales power limit and target freq', (t) => {
  const state = { summary: { 'Power Limit': 8000, 'Target Freq': 720 } }
  t.is(setPowerPctV2({}, state, { percent: '50' }).Code, 131)
  t.is(state.summary['Power Limit'], 4000)
  t.is(state.summary['Target Freq'], 360)
})

test('set_power_pct_v2 - rejects out-of-range and missing percent', (t) => {
  const state = { summary: { 'Power Limit': 8000, 'Target Freq': 720 } }
  t.is(setPowerPctV2({}, state, { percent: '250' }).Code, 132)
  t.is(setPowerPctV2({}, state, { percent: '0' }).Code, 132)
  t.is(setPowerPctV2({}, state, {}).Code, 14)
  t.is(state.summary['Power Limit'], 8000)
})

test('update_pools - rewrites pool urls and workers', (t) => {
  const state = { pools: libUtils.createPools() }
  const req = {
    pool1: 'stratum+tcp://p1:1',
    pool2: 'stratum+tcp://p2:2',
    pool3: 'stratum+tcp://p3:3',
    worker1: 'w1',
    worker2: 'w2',
    worker3: 'w3',
    passwd1: 'x',
    passwd2: 'x',
    passwd3: 'x'
  }
  t.is(updatePools({}, state, req).Code, 131)
  t.is(state.pools[0].URL, 'stratum+tcp://p1:1')
  t.is(state.pools[2].User, 'w3')

  t.is(updatePools({}, state, { pool1: 'only' }).Code, 132)
})

test('set_hostname - updates hostname, invalid args rejected', (t) => {
  const state = { miner_info: { hostname: 'old' } }
  t.is(setHostname({}, state, { hostname: 'rig-9' }).Code, 131)
  t.is(state.miner_info.hostname, 'rig-9')

  t.is(setHostname({}, state, {}).Code, 14)
})

test('initial_states/default - error flag injects error codes, cleanup restores', (t) => {
  const ctx = { host: '10.0.0.9', serial: 'SER123' }
  const healthy = defaultState({ ...ctx })
  t.alike(healthy.state.error_code, [])
  t.ok(healthy.state.summary['MHS av'] > 0)

  const errored = defaultState({ ...ctx, error: true })
  t.is(errored.state.error_code.length, 1)

  errored.state.suspended = true
  errored.cleanup()
  t.is(errored.state.suspended, false)
})

test('initial_states/m56s - initializes active state, cleanup restores', (t) => {
  const { state, cleanup } = m56sState({ host: '10.0.0.9', serial: 'SER123' })
  t.alike(state.error_code, [])
  t.is(state.led_mode, 'auto')
  t.ok(state.summary['MHS av'] > 0)

  state.suspended = true
  cleanup()
  t.is(state.suspended, false)
})
