'use strict'

const { test } = require('brittle')
const libStats = require('../../lib/templates/stats')

test('stats has specs.container_default', (t) => {
  t.ok(libStats.specs, 'has specs')
  t.ok(libStats.specs.container_default !== undefined, 'container_default is set')
})

test('container_default has expected container ops', (t) => {
  const ops = libStats.specs.container_default.ops
  t.ok(ops, 'has ops')
  t.ok(ops.container_status, 'container_status op')
  t.ok(ops.container_power_w_sum, 'container_power_w_sum op')
  t.ok(ops.container_power_w, 'container_power_w op')
  t.ok(ops.container_nominal_hashrate_mhs_sum, 'container_nominal_hashrate_mhs_sum op')
  t.ok(ops.container_nominal_hashrate_mhs_avg, 'container_nominal_hashrate_mhs_avg op')
  t.ok(ops.container_nominal_efficiency_w_ths_avg, 'container_nominal_efficiency_w_ths_avg op')
  t.ok(ops.container_nominal_miner_capacity_sum, 'container_nominal_miner_capacity_sum op')
})

test('container_default extends default ops', (t) => {
  t.ok(libStats.specs.default !== undefined, 'default specs exist')
  t.ok(libStats.specs.container_default.ops.container_status, 'container-specific op present')
})
