'use strict'

const test = require('brittle')
const AntminerManager = require('../../lib/antminer.manager.js')
const AntminerManagerS19xp = require('../../lib/types/s19xp.miner.manager.js')
const AntminerManagerS19xph = require('../../lib/types/s19xph.miner.manager.js')
const AntminerManagerS21 = require('../../lib/types/s21.miner.manager.js')
const AntminerManagerS21Pro = require('../../lib/types/s21pro.miner.manager.js')

const minimalCtx = { rack: 'test' }

function createManager (Conf = AntminerManager, conf = {}) {
  return new Conf(conf, minimalCtx)
}

test('AntminerManager getThingType appends -am', (t) => {
  const manager = createManager()
  const base = manager.getThingType()
  t.ok(base.endsWith('-am'), 'thing type ends with -am')
})

test('AntminerManager getThingTags returns antminer', (t) => {
  const manager = createManager()
  t.alike(manager.getThingTags(), ['antminer'])
})

test('AntminerManager getSpecTags returns miner', (t) => {
  const manager = createManager()
  t.alike(manager.getSpecTags(), ['miner'])
})

test('AntminerManager getMinerDefaultPort returns 80 when no conf', (t) => {
  const manager = createManager()
  t.is(manager.getMinerDefaultPort(), 80)
})

test('AntminerManager getMinerDefaultPort returns conf value when set', (t) => {
  const manager = createManager(AntminerManager, { thing: { minerDefaultPort: 8080 } })
  t.is(manager.getMinerDefaultPort(), 8080)
})

test('AntminerManager getNominalEficiencyWThs is callable without throwing', (t) => {
  const manager = createManager(AntminerManager, { thing: { miner: {} } })
  t.execution(() => manager.getNominalEficiencyWThs())
})

test('AntminerManagerS19xp getThingType returns miner-am-s19xp', (t) => {
  const manager = createManager(AntminerManagerS19xp)
  t.is(manager.getThingType(), 'miner-am-s19xp')
})

test('AntminerManagerS19xph getThingType returns miner-am-s19xp_h', (t) => {
  const manager = createManager(AntminerManagerS19xph)
  t.is(manager.getThingType(), 'miner-am-s19xp_h')
})

test('AntminerManagerS21 getThingType returns miner-am-s21', (t) => {
  const manager = createManager(AntminerManagerS21)
  t.is(manager.getThingType(), 'miner-am-s21')
})

test('AntminerManagerS21Pro getThingType returns miner-am-s21pro', (t) => {
  const manager = createManager(AntminerManagerS21Pro)
  t.is(manager.getThingType(), 'miner-am-s21pro')
})
