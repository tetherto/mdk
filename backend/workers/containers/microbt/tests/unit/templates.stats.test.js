'use strict'

const { test } = require('brittle')
const libStats = require('../../lib/templates/stats')

test('stats module exports specs', (t) => {
  t.ok(libStats.specs, 'specs exists')
})

test('stats specs.container extends container_default', (t) => {
  t.ok(libStats.specs.container !== undefined, 'container spec defined')
  t.ok(libStats.specs.container_default !== undefined, 'container_default from base')
})

test('stats specs.container has container_specific_stats_group op', (t) => {
  const containerSpec = libStats.specs.container
  t.ok(containerSpec.ops, 'has ops')
  t.ok(containerSpec.ops.container_specific_stats_group, 'has container_specific_stats_group')
  t.is(containerSpec.ops.container_specific_stats_group.op, 'group_multiple_stats', 'op is group_multiple_stats')
  t.ok(Array.isArray(containerSpec.ops.container_specific_stats_group.srcs), 'srcs is array')
})

test('stats container_specific_stats_group has expected srcs', (t) => {
  const group = libStats.specs.container.ops.container_specific_stats_group
  const names = group.srcs.map(s => s.name)
  t.ok(names.includes('unit_inlet_pressure_p2_group'), 'has unit_inlet_pressure_p2_group')
  t.ok(names.includes('filter_pressure_difference_group'), 'has filter_pressure_difference_group')
  t.ok(names.includes('cooling_temp_t1_group'), 'has cooling_temp_t1_group')
  t.ok(typeof group.group === 'function', 'group is a function')
})
