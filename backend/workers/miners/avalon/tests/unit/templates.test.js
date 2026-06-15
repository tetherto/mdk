'use strict'

const test = require('brittle')

test('stats template - exports libStats with miner spec set to miner_default', (t) => {
  const libStats = require('../../lib/templates/stats')

  t.ok(libStats, 'module exports something')
  t.ok(libStats.specs, 'has specs property')
  t.ok(libStats.specs.miner, 'has specs.miner')
  t.ok(libStats.specs.miner_default, 'has specs.miner_default')
  // The template sets specs.miner = specs.miner_default
  t.is(libStats.specs.miner, libStats.specs.miner_default)
})

test('alerts template - exports libAlerts with chips_temp_critical spec', (t) => {
  const libAlerts = require('../../lib/templates/alerts')

  t.ok(libAlerts, 'module exports something')
  t.ok(libAlerts.specs, 'has specs property')
  t.ok(libAlerts.specs.miner, 'has specs.miner')
  t.ok(libAlerts.specs.miner.chips_temp_critical, 'has chips_temp_critical alert')
})

test('alerts template - chips_temp_critical has valid and probe functions', (t) => {
  const libAlerts = require('../../lib/templates/alerts')
  const spec = libAlerts.specs.miner.chips_temp_critical

  t.is(typeof spec.valid, 'function')
  t.is(typeof spec.probe, 'function')
})

test('alerts template - chips_temp_critical.valid returns false for offline snap', (t) => {
  const libAlerts = require('../../lib/templates/alerts')
  const { valid } = libAlerts.specs.miner.chips_temp_critical

  const ctx = { conf: { chips_temp_critical: { params: { temp: 120 } } } }
  const offlineSnap = { stats: { status: 'offline' }, config: {} }

  t.absent(valid(ctx, offlineSnap))
})

test('alerts template - chips_temp_critical.valid returns false when conf is missing', (t) => {
  const libAlerts = require('../../lib/templates/alerts')
  const { valid } = libAlerts.specs.miner.chips_temp_critical

  const ctx = { conf: {} }
  const snap = { stats: { status: 'mining' }, config: {} }

  t.absent(valid(ctx, snap))
})

test('alerts template - chips_temp_critical.valid returns false for snap without stats or config', (t) => {
  const libAlerts = require('../../lib/templates/alerts')
  const { valid } = libAlerts.specs.miner.chips_temp_critical

  const ctx = { conf: { chips_temp_critical: { params: { temp: 120 } } } }

  // isValidSnap requires snap.stats && snap.config
  t.absent(valid(ctx, {}))
  t.absent(valid(ctx, { stats: { status: 'mining' } })) // missing config
  t.absent(valid(ctx, { config: {} })) // missing stats
})

test('alerts template - chips_temp_critical.valid returns true for valid mining snap with conf', (t) => {
  const libAlerts = require('../../lib/templates/alerts')
  const { valid } = libAlerts.specs.miner.chips_temp_critical

  const ctx = { conf: { chips_temp_critical: { params: { temp: 120 } } } }
  const snap = { stats: { status: 'mining' }, config: {} }

  t.ok(valid(ctx, snap))
})

test('alerts template - chips_temp_critical.probe returns false when no chip exceeds threshold', (t) => {
  const libAlerts = require('../../lib/templates/alerts')
  const { probe } = libAlerts.specs.miner.chips_temp_critical

  const ctx = { conf: { chips_temp_critical: { params: { temp: 120 } } } }
  const snap = {
    stats: {
      temperature_c: {
        chips: [
          { avg: 80 },
          { avg: 90 },
          { avg: 100 }
        ]
      }
    }
  }

  t.absent(probe(ctx, snap))
})

test('alerts template - chips_temp_critical.probe returns true when a chip exceeds threshold', (t) => {
  const libAlerts = require('../../lib/templates/alerts')
  const { probe } = libAlerts.specs.miner.chips_temp_critical

  const ctx = { conf: { chips_temp_critical: { params: { temp: 120 } } } }
  const snap = {
    stats: {
      temperature_c: {
        chips: [
          { avg: 80 },
          { avg: 121 }, // exceeds 120
          { avg: 100 }
        ]
      }
    }
  }

  t.ok(probe(ctx, snap))
})

test('alerts template - chips_temp_critical.probe returns false when chips array is missing', (t) => {
  const libAlerts = require('../../lib/templates/alerts')
  const { probe } = libAlerts.specs.miner.chips_temp_critical

  const ctx = { conf: { chips_temp_critical: { params: { temp: 120 } } } }
  const snap = { stats: { temperature_c: {} } }

  t.absent(probe(ctx, snap))
})

test('alerts template - miner spec inherits miner_default specs', (t) => {
  const libAlerts = require('../../lib/templates/alerts')
  const minerSpec = libAlerts.specs.miner
  const defaultSpec = libAlerts.specs.miner_default

  // All keys from miner_default should exist in miner
  for (const key of Object.keys(defaultSpec)) {
    t.ok(key in minerSpec, `miner spec should have key: ${key}`)
  }
})
