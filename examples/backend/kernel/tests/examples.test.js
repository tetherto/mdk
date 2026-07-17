'use strict'

const test = require('brittle')
const path = require('path')
const { runAutoExit, runServer } = require('../../utils/test-harness')

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const PKG_DIR = path.resolve(__dirname, '..')

test('demo.js: full feature parity demo exits cleanly', { timeout: 40000 }, async (t) => {
  const result = await runAutoExit(PKG_DIR, REPO_ROOT, 'demo.js', 35000)
  t.ok(result.ok, result.reason || 'exited with code 0')
})

test('command-flow.js: command reference boots and announces ready', { timeout: 40000 }, async (t) => {
  const result = await runServer(PKG_DIR, REPO_ROOT, 'command-flow.js', 'Ctrl+C to stop', 35000)
  t.ok(result.ok, result.reason || 'ready marker appeared')
})

test('telemetry-flow.js: telemetry flow shows live output', { timeout: 40000 }, async (t) => {
  const result = await runServer(PKG_DIR, REPO_ROOT, 'telemetry-flow.js', 'Live telemetry', 35000)
  t.ok(result.ok, result.reason || 'live telemetry marker appeared')
})

test('auth-whitelist.js: HRPC auth whitelist boots and announces ready', { timeout: 40000 }, async (t) => {
  const result = await runServer(PKG_DIR, REPO_ROOT, 'auth-whitelist.js', 'Ctrl+C to stop', 35000)
  t.ok(result.ok, result.reason || 'ready marker appeared')
})

test('kernel-shell.js: explicit lifecycle boots and announces ready', { timeout: 40000 }, async (t) => {
  const result = await runServer(PKG_DIR, REPO_ROOT, 'kernel-shell.js', 'Ctrl+C to stop', 35000)
  t.ok(result.ok, result.reason || 'ready marker appeared')
})
