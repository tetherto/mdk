'use strict'

const test = require('brittle')
const path = require('path')
const { runAutoExit, runServer } = require('../../utils/test-harness')

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const PKG_DIR = path.resolve(__dirname, '..')

test('run.js: single-process E2E exits cleanly', { timeout: 50000 }, async (t) => {
  const result = await runAutoExit(PKG_DIR, REPO_ROOT, 'run.js', 45000)
  t.ok(result.ok, result.reason || 'exited with code 0')
})

test('server.js: interactive server boots and announces ready', { timeout: 40000 }, async (t) => {
  const result = await runServer(PKG_DIR, REPO_ROOT, 'server.js', 'Ctrl+C to stop', 35000)
  t.ok(result.ok, result.reason || 'ready marker appeared')
})
