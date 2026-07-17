'use strict'

const fs = require('fs')
const test = require('brittle')
const path = require('path')
const { runServer, runAutoExit } = require('../../utils/test-harness')

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..')
const PKG_DIR = path.resolve(__dirname, '..')
const CONFIG_PATH = path.join(PKG_DIR, 'config', 'mdk.config.json')

function withConfig (cfg, fn) {
  return async (t) => {
    const existed = fs.existsSync(CONFIG_PATH)
    const backup = existed ? fs.readFileSync(CONFIG_PATH, 'utf8') : null
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg))
    t.teardown(() => {
      if (backup !== null) {
        fs.writeFileSync(CONFIG_PATH, backup)
      } else {
        fs.rmSync(CONFIG_PATH, { force: true })
      }
    })
    await fn(t)
  }
}

const MINIMAL_CONFIG = {
  mode: 'single-process',
  noAuth: true,
  services: [
    { name: 'kernel', kind: 'kernel' },
    { name: 'gateway', kind: 'gateway', port: 3777 }
  ]
}

test('index.js: boots kernel and gateway, announces ready', { timeout: 60000 }, withConfig(
  MINIMAL_CONFIG,
  async (t) => {
    const result = await runServer(PKG_DIR, REPO_ROOT, 'index.js', 'Press Ctrl+C to stop.', 55000)
    t.ok(result.ok, result.reason || 'ready marker appeared')
  }
))

test('index.js: exits non-zero when mode is not single-process', { timeout: 10000 }, withConfig(
  { mode: 'microservices', services: [{ name: 'kernel', kind: 'kernel' }] },
  async (t) => {
    const result = await runAutoExit(PKG_DIR, REPO_ROOT, 'index.js', 8000)
    t.absent(result.ok, 'exits with non-zero code for wrong mode')
    t.ok(result.output.includes('ERR_MODE'), result.output)
  }
))

test('index.js: exits non-zero when services array is empty', { timeout: 10000 }, withConfig(
  { mode: 'single-process', services: [] },
  async (t) => {
    const result = await runAutoExit(PKG_DIR, REPO_ROOT, 'index.js', 8000)
    t.absent(result.ok, 'exits with non-zero code for empty services')
    t.ok(result.output.includes('ERR_SERVICES'), result.output)
  }
))
