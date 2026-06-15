'use strict'

const fs = require('fs')
const path = require('path')
const os = require('os')

/**
 * Creates a temp root with config/base.thing.json and an empty store dir.
 * @param {object} [thingConfigOverrides]
 * @returns {{ root: string, storeDir: string }}
 */
function createTestRoot (thingConfigOverrides = {}) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'powermeter-schneider-test-')
  )
  const configDir = path.join(root, 'config')
  fs.mkdirSync(configDir, { recursive: true })

  const base = {
    collectSnapTimeoutMs: 120000,
    _idFile: '',
    collectSnapsItvMs: 2000,
    logRotateMaxLength: 10000,
    logKeepCount: 3,
    powermeter: { timeout: 30000 },
    ...thingConfigOverrides
  }
  fs.writeFileSync(
    path.join(configDir, 'base.thing.json'),
    JSON.stringify(base, null, 2),
    'utf8'
  )

  const storeDir = path.join(root, 'store')
  fs.mkdirSync(storeDir, { recursive: true })

  return { root, storeDir }
}

function cleanupTestRoot (root) {
  try {
    fs.rmSync(root, { recursive: true, force: true })
  } catch (_) {}
}

async function waitForThingSnap (manager, predicate, timeoutMs = 45000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    for (const thg of Object.values(manager.mem.things)) {
      const snap = thg.last?.snap
      if (snap && predicate(snap)) return { thg, snap }
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('ERR_TEST_SNAP_TIMEOUT')
}

module.exports = {
  createTestRoot,
  cleanupTestRoot,
  waitForThingSnap
}
