'use strict'

const { test } = require('brittle')
const AntspaceImmersion = require('../../lib/antspace.immersion')
const { RUNNING_STATUS } = require('../../../../tpls/tpl-lib-container/lib/utils/constants')

function createMockFetch (systemData = {}, minerInfo = {}) {
  return {
    get: async () => ({ body: { ok: true } }),
    request: async (url, options) => {
      const op = options?.qs?.operation
      if (op === 'coolerState') return { body: { ok: true, params: systemData } }
      if (op === 'minerInfo') return { body: { ok: true, params: minerInfo } }
      return { body: { ok: false } }
    }
  }
}

test('AntspaceImmersion extends Antspace', (t) => {
  const client = createMockFetch()
  const c = new AntspaceImmersion({ client, address: '127.0.0.1', port: 8080 })
  t.is(c._type, 'container', '_type is container')
})

test('AntspaceImmersion _getStatus returns ERROR when isErrored', (t) => {
  const client = createMockFetch()
  const c = new AntspaceImmersion({ client })
  t.is(c._getStatus(true, true), RUNNING_STATUS.ERROR)
  t.is(c._getStatus(true, false), RUNNING_STATUS.ERROR)
})

test('AntspaceImmersion _getStatus returns RUNNING when isRunning and not errored', (t) => {
  const client = createMockFetch()
  const c = new AntspaceImmersion({ client })
  t.is(c._getStatus(false, true), RUNNING_STATUS.RUNNING)
})

test('AntspaceImmersion _getStatus returns STOPPED when not running and not errored', (t) => {
  const client = createMockFetch()
  const c = new AntspaceImmersion({ client })
  t.is(c._getStatus(false, false), RUNNING_STATUS.STOPPED)
})

test('AntspaceImmersion _prepErrors maps known errors', (t) => {
  const client = createMockFetch()
  const c = new AntspaceImmersion({ client })
  const data = { fan_fault: true, primary_circulating_pump: true }
  const { isErrored, errors } = c._prepErrors(data)
  t.ok(isErrored, 'isErrored true when fault present')
  t.ok(Array.isArray(errors), 'errors is array')
  t.ok(errors.some(e => e.name === 'fan_fault'), 'fan_fault mapped')
  t.ok(errors.some(e => e.name === 'circulating_pump_fault'), 'primary_circulating_pump mapped')
})

test('AntspaceImmersion getSnap returns stats and config shape', async (t) => {
  const systemData = {
    second_pump1: true,
    second_pump2: false,
    distribution_box_power: 0.03,
    power_distribution: 5,
    pump_alarm: false,
    container_temp: 24,
    container_humidity: 45,
    running_mode: 'auto',
    pid_mode: 1,
    supply_liquid_set_temp: 18,
    vol_a_distribution: 100,
    vol_b_distribution: 200,
    vol_c_distribution: 150
  }
  const minerInfo = { model: 'M50', count: 2 }
  const client = createMockFetch(systemData, minerInfo)
  const c = new AntspaceImmersion({ client, address: '127.0.0.1', port: 8080 })
  const snap = await c.getSnap()
  t.ok(snap, 'snap returned')
  t.ok(snap.stats, 'stats present')
  t.is(snap.stats.status, RUNNING_STATUS.RUNNING, 'status running when pump on')
  t.is(snap.stats.power_w, 3000, 'power_w from distribution_box_power * 100000')
  t.is(snap.stats.container_specific.vol_a_distribution, 10, 'vol_a_distribution rounded')
  t.is(snap.stats.container_specific.vol_b_distribution, 20, 'vol_b_distribution rounded')
  t.ok(snap.config?.container_specific?.supply_liquid_set_temp === 18, 'config has set temp')
})
