'use strict'

const test = require('brittle')
const path = require('path')
const { runAutoExit } = require('../../utils/test-harness')

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const PKG_DIR = path.resolve(__dirname, '..')

test('mdk.client.ocean.js: ocean pool fetch exits cleanly', { timeout: 30000 }, async (t) => {
  const result = await runAutoExit(PKG_DIR, REPO_ROOT, 'mdk.client.ocean.js', 25000)
  t.ok(result.ok, result.reason || 'exited with code 0')
})
