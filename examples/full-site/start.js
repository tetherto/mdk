'use strict'

// Full-site MDK example — single boot script. Over HRPC only (no IPC):
//   ORK → 4 real workers from backend/workers (each driving its own mock device
//   server: Whatsminer TCP, Modbus container/powermeter, Ocean REST) → app-node
//   (mdkClient + full-site plugin) → UI. The real device drivers run their
//   genuine connect/collect/command paths against the mocks, not hardware.
//
// State persists under .mdk-data (stable ORK + worker keys, devices seeded once,
// tail-log history), so re-running resumes the same site.
//
// For per-component process control, use the CLI instead (`node cli.js`); both
// share the boot primitives in backend/site.js.

const path = require('path')
const { startAppNode } = require('../../backend/core/mdk')
const { startMocks } = require('./mocks')
const {
  ROOT,
  HTTP_PORT,
  UI_PORT,
  DEFAULT_MINER_COUNT,
  WORKER_SPECS,
  bootOrk,
  bootWorker,
  waitForReady,
  startUi
} = require('./backend/site')

const NO_UI = process.argv.includes('--no-ui')

async function main () {
  console.log('\n  MDK full-site example — booting (data dir: %s)\n', ROOT)

  const mocks = startMocks({ minerCount: DEFAULT_MINER_COUNT })
  console.log('  Mock devices up: %d miners + container + powermeter + pool', DEFAULT_MINER_COUNT)

  const ork = await bootOrk({ root: ROOT })
  const orkKey = ork.getPublicKey().toString('hex')
  console.log('  ORK ready — HRPC key %s…', orkKey.slice(0, 16))

  let anySeeded = false
  for (const spec of WORKER_SPECS) {
    const { seeded } = await bootWorker(spec, { ork, root: ROOT, minerCount: DEFAULT_MINER_COUNT })
    if (seeded) anySeeded = true
  }

  // First boot seeds devices after the worker registered (ORK saw zero), so
  // re-pull identities to sync the new device IDs. Later boots already have them.
  if (anySeeded) {
    await ork.dhtListener.refreshAll()
    await ork.dhtListener.refreshAll()
  }

  const workers = ork.registry.listWorkers()
  const totalDevices = workers.reduce((n, w) => n + (w.deviceIds ? w.deviceIds.length : 0), 0)
  console.log('  Workers registered: %d (%d devices)', workers.length, totalDevices)

  const appNode = await startAppNode({
    ork,
    noAuth: true,
    orkKey,
    orkIpc: false,
    extraPluginDirs: [path.join(__dirname, 'plugins', 'site')],
    port: HTTP_PORT,
    root: path.join(ROOT, 'app-node'),
    // env:test isolates the corestore under ROOT instead of a CWD-relative path.
    env: 'test'
  })
  console.log('  App-node ready — http://localhost:%d (HRPC → ORK, no IPC)', HTTP_PORT)

  const overview = await waitForReady({ port: HTTP_PORT, minerCount: DEFAULT_MINER_COUNT, timeoutMs: 60000 })
  if (overview) {
    console.log('  Site live: %d miners in %s, site power %d W, pool %s',
      overview.miners.length,
      overview.container && overview.container.id,
      overview.site.powerW,
      overview.pool && overview.pool.status)
  } else {
    console.log('  WARNING: site overview did not report %d miners within 60s', DEFAULT_MINER_COUNT)
  }

  let ui = null
  if (!NO_UI) {
    ui = startUi({ uiPort: UI_PORT, httpPort: HTTP_PORT })
    console.log('  UI starting — http://localhost:%d\n', UI_PORT)
  } else {
    console.log('  (UI skipped: --no-ui)\n')
  }

  // getOrk's shutdown drains ork._cleanup; tear down the UI child and mocks too.
  ork._cleanup.push(async () => { if (ui) ui.kill() })
  ork._cleanup.push(async () => mocks.close())

  return { ork, appNode, ui }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
