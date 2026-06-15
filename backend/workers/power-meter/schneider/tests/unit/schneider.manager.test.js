'use strict'

const test = require('brittle')
const SchneiderManager = require('../../lib/schneider.manager')
const PM5340PowerMeterManager = require('../../lib/types/pm5340.powermeter.manager')
const P3U30PowerMeterManager = require('../../lib/types/p3u30.powermeter.manager')

test('SchneiderManager selectThingInfo exposes connection fields', (t) => {
  const m = new SchneiderManager({}, {
    rack: 'r1',
    storeDir: '/tmp',
    root: '/tmp'
  })
  const info = m.selectThingInfo({
    opts: { address: '10.0.0.1', port: 502, unitId: 3 }
  })
  t.is(info.address, '10.0.0.1')
  t.is(info.port, 502)
  t.is(info.unitId, 3)
})

test('SchneiderManager connectThing returns 0 when opts incomplete', async (t) => {
  const m = new SchneiderManager({}, {
    rack: 'r1',
    storeDir: '/tmp',
    root: '/tmp'
  })
  const thg = { opts: { address: '127.0.0.1' }, ctrl: null }
  const r = await m.connectThing(thg)
  t.is(r, 0)
  t.absent(thg.ctrl)
})

test('PM5340PowerMeterManager getThingType', (t) => {
  const m = new PM5340PowerMeterManager({}, {
    rack: 'rack-1',
    storeDir: '/tmp',
    root: '/tmp'
  })
  t.is(m.getThingType(), 'powermeter-schneider-pm5340')
})

test('P3U30PowerMeterManager getThingType', (t) => {
  const m = new P3U30PowerMeterManager({}, {
    rack: 'rack-1',
    storeDir: '/tmp',
    root: '/tmp'
  })
  t.is(m.getThingType(), 'powermeter-schneider-p3u30')
})
