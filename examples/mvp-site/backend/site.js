'use strict'

// Shared boot primitives for the mvp-site example — device seeding, Kernel/Worker
// boot, mock servers. Used by deploy/run-process.js (one process per PM2 role); config
// values (ports, discovery mode, worker/mock settings) come from
// config/site.deploy.json, the single source of truth for this example's
// topology (root dir, discovery mode, ports, plugin/static dirs, and the PM2
// app list).

const path = require('path')
const fs = require('fs')
const debug = require('debug')('mdk:example:mvp-site')
const { getKernel } = require('@tetherto/mdk-core')
const { publishWorkerKey, keysDir } = require('@tetherto/mdk-core/lib/local-discovery')
const { startWhatsminerWorker } = require('./whatsminer-adapter')
const { startOceanPoolWorker } = require('@tetherto/mdk-worker-ocean')
const { startSatecWorker } = require('@tetherto/mdk-worker-satec')
const wmMock = require('whatsminer-mdk-worker/mock/api-v3-server')
const oceanMock = require('@tetherto/mdk-worker-ocean/mock/server')
const satecMock = require('@tetherto/mdk-worker-satec/mock/server')

const exampleDir = path.join(__dirname, '..')
const deploy = require(path.join(exampleDir, 'config', 'site.deploy.json'))

const ROOT = path.join(exampleDir, deploy.root)
const PLUGIN_DIRS = deploy.gateway.pluginDirs.map((p) => path.join(exampleDir, p))
const MCP_PLUGIN_DIRS = (deploy.mcp.agentTools?.pluginDirs || []).map((p) => path.join(exampleDir, p))
const STATIC_ROOT_PATH = path.join(exampleDir, deploy.gateway.staticRootPath)

const HOST = deploy.host
const MOCK_PORT_BASE = deploy.mocks.portBase
const SATEC_MOCK_PORT_BASE = deploy.satec.mocks.portBase
const GATEWAY_PORT = deploy.gateway.port
const GATEWAY_HOST = deploy.gateway.host
const MCP_AGENT_TOOLS_PORT = deploy.mcp.agentTools?.port
const DISCOVERY = deploy.discovery
const WORKER_ID = deploy.worker.id
const OCEAN_WORKER_ID = deploy.ocean.worker.id
const SATEC_WORKER_ID = deploy.satec.worker.id

// config/devices.json is gitignored (local/per-dev config) — see README "Seed devices".
// worker.pools is the default pool config; opts.conf.pools overrides per device.
const loadSeedDevices = () => {
  const devices = require(path.join(__dirname, '..', 'config', 'devices.json'))
  const assignPorts = (list, portBase) => (list || []).map((d, i) => ({
    ...d,
    opts: { ...d.opts, port: d.opts.port ?? portBase + i }
  }))
  const assignPools = (list) => deploy.worker.pools
    ? list.map((d) => ({
      ...d,
      opts: { ...d.opts, conf: { pools: deploy.worker.pools, ...d.opts.conf } }
    }))
    : list
  return {
    miners: assignPools(assignPorts(devices.miners, MOCK_PORT_BASE)),
    powermeters: assignPorts(devices.powermeters, SATEC_MOCK_PORT_BASE)
  }
}

// --- mock device servers ------------------------------------------------------

const mockHandles = (mocks) => {
  const ready = Promise.all(mocks.map((m) => m.ready))
  const close = () => { for (const m of mocks) { try { m.exit() } catch {} } }
  return { mocks, ready, close }
}

// whatsminer-mdk-worker's mock takes a raw state override (no type/serial
// shorthand) and exposes close() instead of exit() — normalize both here so
// mockHandles()/startMocks() callers don't need to know which mock backs them.
const startMocks = (miners) => {
  return mockHandles(miners.map((d) => {
    const mock = wmMock.createServer({
      port: d.opts.port,
      host: HOST,
      password: d.opts.password ?? deploy.mocks.defaultPassword,
      state: { deviceInfo: { miner: { type: deploy.mocks.type, 'miner-sn': d.info.serialNum } } }
    })
    return { ...mock, exit: () => mock.close() }
  }))
}

// Typical draw of one modern hydro/immersion ASIC (the m56s the mocks.type
// default seeds). Sizes the powermeter reading off the actual seeded miner
// fleet (config/devices.json) instead of a flat number that doesn't track it.
const AVG_MINER_POWER_W = 3400

const startSatecMocks = (powermeters, minerCount) => {
  const count = powermeters.length || 1
  const powerW = deploy.satec.mocks.powerW != null
    ? deploy.satec.mocks.powerW
    : (minerCount * AVG_MINER_POWER_W) / count
  return mockHandles(powermeters.map((d) => satecMock.createServer({
    port: d.opts.port,
    host: HOST,
    type: deploy.satec.worker.model,
    powerW
  })))
}

const startOceanMock = (minerCount) => {
  return mockHandles([oceanMock.createServer({
    port: deploy.ocean.mock.port,
    host: HOST,
    workerCount: minerCount
  })])
}

// --- Kernel + worker boot ------------------------------------------------------

// Start the Kernel over HRPC. `mode`: 'local' (register the worker by the RPC
// key it publishes to the shared dir) or 'dht' (Hyperswarm topic; `topic` pins it).
const bootKernel = async ({ root, topic, mode = DISCOVERY } = {}) => {
  const opts = { root, storeDir: path.join(root, 'kernel-db') }
  if (mode === 'local') {
    opts.discovery = { mode: 'local' }
  } else {
    opts.topicFile = path.join(root, '.dht-topic')
    if (topic) opts.topic = topic
  }
  return getKernel(opts)
}

const registerWorker = async (handle, workerId, { kernel, root, mode }) => {
  const rpcKey = handle.runtime.getPublicKey().toString('hex')
  if (kernel) {
    await kernel.registerWorker(handle.runtime.getPublicKey())
    if (Array.isArray(kernel._cleanup)) kernel._cleanup.push(() => handle.stop())
  } else {
    if (mode === 'local') publishWorkerKey(keysDir(root), workerId, rpcKey)
    const stop = () => { handle.stop().finally(() => process.exit(0)) }
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
  }
}

const workerStoreDir = (root, workerId) => {
  const storeDir = path.join(root, 'workers', workerId, 'store')
  fs.mkdirSync(storeDir, { recursive: true })
  return storeDir
}

// whatsminer-mdk-worker's device list is fixed at construction (no
// provisioning store), so model/allowDuplicateIPs/thing-timer config from the
// retired internal package no longer apply — pools already travel per-device
// via loadSeedDevices()'s opts.conf.pools.
const bootWorker = async ({ kernel, kernelTopic, root, mode = DISCOVERY, devices }) => {
  const handle = await startWhatsminerWorker({
    workerId: WORKER_ID,
    storeDir: workerStoreDir(root, WORKER_ID),
    kernelTopic: (!kernel && mode !== 'local') ? kernelTopic : null,
    seedDevices: devices
  })

  await registerWorker(handle, WORKER_ID, { kernel, root, mode })
  return handle
}

// The Ocean worker's real fetch/save cron is 1m/5m — too slow for a demo, so
// drive the same methods on a fast non-overlapping cadence. stop() clears the
// interval AND awaits a tick already in flight — clearInterval alone only
// stops *future* ticks, so a tick mid-fetchStats would otherwise keep running
// against HTTP resources the caller tears down right after.
const drivePool = (pool, tickMs) => {
  let inFlight = null
  const tick = () => {
    if (inFlight) return inFlight
    inFlight = (async () => {
      try {
        const now = new Date()
        await pool.fetchWorkers(now)
        await pool.fetchStats(now)
        await pool.saveStats(now)
      } catch (e) {
        debug('pool tick error: %s', e.message)
      } finally {
        inFlight = null
      }
    })()
    return inFlight
  }
  tick()
  const timer = setInterval(tick, tickMs)
  timer.unref()
  return {
    stop: async () => {
      clearInterval(timer)
      if (inFlight) await inFlight
    }
  }
}

// The pool is one logical device (deviceId == workerId), not a LAN device.
const bootOceanWorker = async ({ kernel, kernelTopic, root, mode = DISCOVERY }) => {
  const handle = await startOceanPoolWorker({
    workerId: OCEAN_WORKER_ID,
    rack: deploy.ocean.worker.rack,
    storeDir: workerStoreDir(root, OCEAN_WORKER_ID),
    conf: { ocean: deploy.ocean.pool },
    kernelTopic: (!kernel && mode !== 'local') ? kernelTopic : null
  })

  await registerWorker(handle, OCEAN_WORKER_ID, { kernel, root, mode })
  const poolDriver = drivePool(handle.pool, deploy.ocean.worker.tickMs)
  // registerWorker's SIGINT/kernel._cleanup paths both call handle.stop() by a
  // fresh property lookup each time, so wrapping it here — after
  // registerWorker already wired its own caller — still takes effect. Stop
  // the pacer (interval + any in-flight tick) before the underlying stop
  // logic runs, so nothing races whatever handle.stop() tears down.
  const stopWorker = handle.stop.bind(handle)
  handle.stop = async (...args) => {
    await poolDriver.stop()
    return stopWorker(...args)
  }
  return handle
}

const bootSatecWorker = async ({ kernel, kernelTopic, root, mode = DISCOVERY, devices }) => {
  const handle = await startSatecWorker({
    workerId: SATEC_WORKER_ID,
    model: deploy.satec.worker.model,
    storeDir: workerStoreDir(root, SATEC_WORKER_ID),
    conf: {
      allowDuplicateIPs: deploy.satec.worker.allowDuplicateIPs,
      thing: deploy.satec.worker.thing
    },
    kernelTopic: (!kernel && mode !== 'local') ? kernelTopic : null,
    seedDevices: devices
  })

  await registerWorker(handle, SATEC_WORKER_ID, { kernel, root, mode })
  return handle
}

module.exports = {
  exampleDir,
  deploy,
  ROOT,
  HOST,
  MOCK_PORT_BASE,
  SATEC_MOCK_PORT_BASE,
  GATEWAY_PORT,
  GATEWAY_HOST,
  MCP_AGENT_TOOLS_PORT,
  PLUGIN_DIRS,
  MCP_PLUGIN_DIRS,
  STATIC_ROOT_PATH,
  DISCOVERY,
  WORKER_ID,
  OCEAN_WORKER_ID,
  SATEC_WORKER_ID,
  loadSeedDevices,
  startMocks,
  startSatecMocks,
  startOceanMock,
  bootKernel,
  bootWorker,
  bootOceanWorker,
  bootSatecWorker
}
