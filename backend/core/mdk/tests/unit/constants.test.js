'use strict'

const { test } = require('brittle')
const {
  WRK_TYPES,
  MDK_ROOT,
  MDK_STORE,
  ORK_CLUSTER,
  LIB_TYPES
} = require('../../utils/constants')

test('constants expose expected string roots and cluster', (t) => {
  t.is(MDK_ROOT, 'tmp')
  t.is(MDK_STORE, 'store')
  t.is(ORK_CLUSTER, 'cluster-0')
})

test('WRK_TYPES maps to worker identifiers', (t) => {
  t.is(WRK_TYPES.ORK, 'wrk-ork')
  t.is(WRK_TYPES.APP_NODE, 'wrk-node-http')
})

test('LIB_TYPES lists supported library package paths', (t) => {
  t.is(LIB_TYPES.ORK, 'core/ork')
  t.is(LIB_TYPES.APP_NODE, 'core/app-node')
  t.ok(LIB_TYPES.ANTMINER && LIB_TYPES.WHATSMINER && LIB_TYPES.ANTSPACE)
  t.ok(Object.keys(LIB_TYPES).length >= 10)
})
