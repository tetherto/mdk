'use strict'

const test = require('brittle')
const path = require('path')
const { runServer } = require('../../../utils/test-harness')

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..')
const PKG_DIR = path.resolve(__dirname, '..')

test('avalon/index.js: Avalon miner site boots and announces ready', { timeout: 100000 }, async (t) => {
  const result = await runServer(PKG_DIR, REPO_ROOT, 'index.js', 'Ctrl+C to stop', 95000)
  t.ok(result.ok, result.reason || 'ready marker appeared')
})
