'use strict'

// Shared boot primitives for the full-site example — worker specs, device
// seeding, config injection, pool driver, readiness wait, UI launcher. Used by
// both start.js (in-process, via an `kernel` handle) and backend/proc/* (out-of-
// process, via discovery); bootWorker() handles either.

const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const debug = require('debug')('mdk:example:full-site:site')
const { getKernel } = require('../../../backend/core/mdk')
const { publishWorkerKey, keysDir } = require('../../../backend/core/mdk/lib/local-discovery')
const { PORTS, HOST } = require('../mocks')

const { startWhatsminerWorker } = require('../../../backend/workers/miners/whatsminer')
const { startAntminerWorker } = require('../../../backend/workers/miners/antminer')
const { startAvalonWorker } = require('../../../backend/workers/miners/avalon')
const { startAntspaceWorker } = require('../../../backend/workers/containers/antspace')
const { startBitdeerWorker } = require('../../../backend/workers/containers/bitdeer')
const { startAbbWorker } = require('../../../backend/workers/power-meter/abb')
const { startSatecWorker } = require('../../../backend/workers/power-meter/satec')
const { startSchneiderWorker } = require('../../../backend/workers/power-meter/schneider')
const { startOceanPoolWorker } = require('../../../backend/workers/minerpools/ocean')
const { startF2poolWorker } = require('../../../backend/workers/minerpools/f2pool')
const { startSenecaWorker } = require('../../../backend/workers/temperature/seneca')

const bitdeerMock = require(path.join(__dirname, '..', '..', '..', 'backend', 'workers', 'containers', 'bitdeer', 'mock', 'server'))

const WORKERS_SRC = path.join(__dirname, '..', '..', '..', 'backend', 'workers')
const ROOT = path.join(__dirname, '..', '.mdk-data')

const HTTP_PORT = Number(process.env.MDK_HTTP_PORT) || 3007
const UI_PORT = Number(process.env.MDK_UI_PORT) || 3040
const MCP_PORT = Number(process.env.MDK_MCP_PORT) || 3008

const CONTAINER_ANTSPACE = 'container-antspace'
const CONTAINER_BITDEER = 'container-bitdeer'
const BITDEER_MQTT_ID = 'C024_D40'

const DEFAULT_MINER_COUNT = 10
const MINER_FAMILIES = 3
const PDU_COUNT = 5
const POOL_ACCOUNT = 'sample-ocean-account'
const F2POOL_ACCOUNT = 'sample-f2pool-account'
const POOL_TICK_MS = 10000

const SENSOR_CONTAINERS = [
  { id: 'site-sensor-antspace', container: CONTAINER_ANTSPACE, port: PORTS.SENSOR_BASE },
  { id: 'site-sensor-bitdeer', container: CONTAINER_BITDEER, port: PORTS.SENSOR_BASE + 1 }
]

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

function pduPos (i, count, offset = 0) {
  const socketsPerPdu = Math.max(1, Math.ceil(count / PDU_COUNT))
  const idx = i + offset
  const pdu = Math.floor(idx / socketsPerPdu) + 1
  const socket = (idx % socketsPerPdu) + 1
  return `${pdu}_${socket}`
}

// Runtime-hosted worker: seed data, not registerThing calls — passed to
// startWhatsminerWorker as seedDevices and applied only to an empty store.
// Shares CONTAINER_ANTSPACE with the antminer family — offset by `count` so
// the two families occupy distinct PDU positions in the same rack.
function seedWhatsminers (minerCount) {
  const count = minerCount || DEFAULT_MINER_COUNT
  return Array.from({ length: count }, (_, i) => ({
    id: `whatsminer-${i}`,
    info: { container: CONTAINER_ANTSPACE, pos: pduPos(i, count, count), serialNum: `WM-${String(i).padStart(4, '0')}` },
    opts: { address: HOST, port: PORTS.MINER_BASE + i, password: 'admin' }
  }))
}

function seedAntminers (minerCount) {
  const count = minerCount || DEFAULT_MINER_COUNT
  return Array.from({ length: count }, (_, i) => ({
    id: `antminer-${i}`,
    info: { container: CONTAINER_ANTSPACE, pos: pduPos(i, count), serialNum: `AM-${String(i).padStart(4, '0')}` },
    opts: { address: HOST, port: PORTS.ANTMINER_BASE + i, username: 'root', password: 'root' }
  }))
}

function seedAvalonMiners (minerCount) {
  const count = minerCount || DEFAULT_MINER_COUNT
  return Array.from({ length: count }, (_, i) => ({
    id: `avalon-${i}`,
    info: { container: CONTAINER_BITDEER, pos: pduPos(i, count), serialNum: `AV-${String(i).padStart(4, '0')}` },
    opts: { address: HOST, port: PORTS.AVALON_BASE + i, password: 'admin' }
  }))
}

function seedAntspaceContainer () {
  return [{
    id: CONTAINER_ANTSPACE,
    info: { container: CONTAINER_ANTSPACE, serialNum: 'HK3-001' },
    opts: { address: HOST, port: PORTS.ANTSPACE }
  }]
}

function seedBitdeerContainer () {
  return [{
    id: CONTAINER_BITDEER,
    info: { container: CONTAINER_BITDEER, serialNum: 'D40-A1346-001' },
    opts: { containerId: BITDEER_MQTT_ID }
  }]
}

function seedPowermeter () {
  return [{
    id: 'site-powermeter',
    info: { pos: 'site' },
    opts: { address: HOST, port: PORTS.POWERMETER, unitId: 1 }
  }]
}

function seedSatecPowermeter () {
  return [{
    id: 'site-satec-powermeter',
    info: { pos: 'site' },
    opts: { address: HOST, port: PORTS.SATEC_POWERMETER, unitId: 1 }
  }]
}

function seedSchneiderPowermeter () {
  return [{
    id: 'site-schneider-powermeter',
    info: { pos: 'site' },
    opts: { address: HOST, port: PORTS.SCHNEIDER_POWERMETER, unitId: 1 }
  }]
}

function seedSenecaSensors () {
  return SENSOR_CONTAINERS.map((s) => ({
    id: s.id,
    info: { container: s.container, pos: 'inlet', serialNum: `SEN-${s.container}` },
    opts: { address: HOST, port: s.port, unitId: 0, register: 3 }
  }))
}

// Bitdeer mock is an MQTT client — start it after the worker's broker is up.
function startBitdeerMock () {
  const bitdeerDir = path.join(WORKERS_SRC, 'containers', 'bitdeer')
  process.chdir(bitdeerDir)
  const handle = bitdeerMock.createServer({
    host: HOST,
    port: PORTS.BITDEER_MQTT,
    type: 'd40_a1346',
    id: BITDEER_MQTT_ID
  })
  debug('started bitdeer mock (MQTT client → %s:%d, id=%s)', HOST, PORTS.BITDEER_MQTT, BITDEER_MQTT_ID)
  return handle
}

// One worker per device family, each hosted on the WorkerRuntime through its
// package's plugin boot. workerId is fixed so the persistent store and RPC
// seed are reused on every restart. `name` is the short CLI/argv token.
const WORKER_SPECS = [
  { name: 'whatsminer', workerId: 'whatsminer-worker', boot: startWhatsminerWorker, model: 'm56s', pkg: 'miners/whatsminer', seed: seedWhatsminers },
  { name: 'antminer', workerId: 'antminer-worker', boot: startAntminerWorker, model: 's19xp', pkg: 'miners/antminer', seed: seedAntminers },
  { name: 'avalon', workerId: 'avalon-worker', boot: startAvalonWorker, model: 'a1346', pkg: 'miners/avalon', seed: seedAvalonMiners },
  { name: 'antspace', workerId: 'antspace-worker', boot: startAntspaceWorker, model: 'hk3', pkg: 'containers/antspace', seed: seedAntspaceContainer },
  { name: 'bitdeer', workerId: 'bitdeer-worker', boot: startBitdeerWorker, model: 'a1346', pkg: 'containers/bitdeer', seed: seedBitdeerContainer, mqttPort: PORTS.BITDEER_MQTT, afterBoot: startBitdeerMock },
  { name: 'abb', workerId: 'powermeter-worker', boot: startAbbWorker, model: 'b23', pkg: 'power-meter/abb', seed: seedPowermeter },
  { name: 'satec', workerId: 'satec-powermeter-worker', boot: startSatecWorker, model: 'pm180', pkg: 'power-meter/satec', seed: seedSatecPowermeter },
  { name: 'schneider', workerId: 'schneider-powermeter-worker', boot: startSchneiderWorker, model: 'pm5340', pkg: 'power-meter/schneider', seed: seedSchneiderPowermeter },
  { name: 'seneca', workerId: 'seneca-sensor-worker', boot: startSenecaWorker, noModelOpt: true, pkg: 'temperature/seneca', seed: seedSenecaSensors },
  { name: 'minerpool', workerId: 'minerpool-worker', boot: startOceanPoolWorker, pkg: 'minerpools/ocean', pool: true, poolKey: 'ocean', poolConf: () => ({ apiUrl: `http://${HOST}:${PORTS.POOL}`, accounts: [POOL_ACCOUNT] }) },
  { name: 'f2pool', workerId: 'f2pool-worker', boot: startF2poolWorker, pkg: 'minerpools/f2pool', pool: true, poolKey: 'f2pool', poolConf: () => ({ apiUrl: `http://${HOST}:${PORTS.F2POOL}`, apiSecret: 'secret-key', accounts: [F2POOL_ACCOUNT] }) }
]

function workerSpec (name) {
  return WORKER_SPECS.find((s) => s.name === name || s.workerId === name) || null
}

// --- pool driver -------------------------------------------------------------

// The Ocean worker runs on a 1m/5m cron — too slow to watch. Drive its real
// fetch/save on a demo cadence so stats populate within seconds. Non-overlapping.
function drivePool (pool) {
  let running = false
  const tick = async () => {
    if (running) return
    running = true
    try {
      const now = new Date()
      await pool.fetchWorkers(now)
      await pool.fetchStats(now)
      await pool.saveStats(now)
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

// --- Kernel + worker boot --------------------------------------------------------

// Start the Kernel over HRPC. `mode`: 'local' (register workers by
// the RPC keys they publish to the shared dir) or 'dht' (Hyperswarm topic; the
// optional `topic` pins it).
async function bootKernel ({ root, topic, mode = 'local' }) {
  const opts = {
    root,
    storeDir: path.join(root, 'kernel-db')
  }
  if (mode === 'local') {
    opts.discovery = { mode: 'local' }
  } else {
    opts.topicFile = path.join(root, '.dht-topic')
    if (topic) opts.topic = topic
  }
  return getKernel(opts)
}

// Boot one worker on the WorkerRuntime (Worker Plugin on @tetherto/mdk-worker,
// no manager class). Same discovery contract for every family: in-process
// `kernel` handle → register by key; `local` → publish the RPC key to the
// shared keys dir; `dht` → join the topic. Thing workers seed at boot from
// spec.seed(minerCount) data and only when the persistent provisioning store
// is empty; pool workers take their conf directly and get the demo pacer.
async function bootWorker (spec, { kernel, kernelTopic, root, minerCount, mode = 'local' }) {
  const storeDir = path.join(root, 'workers', spec.workerId, 'store')
  fs.mkdirSync(storeDir, { recursive: true })

  const opts = {
    workerId: spec.workerId,
    storeDir,
    kernelTopic: (!kernel && mode !== 'local') ? kernelTopic : null
  }

  if (spec.pool) {
    opts.rack = 'site-1'
    opts.conf = { [spec.poolKey]: spec.poolConf() }
  } else if (spec.plain) {
    // Third-party plugin demo: no worker-infra conf/model plumbing — the boot
    // takes only the runtime device list and keeps its own SQLite under storeDir.
    opts.seedDevices = spec.seed(minerCount)
  } else {
    // Package example config (alerts, thresholds) overlaid with the
    // demo-fast intervals.
    const examplePath = path.join(WORKERS_SRC, spec.pkg, 'config', 'base.thing.json.example')
    let base = {}
    try { base = JSON.parse(fs.readFileSync(examplePath, 'utf8')) } catch {}
    opts.conf = { thing: { ...base, ...THING_CONF, allowDuplicateIPs: true } }
    opts.seedDevices = spec.seed(minerCount)
    if (!spec.noModelOpt) opts.model = spec.model
    if (spec.mqttPort) opts.mqttPort = spec.mqttPort
  }

  const handle = await spec.boot(opts)

  const rpcKey = handle.runtime.getPublicKey().toString('hex')
  if (kernel) {
    await kernel.registerWorker(handle.runtime.getPublicKey())
    if (Array.isArray(kernel._cleanup)) kernel._cleanup.push(() => handle.stop())
  } else {
    if (mode === 'local') publishWorkerKey(keysDir(root), spec.workerId, rpcKey)
    const stop = () => { handle.stop().finally(() => process.exit(0)) }
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
  }

  const mockHandle = spec.afterBoot ? spec.afterBoot() : null

  if (spec.pool) {
    // Scheduler-driven pool worker — no things to seed; just pace it.
    drivePool(handle.pool)
    debug('%s pool driver started', spec.workerId)
    return { ...handle, seeded: 0, mockHandle }
  }

  if (spec.plain) {
    debug('%s booted on the bare worker runtime (%d device(s), sqlite: %s)',
      spec.workerId, handle.deviceIds.length, handle.dbPath)
    return { ...handle, mockHandle }
  }

  debug('%s booted on the worker runtime (%d device(s), seeded %d)',
    spec.workerId, handle.services.provisioning.listDeviceIds().length, handle.seeded)
  return { ...handle, mockHandle }
}

// --- readiness + UI -----------------------------------------------------------

async function waitForReady ({ port, minerCount, timeoutMs }) {
  const perFamily = minerCount || DEFAULT_MINER_COUNT
  const want = perFamily * MINER_FAMILIES
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

function startMcpServer ({ root, port } = {}) {
  const child = spawn('node', [path.join(__dirname, 'proc', 'mcp-server.js'), '--root', root || ROOT, '--port', String(port || MCP_PORT)], {
    stdio: 'inherit'
  })
  child.on('error', (err) => debug('mcp-server failed to start: %s', err.message))
  return child
}

module.exports = {
  WORKERS_SRC,
  ROOT,
  HTTP_PORT,
  UI_PORT,
  MCP_PORT,
  CONTAINER_ANTSPACE,
  CONTAINER_BITDEER,
  BITDEER_MQTT_ID,
  DEFAULT_MINER_COUNT,
  MINER_FAMILIES,
  PDU_COUNT,
  THING_CONF,
  PORTS,
  HOST,
  WORKER_SPECS,
  workerSpec,
  seedWhatsminers,
  seedAntminers,
  seedAvalonMiners,
  seedAntspaceContainer,
  seedBitdeerContainer,
  seedPowermeter,
  seedSatecPowermeter,
  seedSchneiderPowermeter,
  seedSenecaSensors,
  F2POOL_ACCOUNT,
  SENSOR_CONTAINERS,
  startBitdeerMock,
  drivePool,
  bootKernel,
  bootWorker,
  waitForReady,
  startUi,
  startMcpServer
}
