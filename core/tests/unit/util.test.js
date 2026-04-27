'use strict'

const { test } = require('brittle')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { createFacs } = require('../../lib/utils')

test('createFacs starts facilities and returns interval_0, store_s1, actionApprover_0', async (t) => {
  const tmpDir = path.join(os.tmpdir(), 'm-sdk-be-test-' + Date.now() + '-' + Math.random().toString(36).slice(2))
  const storeDir = path.join(tmpDir, 'store')
  fs.mkdirSync(storeDir, { recursive: true })
  t.teardown(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch (_) {}
  })

  const facs = await createFacs(storeDir)
  t.ok(facs, 'facs returned')
  t.ok(facs.interval_0, 'has interval_0')
  t.ok(facs.store_s1, 'has store_s1')
  t.ok(facs.actionApprover_0, 'has actionApprover_0')
  t.is(Object.keys(facs).length, 3, 'has exactly three facilities')
})

test('createFacs accepts optional ctx', async (t) => {
  const tmpDir = path.join(os.tmpdir(), 'm-sdk-be-test-' + Date.now() + '-' + Math.random().toString(36).slice(2))
  const storeDir = path.join(tmpDir, 'store')
  fs.mkdirSync(storeDir, { recursive: true })
  t.teardown(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch (_) {}
  })
  const ctx = { foo: 'bar' }

  const facs = await createFacs(storeDir, ctx)
  t.ok(facs, 'facs returned with ctx')
})
