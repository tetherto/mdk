'use strict'

const test = require('brittle')
const SchneiderPowerMeter = require('../../lib/schneider')

function meter (overrides = {}) {
  const calls = []
  const getClient = (conf) => {
    calls.push(conf)
    return { end: () => calls.push('end') }
  }
  return { calls, meter: new SchneiderPowerMeter({ getClient, address: '10.0.0.9', port: 502, unitId: 7, id: 'm', ...overrides }) }
}

test('the base meter needs a Modbus client factory', (t) => {
  t.exception(() => new SchneiderPowerMeter({ address: '10.0.0.9', port: 502, unitId: 7 }), /ERR_NO_CLIENT/)
})

test('the base meter opens one TCP client from its opts and ends it on close()', (t) => {
  const { calls, meter: m } = meter()
  t.is(calls[0].address, '10.0.0.9')
  t.is(calls[0].port, 502)
  t.is(calls[0].unitId, 7)
  m.close()
  t.is(calls[1], 'end')
})

test('a model class must implement _readValues; _prepSnap reads live or from the cache', async (t) => {
  const { meter: m } = meter()
  await t.exception(m._readValues(), /ERR_READ_VALUES_NO_IMPL/)
  await t.exception(m.readSnap(), /ERR_READ_VALUES_NO_IMPL/)
  m.cache = { stats: { power_w: 5 }, config: {} }
  t.alike(await m._prepSnap(true), { success: true, stats: { power_w: 5 }, config: {} })
})
