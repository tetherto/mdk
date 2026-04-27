'use strict'

const test = require('brittle')
const { EventEmitter } = require('events')

const ABBPowerMeterManager = require('../../lib/abb.powermeter.manager')

test('ABB manager selectThingInfo picks connection fields', t => {
  const mgr = Object.create(ABBPowerMeterManager.prototype)
  const thg = { opts: { address: '127.0.0.1', port: 5020, unitId: 1, other: true } }
  const info = mgr.selectThingInfo(thg)
  t.alike(info, { address: '127.0.0.1', port: 5020, unitId: 1 })
})

test('ABB manager connectThing validates required opts', async t => {
  const mgr = Object.create(ABBPowerMeterManager.prototype)
  mgr._createInstance = () => {
    throw new Error('should not create instance')
  }
  const connected = await mgr.connectThing({ opts: { address: '127.0.0.1' } })
  t.is(connected, 0)
})

test('ABB manager connectThing attaches controller on success', async t => {
  const mgr = Object.create(ABBPowerMeterManager.prototype)
  mgr.debugThingError = () => {}
  mgr.disconnectThing = async () => {}
  mgr._createInstance = () => new EventEmitter()

  const thg = { opts: { address: '127.0.0.1', port: 5020, unitId: 0 } }
  const connected = await mgr.connectThing(thg)

  t.is(connected, 1)
  t.ok(thg.ctrl, 'controller is attached to thing')
})
