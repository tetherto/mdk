'use strict'

const { test } = require('brittle')
const AntspaceHydro = require('../../lib/antspace.hydro')
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

test('AntspaceHydro extends Antspace', (t) => {
  const client = createMockFetch()
  const c = new AntspaceHydro({ client, address: '127.0.0.1', port: 8080 })
  t.is(c._type, 'container', '_type is container')
})

test('AntspaceHydro _getStatus returns ERROR when isErrored', (t) => {
  const client = createMockFetch()
  const c = new AntspaceHydro({ client })
  t.is(c._getStatus(true, true), RUNNING_STATUS.ERROR)
  t.is(c._getStatus(true, false), RUNNING_STATUS.ERROR)
})

test('AntspaceHydro _getStatus returns RUNNING when circulatingPump and not errored', (t) => {
  const client = createMockFetch()
  const c = new AntspaceHydro({ client })
  t.is(c._getStatus(false, true), RUNNING_STATUS.RUNNING)
})

test('AntspaceHydro _getStatus returns STOPPED when not circulating and not errored', (t) => {
  const client = createMockFetch()
  const c = new AntspaceHydro({ client })
  t.is(c._getStatus(false, false), RUNNING_STATUS.STOPPED)
})

test('AntspaceHydro _prepErrors maps known errors and sets isErrored', (t) => {
  const client = createMockFetch()
  const c = new AntspaceHydro({ client })
  const data = { power_fault: true, liquid_level_low: false }
  const { isErrored, errors } = c._prepErrors(data)
  t.ok(isErrored, 'isErrored true when fault present')
  t.ok(Array.isArray(errors), 'errors is array')
  t.ok(errors.some(e => e.name === 'power_fault'), 'power_fault mapped')
})

test('AntspaceHydro getSnap returns stats and config shape', async (t) => {
  const systemData = {
    circulating_pump: true,
    distribution_box1_power: 1000,
    distribution_box2_power: 2000,
    freezing_alarm: false,
    antbox_internal_temp: 25,
    antbox_internal_humidity: 50,
    supply_liquid_temp: 18,
    colding_tower_inlet_temp: 20,
    running_mode: 'auto',
    supply_liquid_set_temp: 17
  }
  const minerInfo = { model: 'S19', count: 1 }
  const client = createMockFetch(systemData, minerInfo)
  const c = new AntspaceHydro({ client, address: '127.0.0.1', port: 8080 })
  const snap = await c.getSnap()
  t.ok(snap, 'snap returned')
  t.ok(snap.stats, 'stats present')
  t.is(snap.stats.status, RUNNING_STATUS.RUNNING, 'status running when pump on')
  t.is(snap.stats.power_w, 3000, 'power_w sum of both boxes')
  t.ok(snap.stats.container_specific, 'container_specific present')
  t.alike(snap.stats.container_specific.miner_info, minerInfo, 'miner_info in container_specific')
  t.ok(snap.config?.container_specific, 'config.container_specific present')
  t.is(snap.config.container_specific.supply_liquid_temp, 18, 'supply_liquid_temp in config')
})
