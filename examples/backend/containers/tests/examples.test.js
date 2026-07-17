'use strict'

const test = require('brittle')
const path = require('path')
const { runServer } = require('../../utils/test-harness')

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const PKG_DIR = path.resolve(__dirname, '..')

test('mdk.client.container.js: Antspace container worker boots and announces ready', { timeout: 40000 }, async (t) => {
  const result = await runServer(PKG_DIR, REPO_ROOT, 'mdk.client.container.js', 'Ctrl+C to stop', 35000)
  t.ok(result.ok, result.reason || 'ready marker appeared')
})
