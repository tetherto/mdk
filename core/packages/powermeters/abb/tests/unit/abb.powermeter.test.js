'use strict'

const test = require('brittle')
const ABBPowerMeter = require('../../lib/abb.powermeter')

test('ABBPowerMeter requires getClient in constructor', t => {
  t.exception(() => {
    const meter = new ABBPowerMeter({ address: '127.0.0.1', port: 5020, unitId: 0 })
    return meter
  }, /ERR_NO_CLIENT/)
})

test('ABBPowerMeter readValues caches last successful payload', async t => {
  const payload = Buffer.from([0x01, 0x02, 0x03])
  let callCount = 0

  const meter = new ABBPowerMeter({
    address: '127.0.0.1',
    port: 5020,
    unitId: 0,
    conf: { cacheLimit: 2 },
    getClient: () => ({
      end () {}
    })
  })

  meter._readValues = async () => {
    callCount++
    if (callCount === 1) return payload
    throw new Error('boom')
  }

  const first = await meter.readValues()
  const second = await meter.readValues()
  const third = await meter.readValues()

  t.alike(first, payload, 'returns fresh value from device on first read')
  t.alike(second, payload, 'returns cache after first read error')
  t.alike(third, payload, 'returns cache while under cacheLimit')
})

test('ABBPowerMeter readValues throws when cache limit exceeded', async t => {
  const meter = new ABBPowerMeter({
    address: '127.0.0.1',
    port: 5020,
    unitId: 0,
    conf: { cacheLimit: 0 },
    getClient: () => ({
      end () {}
    })
  })

  meter._readValues = async () => {
    throw new Error('hard-failure')
  }

  await t.exception(meter.readValues(), /hard-failure/)
})
