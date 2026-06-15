'use strict'

const test = require('brittle')
const libAlerts = require('../../lib/templates/alerts')

test('cabinet_temp_high valid and fires when over threshold', (t) => {
  const spec = libAlerts.specs.sensor.cabinet_temp_high
  const ctx = {
    conf: { cabinet_temp_high: { params: { temp: 30 } } },
    info: { pos: 'rack_lv1' }
  }
  const snap = { stats: { status: 'ok', temp_c: 35 }, config: {} }
  t.ok(spec.valid(ctx, snap))
  t.ok(spec.probe(ctx, snap))
})

test('cabinet_temp_high not valid when temp is error sentinel 850', (t) => {
  const spec = libAlerts.specs.sensor.cabinet_temp_high
  const ctx = {
    conf: { cabinet_temp_high: { params: { temp: 30 } } },
    info: { pos: 'rack_lv1' }
  }
  const snap = { stats: { status: 'ok', temp_c: 850 }, config: {} }
  t.ok(!spec.valid(ctx, snap))
})

test('oil_temp_high requires tr position prefix', (t) => {
  const spec = libAlerts.specs.sensor.oil_temp_high
  const ctx = {
    conf: { oil_temp_high: { params: { temp: 40 } } },
    info: { pos: 'unit_tr2' }
  }
  const snap = { stats: { status: 'ok', temp_c: 50 }, config: {} }
  t.ok(spec.valid(ctx, snap))
  t.ok(spec.probe(ctx, snap))
})

test('oil_temp_critical probe below threshold', (t) => {
  const spec = libAlerts.specs.sensor.oil_temp_critical
  const ctx = {
    conf: { oil_temp_critical: { params: { temp: 90 } } },
    info: { pos: 'x_tr1' }
  }
  const snap = { stats: { status: 'ok', temp_c: 50 }, config: {} }
  t.ok(spec.valid(ctx, snap))
  t.ok(!spec.probe(ctx, snap))
})

test('stats template re-exports default specs', (t) => {
  const stats = require('../../lib/templates/stats')
  t.ok(stats.specs.default)
})
