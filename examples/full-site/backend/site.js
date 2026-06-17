'use strict'

// Shared boot primitives for the full-site example — worker specs, device
// seeding, config injection, pool driver, readiness wait, UI launcher. Used by
// both start.js (in-process, via an `ork` handle) and backend/proc/* (out-of-
// process, via discovery); bootWorker() handles either.

const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const debug = require('debug')('mdk:example:full-site:site')
const { getOrk, startWorker } = require('../../../backend/core/mdk')
const { PORTS, HOST } = require('../mocks')

const { WM_M56S } = require('../../../backend/workers/miners/whatsminer')
const { MBT_KEHUA } = require('../../../backend/workers/containers/microbt')
const { ABB_B23 } = require('../../../backend/workers/power-meter/abb')
const { OCEAN_POOL } = require('../../../backend/workers/minerpools/ocean')

const WORKERS_SRC = path.join(__dirname, '..', '..', '..', 'backend', 'workers')
const ROOT = path.join(__dirname, '..', '.mdk-data')

const HTTP_PORT = Number(process.env.MDK_HTTP_PORT) || 3007
const UI_PORT = Number(process.env.MDK_UI_PORT) || 3040

const CONTAINER_ID = 'container-1'
const DEFAULT_MINER_COUNT = 100
const PDU_COUNT = 5
const POOL_ACCOUNT = 'tb1qqltm70wyz734t9k8d9w70uuhyxnemyh56d5ra8rtw082ytd7ywmsqudq5e'
const POOL_TICK_MS = 10000

// Demo-friendly cadence: collect a snap and store it to the tail-log every few
// seconds (the real defaults are 60s / 300s, too slow to watch live).
const THING_CONF = {
  collectSnapsItvMs: 5000,
  storeSnapItvMs: 5000,
  collectSnapTimeoutMs: 15000,
  logKeepCount: 5,
  thingRtdConcurrency: 500
}

// --- device seeding (real connection opts pointed at the mock ports) ---------

async function seedMiners (manager, minerCount) {
  const count = minerCount || DEFAULT_MINER_COUNT
  const socketsPerPdu = Math.max(1, Math.ceil(count / PDU_COUNT))
  for (let i = 0; i < count; i++) {
    const pdu = Math.floor(i / socketsPerPdu) + 1
    const socket = (i % socketsPerPdu) + 1
    await manager.registerThing({
      id: `miner-${i}`,
      info: { container: CONTAINER_ID, pos: `${pdu}_${socket}`, serialNum: `WM-${String(i).padStart(4, '0')}` },
      opts: { address: HOST, port: PORTS.MINER_BASE + i, password: 'admin' }
    })
  }
  return count
}

async function seedContainer (manager) {
  await manager.registerThing({
    id: CONTAINER_ID,
    info: { container: CONTAINER_ID },
    opts: { address: HOST, port: PORTS.CONTAINER, username: 'admin', password: 'admin' }
  })
  return 1
}

async function seedPowermeter (manager) {
  await manager.registerThing({
    id: 'site-powermeter',
    info: { pos: 'site' },
    opts: { address: HOST, port: PORTS.POWERMETER, unitId: 1 }
  })
  return 1
}

// One worker per device family. workerId is fixed so the persistent store and
// RPC seed are reused on every restart. `name` is the short CLI/argv token.
const WORKER_SPECS = [
  { name: 'miner', workerId: 'miner-worker', Manager: WM_M56S, pkg: 'miners/whatsminer', seed: seedMiners },
  { name: 'container', workerId: 'container-worker', Manager: MBT_KEHUA, pkg: 'containers/microbt', seed: seedContainer },
  { name: 'powermeter', workerId: 'powermeter-worker', Manager: ABB_B23, pkg: 'power-meter/abb', seed: seedPowermeter },
  { name: 'minerpool', workerId: 'minerpool-worker', Manager: OCEAN_POOL, pkg: 'minerpools/ocean', pool: true }
]

function workerSpec (name) {
  return WORKER_SPECS.find((s) => s.name === name || s.workerId === name) || null
}

// --- worker config injection -------------------------------------------------

// Pre-write the configs we need before startWorker copies the package examples:
// fast intervals for thing workers, ocean.json (apiUrl → mock) for the pool.
function prepWorkerConfig (spec, root) {
  const configDir = path.join(root, 'workers', spec.workerId, 'config')
  fs.mkdirSync(configDir, { recursive: true })

  if (spec.pool) {
    fs.writeFileSync(
      path.join(configDir, 'ocean.json'),
      JSON.stringify({ apiUrl: `http://${HOST}:${PORTS.POOL}`, accounts: [POOL_ACCOUNT] }, null, 2)
    )
    return
  }

  // Merge fast intervals over the package example so alert/threshold config is kept.
  const examplePath = path.join(WORKERS_SRC, spec.pkg, 'config', 'base.thing.json.example')
  let base = {}
  try { base = JSON.parse(fs.readFileSync(examplePath, 'utf8')) } catch {}
  fs.writeFileSync(path.join(configDir, 'base.thing.json'), JSON.stringify({ ...base, ...THING_CONF }, null, 2))
}

// --- pool driver -------------------------------------------------------------

// The Ocean worker runs on a 1m/5m cron — too slow to watch. Drive its real
// fetch/save on a demo cadence so stats populate within seconds. Non-overlapping.
function drivePool (manager) {
  let running = false
  const tick = async () => {
    if (running) return
    running = true
    try {
      const now = new Date()
      await manager.fetchWorkers(now)
      await manager.fetchStats(now)
      await manager.saveStats(now)
    } catch (e) {
      debug('pool tick error: %s', e.message)
    } finally {
      running = false
    }
  }
  tick()
  const timer = setInterval(tick, POOL_TICK_MS)
  timer.unref()
  return timer
}

// --- ORK + worker boot --------------------------------------------------------

// Start the ORK over HRPC only (no IPC). `mode`: 'local' (register workers by
// the RPC keys they publish to the shared dir) or 'dht' (Hyperswarm topic; the
// optional `topic` pins it).
async function bootOrk ({ root, topic, mode = 'local' }) {
  const opts = {
    root,
    storeDir: path.join(root, 'ork-db'),
    ipc: false
  }
  if (mode === 'local') {
    opts.discovery = { mode: 'local' }
  } else {
    opts.topicFile = path.join(root, '.dht-topic')
    if (topic) opts.topic = topic
  }
  return getOrk(opts)
}

// Boot one worker. In-process callers pass `ork`; out-of-process callers pick a
// discovery `mode`. Post-start steps (seeding, pool driver) are mode-independent.
async function bootWorker (spec, { ork, orkTopic, root, minerCount, mode = 'local' }) {
  prepWorkerConfig(spec, root)

  const startOpts = {
    root,
    rack: 'site-1',
    workerId: spec.workerId,
    workerPackagePath: path.join(WORKERS_SRC, spec.pkg)
  }
  if (ork) startOpts.ork = ork
  else if (mode === 'local') startOpts.discovery = { mode: 'local' }
  else startOpts.orkTopic = orkTopic

  const handle = await startWorker(spec.Manager, startOpts)
  const { manager } = handle

  if (spec.pool) {
    // Scheduler/EventEmitter worker — no things to seed; just pace it.
    drivePool(manager)
    debug('%s pool driver started', spec.workerId)
    return { ...handle, seeded: 0 }
  }

  // ThingManager workers run their snap-collecting interval only while active.
  // startWorker instantiates the manager without a wrk-base, so set it here.
  manager.active = true

  // Idempotent seeding: only on the first ever boot, when the persistent store
  // holds no things yet. On later boots they are reloaded by setupThings().
  let seeded = 0
  if (Object.keys(manager.mem.things).length === 0) {
    seeded = await spec.seed(manager, minerCount)
    debug('seeded %d device(s) into %s', seeded, spec.workerId)
  } else {
    debug('%s resumed with %d persisted device(s)', spec.workerId, Object.keys(manager.mem.things).length)
  }
  return { ...handle, seeded }
}

// --- readiness + UI -----------------------------------------------------------

async function waitForReady ({ port, minerCount, timeoutMs }) {
  const want = minerCount || DEFAULT_MINER_COUNT
  const url = `http://127.0.0.1:${port || HTTP_PORT}/site/overview`
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) {
        const body = await res.json()
        if (body && body.miners && body.miners.length >= want) return body
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return null
}

function startUi ({ uiPort, httpPort } = {}) {
  const child = spawn('npm', ['--prefix', path.join(__dirname, '..', 'ui'), 'run', 'dev', '--', '--port', String(uiPort || UI_PORT)], {
    stdio: 'inherit',
    env: Object.assign({}, process.env, { VITE_NO_AUTH: 'true', VITE_API_PORT: String(httpPort || HTTP_PORT) })
  })
  child.on('error', (err) => debug('ui failed to start: %s', err.message))
  return child
}

module.exports = {
  WORKERS_SRC,
  ROOT,
  HTTP_PORT,
  UI_PORT,
  CONTAINER_ID,
  DEFAULT_MINER_COUNT,
  PDU_COUNT,
  THING_CONF,
  PORTS,
  HOST,
  WORKER_SPECS,
  workerSpec,
  seedMiners,
  seedContainer,
  seedPowermeter,
  prepWorkerConfig,
  drivePool,
  bootOrk,
  bootWorker,
  waitForReady,
  startUi
}
