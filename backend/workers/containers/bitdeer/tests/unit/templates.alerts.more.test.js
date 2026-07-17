'use strict'

const { test } = require('brittle')
const libAlerts = require('../../lib/templates/alerts')

const spec = libAlerts.specs.container.oil_min_inlet_temp_warn

function makeCtx (temp) {
  return { conf: { oil_min_inlet_temp_warn: { params: { temp } } } }
}

function makeSnap (pumps, status = 'running') {
  return {
    stats: {
      status,
      container_specific: { cooling_system: { oil_pump: pumps } }
    },
    config: {}
  }
}

test('oil_min_inlet_temp_warn valid requires conf, online snap and pumps', (t) => {
  const ctx = makeCtx(20)
  t.ok(spec.valid(ctx, makeSnap([{ cold_temp_c: 15 }])), 'valid with pumps and conf')
  t.absent(spec.valid(ctx, makeSnap([])), 'invalid without pumps')
  t.absent(spec.valid(ctx, makeSnap([{ cold_temp_c: 15 }], 'offline')), 'invalid when offline')
  t.absent(spec.valid({ conf: {} }, makeSnap([{ cold_temp_c: 15 }])), 'invalid without conf entry')
  t.absent(spec.valid(ctx, { stats: { status: 'running' } }), 'invalid snap shape')
})

test('oil_min_inlet_temp_warn probe compares cold temps to threshold', (t) => {
  const ctx = makeCtx(20)
  t.ok(spec.probe(ctx, makeSnap([{ cold_temp_c: 15 }, { cold_temp_c: 25 }])), 'alerts when any pump below threshold')
  t.absent(spec.probe(ctx, makeSnap([{ cold_temp_c: 25 }, { cold_temp_c: 30 }])), 'no alert above threshold')
})
