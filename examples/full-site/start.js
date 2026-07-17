'use strict'

// Full-site MDK example — single boot script. Over HRPC:
//   Kernel → 11 real workers from backend/workers (3 miner families + 2 containers +
//   3 powermeters + 2 sensors + 2 pools, each driving mock device servers) → gateway → UI.
//
// State persists under .mdk-data (stable Kernel + worker keys, devices seeded once,
// tail-log history), so re-running resumes the same site.
//
// Flags: `--miners N` (default 10 per family → 30 total), `--no-ui`.

const path = require('path')
const fs = require('fs')

const { checkDeps } = require('./preflight')

const {
  ROOT,
  HTTP_PORT,
  UI_PORT,
  MCP_PORT,
  DEFAULT_MINER_COUNT,
  MINER_FAMILIES,
  WORKER_SPECS,
  bootKernel,
  bootWorker,
  waitForReady,
  startUi,
  startMcpServer
} = require('./backend/site')
const { minerCountFromArgv } = require('./backend/argv')

const NO_UI = process.argv.includes('--no-ui')
const MINER_COUNT = minerCountFromArgv(DEFAULT_MINER_COUNT)

checkDeps({ ui: !NO_UI })

const { startGateway } = require('../../backend/core/mdk')
const { startMocks } = require('./mocks')

function _closeMock (handle) {
  if (!handle) return
  const fn = handle.exit || handle.stop || handle.close
  if (typeof fn === 'function') {
    try { fn.call(handle) } catch {}
  }
}

async function main () {
  console.log('\n  MDK full-site example — booting (data dir: %s)\n', ROOT)

  const mocks = startMocks({ minerCount: MINER_COUNT })
  console.log('  Mock devices up: %d×3 miners + 2 containers + 3 powermeters + 2 sensors + 2 pools', MINER_COUNT)

  const kernel = await bootKernel({ root: ROOT })
  const kernelKey = kernel.getPublicKey().toString('hex')
  fs.writeFileSync(path.join(ROOT, '.kernel-key'), kernelKey)
  console.log('  Kernel ready — HRPC key %s…', kernelKey.slice(0, 16))

  const workerMocks = []
  let anySeeded = false
  for (const spec of WORKER_SPECS) {
    const { seeded, mockHandle } = await bootWorker(spec, { kernel, root: ROOT, minerCount: MINER_COUNT })
    if (seeded) anySeeded = true
    if (mockHandle) workerMocks.push(mockHandle)
  }

  if (anySeeded) {
    await kernel.dhtListener.refreshAll()
    await kernel.dhtListener.refreshAll()
  }

  const workers = kernel.registry.listWorkers()
  const totalDevices = workers.reduce((n, w) => n + (w.deviceIds ? w.deviceIds.length : 0), 0)
  console.log('  Workers registered: %d (%d devices)', workers.length, totalDevices)

  const gateway = await startGateway({
    kernel,
    noAuth: true,
    kernelKey,
    extraPluginDirs: [
      path.join(__dirname, 'plugins', 'site')
    ],
    port: HTTP_PORT,
    root: path.join(ROOT, 'gateway'),
    env: 'test'
  })
  console.log('  Gateway ready — http://localhost:%d (HRPC → Kernel)', HTTP_PORT)

  const wantMiners = MINER_COUNT * MINER_FAMILIES
  const overview = await waitForReady({ port: HTTP_PORT, minerCount: MINER_COUNT, timeoutMs: 90000 })
  if (overview) {
    const containerIds = (overview.containers || []).map((c) => c.id).join(', ')
    console.log('  Site live: %d miners, containers [%s], site power %d W, %d pool(s)',
      overview.miners.length,
      containerIds,
      overview.site.powerW,
      (overview.pools || []).length)
  } else {
    console.log('  WARNING: site overview did not report %d miners within 90s', wantMiners)
  }

  let ui = null
  if (!NO_UI) {
    ui = startUi({ uiPort: UI_PORT, httpPort: HTTP_PORT })
    console.log('  UI starting — http://localhost:%d', UI_PORT)
  } else {
    console.log('  (UI skipped: --no-ui)')
  }

  const mcpServer = startMcpServer({ root: ROOT, port: MCP_PORT })
  console.log('  MCP server starting — http://localhost:%d/mcp\n', MCP_PORT)

  kernel._cleanup.push(async () => { if (ui) ui.kill() })
  kernel._cleanup.push(async () => { mcpServer.kill() })
  kernel._cleanup.push(async () => {
    for (const h of workerMocks) _closeMock(h)
    mocks.close()
  })

  return { kernel, gateway, ui, mcpServer }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
