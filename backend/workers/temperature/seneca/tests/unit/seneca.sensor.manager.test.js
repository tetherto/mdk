'use strict'

const test = require('brittle')
const SenecaSensorManager = require('../../lib/seneca.sensor.manager')
const TempSenecaSensorManager = require('../../lib/types/temp.seneca.sensor.manager.wrk')

test('SenecaSensorManager thing tags and spec tags', (t) => {
  const mgr = new SenecaSensorManager({}, { rack: 'r1' })
  t.alike(mgr.getThingTags(), ['temp', 'seneca'])
  t.alike(mgr.getSpecTags(), ['sensor'])
})

test('SenecaSensorManager getThingType', (t) => {
  const mgr = new SenecaSensorManager({}, { rack: 'r1' })
  t.is(mgr.getThingType(), 'sensor-temp-seneca')
})

test('TempSenecaSensorManager extends thing type', (t) => {
  const mgr = new TempSenecaSensorManager({}, { rack: 'r1' })
  t.is(mgr.getThingType(), 'sensor-temp-seneca-temp-seneca')
})

test('connectThing returns 0 when register is missing', async (t) => {
  const mgr = Object.create(SenecaSensorManager.prototype)
  mgr.modbus_0 = {
    getClient: () => ({
      read: async () => Buffer.alloc(2),
      end: () => {}
    })
  }
  const thg = { opts: { address: '127.0.0.1', port: 502, unitId: 0 } }
  const n = await mgr.connectThing(thg)
  t.is(n, 0)
  t.is(thg.ctrl, undefined)
})

test('connectThing wires SenecaSensor as ctrl', async (t) => {
  const mgr = Object.create(SenecaSensorManager.prototype)
  mgr.modbus_0 = {
    getClient: () => ({
      read: async () => Buffer.alloc(2),
      end: () => {}
    })
  }
  mgr.conf = { thing: { sensor: {} } }
  mgr.debugThingError = () => {}

  const thg = {
    opts: { address: '127.0.0.1', port: 502, unitId: 0, register: 3 }
  }
  const n = await mgr.connectThing(thg)
  t.is(n, 1)
  t.ok(thg.ctrl)
  t.is(typeof thg.ctrl.getSnap, 'function')
})

test('collectThingSnap delegates to ctrl.getSnap', async (t) => {
  const mgr = Object.create(SenecaSensorManager.prototype)
  const thg = {
    ctrl: {
      getSnap: async () => ({ success: true, stats: { status: 'ok' } })
    }
  }
  const snap = await mgr.collectThingSnap(thg)
  t.ok(snap.success)
})

test('selectThingInfo exposes connection fields', (t) => {
  const mgr = new SenecaSensorManager({}, { rack: 'r1' })
  const info = mgr.selectThingInfo({
    opts: { address: '10.0.0.1', port: 502, unitId: 7 }
  })
  t.alike(info, { address: '10.0.0.1', port: 502, unitId: 7 })
})
