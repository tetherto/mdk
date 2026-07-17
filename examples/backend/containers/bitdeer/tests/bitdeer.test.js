'use strict'

const test = require('brittle')
const path = require('path')
const { runServer } = require('../../../utils/test-harness')

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..')
const PKG_DIR = path.resolve(__dirname, '..')

test('bitdeer/index.js: Bitdeer container boots and announces ready', { timeout: 70000 }, async (t) => {
  const result = await runServer(PKG_DIR, REPO_ROOT, 'index.js', 'Ctrl+C to stop', 65000)
  t.ok(result.ok, result.reason || 'ready marker appeared')
})
