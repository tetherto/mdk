'use strict'

const fs = require('fs')
const test = require('brittle')
const path = require('path')
const { runAutoExit } = require('../../utils/test-harness')

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

test('index.js: exits non-zero for unsupported runtime', { timeout: 10000 }, withConfig(
  { runtime: '__test_unsupported__' },
  async (t) => {
    const result = await runAutoExit(PKG_DIR, REPO_ROOT, 'index.js', 8000)
    t.absent(result.ok, 'exits with non-zero code')
    t.ok(result.output.includes('Unsupported runtime'), result.output)
  }
))

test('index.js: exits non-zero when config.json is missing', { timeout: 10000 }, async (t) => {
  const existed = fs.existsSync(CONFIG_PATH)
  const backup = existed ? fs.readFileSync(CONFIG_PATH, 'utf8') : null
  if (existed) fs.rmSync(CONFIG_PATH)
  t.teardown(() => {
    if (backup !== null) fs.writeFileSync(CONFIG_PATH, backup)
  })

  const result = await runAutoExit(PKG_DIR, REPO_ROOT, 'index.js', 8000)
  t.absent(result.ok, 'exits with non-zero code when config is absent')
})
