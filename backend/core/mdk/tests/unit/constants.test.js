'use strict'

const { test } = require('brittle')
const {
  WRK_TYPES,
  MDK_ROOT,
  MDK_STORE,
  KERNEL_CLUSTER,
  LIB_TYPES
} = require('../../utils/constants')

test('constants expose expected string roots and cluster', (t) => {
  t.is(MDK_ROOT, 'tmp')
  t.is(MDK_STORE, 'store')
  t.is(KERNEL_CLUSTER, 'cluster-0')
})

test('WRK_TYPES maps to worker identifiers', (t) => {
  t.is(WRK_TYPES.Kernel, 'wrk-kernel')
  t.is(WRK_TYPES.GATEWAY, 'wrk-node-http')
})

test('LIB_TYPES lists supported library package paths', (t) => {
  t.is(LIB_TYPES.Kernel, 'core/kernel')
  t.is(LIB_TYPES.GATEWAY, 'core/gateway')
  t.ok(LIB_TYPES.ANTMINER && LIB_TYPES.WHATSMINER && LIB_TYPES.ANTSPACE)
  t.ok(Object.keys(LIB_TYPES).length >= 10)
})
