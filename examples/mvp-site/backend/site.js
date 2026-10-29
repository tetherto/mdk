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
const { getKernel, parseBootstrap, parseDhtHost, resolveDhtHost } = require('@tetherto/mdk-core')
const {
  publishWorkerKey, keysDir, trustedKeysDir, readTrustedKeys, waitForKernelKey, trustKernel, trustKeysFromDir
} = require('@tetherto/mdk-core/lib/local-discovery')
const { GIT_DEPS } = require('./constants')
const { siteAccess, syncUsers } = require('./access')

const missingGitDeps = GIT_DEPS.filter((name) => {
  try {
    require.resolve(`${name}/package.json`)
    return false
  } catch {
    return true
  }
})
if (missingGitDeps.length) {
  console.error('\n  Git dependencies are missing — the example cannot boot:\n')
  for (const name of missingGitDeps) console.error('    - %s', name)
  console.error('\n  They install from github.com, not the npm registry. To fix, run "npm run setup" in examples/mvp-site with access to github.com.\n')
  process.exit(1)
}

const { startWhatsminerWorker } = require('./whatsminer-adapter')
const { startAntminerWorker } = require('./antminer-adapter')
const { startSealminerWorker } = require('./sealminer-adapter')
const { startOceanWorker } = require('./ocean-adapter')
const { startPoolPluginWorker } = require('./pool-adapter')
const emcd = require('emcd-mdk-worker')
const spiderpool = require('spiderpool-mdk-worker')
const foundry = require('foundry-mdk-worker')
const { startSatecWorker } = require('@tetherto/mdk-worker-satec')
const wmMock = require('whatsminer-mdk-worker/mock/api-v3-server')
const amMock = require('antminer-mdk-worker/mock/cgi-server')
const smMock = require('sealminer-mdk-worker/mock/server')
const oceanMock = require('ocean-mdk-worker/mock/server')
const satecMock = require('@tetherto/mdk-worker-satec/mock/server')
const emcdMock = require('emcd-mdk-worker/mock/server')
const emcdMockKeys = require('emcd-mdk-worker/mock/keys')
const spiderpoolMock = require('spiderpool-mdk-worker/mock/server')
const spiderpoolMockKeys = require('spiderpool-mdk-worker/mock/keys')
const foundryMock = require('foundry-mdk-worker/mock/server')
const foundryMockKeys = require('foundry-mdk-worker/mock/keys')

const exampleDir = path.join(__dirname, '..')
const deploy = require(path.join(exampleDir, 'config', 'site.deploy.json'))

const ROOT = path.join(exampleDir, deploy.root)
const PLUGIN_DIRS = deploy.gateway.pluginDirs.map((p) => path.join(exampleDir, p))
const MCP_PLUGIN_DIRS = (deploy.mcp.agentTools?.pluginDirs || []).map((p) => path.join(exampleDir, p))
const STATIC_ROOT_PATH = path.join(exampleDir, deploy.gateway.staticRootPath)

const HOST = deploy.host
const MOCK_PORT_BASE = deploy.mocks.portBase
const SATEC_MOCK_PORT_BASE = deploy.satec.mocks.portBase
// `antminer` is optional so a local site.deploy.json seeded before it
// existed still boots (its pm2.roles just won't list the antminer roles).
const ANTMINER_MOCK_PORT_BASE = deploy.antminer?.mocks?.portBase
// Optional for the same reason as `antminer`.
const SEALMINER_MOCK_PORT_BASE = deploy.sealminer?.mocks?.portBase
const GATEWAY_PORT = deploy.gateway.port
const GATEWAY_HOST = deploy.gateway.host
// The gateway serves only these Host headers (loopback on its port is always in).
// A LAN deploy lists the names/addresses the UI is opened with.
const GATEWAY_ALLOWED_HOSTS = deploy.gateway.allowedHosts || []
const MCP_AGENT_TOOLS_PORT = deploy.mcp.agentTools?.port
const DISCOVERY = deploy.discovery
// Private HyperDHT (the local / air-gapped profile): with a `dht` section every
// process joins `dht.bootstrap`, else the bootstrap the dht-bootstrap role runs
// at host:port, and binds its DHT node to `host` (loopback by default for the
// generated bootstrap; every interface when joining a list without a `host`).
// Without one, the public DHT.
const DHT_CONF = deploy.dht ? _dhtConf(deploy.dht) : null
const DHT = DHT_CONF
  ? { bootstrap: DHT_CONF.bootstrap || [`${DHT_CONF.host}:${DHT_CONF.port}`], ...(DHT_CONF.host ? { dhtHost: DHT_CONF.host } : {}) }
  : {}

function _dhtConf (dht) {
  const bootstrap = parseBootstrap(dht.bootstrap)
  return { host: resolveDhtHost(parseDhtHost(dht.host), bootstrap), port: dht.port || 49737, bootstrap }
}
const WORKER_ID = deploy.worker.id
const OCEAN_WORKER_ID = deploy.ocean.worker.id
const SATEC_WORKER_ID = deploy.satec.worker.id
const ANTMINER_WORKER_ID = deploy.antminer?.worker?.id
const SEALMINER_WORKER_ID = deploy.sealminer?.worker?.id
// Optional like `antminer`: a site.deploy.json seeded before these pools
// existed still boots, its pm2.roles just don't list their roles.
const EMCD_WORKER_ID = deploy.emcd?.worker?.id
const SPIDERPOOL_WORKER_ID = deploy.spiderpool?.worker?.id
const FOUNDRY_WORKER_ID = deploy.foundry?.worker?.id

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
    antminers: assignPools(assignPorts(devices.antminers, ANTMINER_MOCK_PORT_BASE)),
    // The SealMiner contract takes pools through its setupPools command, not
    // device config, so worker.pools isn't applied here.
    sealminers: assignPorts(devices.sealminers, SEALMINER_MOCK_PORT_BASE),
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

// antminer-mdk-worker's mock speaks the stock-firmware HTTP CGI API with
// digest auth; the serial and model are a raw state override, same as the
// Whatsminer mock above.
const startAntminerMocks = (miners) => {
  return mockHandles(miners.map((d) => {
    const mock = amMock.createServer({
      port: d.opts.port,
      host: HOST,
      username: d.opts.username,
      password: d.opts.password ?? deploy.antminer.mocks.defaultPassword,
      state: { systemInfo: { serinum: d.info.serialNum } }
    })
    return { ...mock, exit: () => mock.close() }
  }))
}

// sealminer-mdk-worker's mock speaks the bdminer 4028 TCP JSON API (no auth).
// It has no serial override, so devices are told apart by deviceId alone.
const startSealminerMocks = (miners) => {
  return mockHandles(miners.map((d) => smMock.createServer({
    port: d.opts.port,
    host: HOST,
    series: String(d.opts.series || deploy.sealminer.worker.series).toLowerCase(),
    firmware: deploy.sealminer.mocks.firmware
  })))
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

// ocean-mdk-worker's mock serves any account name with fixed fixtures (no
// fleet sizing), listens without a ready promise, and its exit() calls
// process.exit — wait for 'listening' and close through stop() instead.
const startOceanMock = () => {
  const server = oceanMock.createServer({ port: deploy.ocean.mock.port, host: HOST })
  const ready = new Promise((resolve, reject) => {
    server.app.server.once('listening', resolve)
    server.app.server.once('error', reject)
  })
  return mockHandles([{ ready, exit: () => server.stop() }])
}

// The EMCD, SpiderPool and Foundry mocks serve fixed fixture accounts (no fleet
// sizing). createServer() is async and returns { app, apiUrl }.
const startPoolPluginMock = (mock, port) => {
  const server = mock.createServer({ port, host: HOST })
  return mockHandles([{ ready: server, exit: () => server.then(({ app }) => app.close()) }])
}

const startEmcdMock = () => startPoolPluginMock(emcdMock, deploy.emcd.mock.port)
const startSpiderpoolMock = () => startPoolPluginMock(spiderpoolMock, deploy.spiderpool.mock.port)
const startFoundryMock = () => startPoolPluginMock(foundryMock, deploy.foundry.mock.port)

// --- Kernel + worker boot ------------------------------------------------------

// Start the Kernel over HRPC. `mode`: 'local' (register the worker by the RPC
// key it publishes to the shared dir) or 'dht' (Hyperswarm topic; `topic` pins it).
const bootKernel = async ({ root, topic, mode = DISCOVERY } = {}) => {
  // The example's processes exit on Ctrl-C/SIGTERM — opt in explicitly.
  const opts = { root, storeDir: path.join(root, 'kernel-db'), handleSignals: true }
  // spec.rbac and the service accounts that sign in under it (see access.js).
  const rbac = deploy.rbac || {}
  const { policy, serviceAccounts } = siteAccess(root, { pluginDirs: PLUGIN_DIRS, mcpPluginDirs: MCP_PLUGIN_DIRS, rbac })
  opts.rbac = policy
  opts.serviceAccounts = serviceAccounts
  if (DHT.bootstrap) opts.hrpc = { ...DHT }
  if (mode === 'local') {
    opts.discovery = { mode: 'local' }
  } else {
    opts.topicFile = path.join(root, '.dht-topic')
    if (topic) opts.topic = topic
    // Topic admission is fail-closed. The demo's workers run in their own
    // processes and their RPC keys are not known here, so admit any Worker on
    // the topic (logs a warning). A real site lists them in workerKeys.
    opts.discovery = { mode: 'dht', allowAnyWorker: true }
  }
  const kernel = await getKernel(opts)
  // The site's users (rbac.users), with the shared demo password or a generated one.
  const users = rbac.users || []
  if (!users.length) {
    console.warn('config/site.deploy.json lists no rbac.users: nobody can sign in to the UI. Copy the rbac block from config/site.deploy.json.example')
  }
  const { created, removed } = await syncUsers(root, kernel.identity, users, { password: rbac.password })
  debug('users: %d, created %o, removed %o', users.length, created, removed)
  return kernel
}

// Worker RPC is fail-closed and admits the Kernel's client key only, so every
// device call goes through the Kernel's spec.rbac check and write-command log:
// in process from the Kernel, out of process its kernel.pub in the trusted-keys
// dir (waiting for it, so PM2 start order does not matter).
const workerTrust = async ({ kernel, root }) => {
  if (kernel) return [kernel.getClientPublicKey()]
  const dir = trustedKeysDir(root)
  await waitForKernelKey(dir, { timeoutMs: 60000 })
  return readTrustedKeys(dir).filter((k) => k.name === 'kernel').map((k) => k.key)
}

// ...and follow the Kernel's key if it changes.
const followTrust = (handle, { kernel, root }) => {
  const follower = kernel ? trustKernel(handle.runtime, kernel) : trustKeysFromDir(handle.runtime, trustedKeysDir(root))
  const stop = handle.stop.bind(handle)
  handle.stop = async (...args) => {
    follower.stop()
    return stop(...args)
  }
}

const registerWorker = async (handle, workerId, { kernel, root, mode }) => {
  followTrust(handle, { kernel, root })
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
    allowedKeys: await workerTrust({ kernel, root }),
    workerId: WORKER_ID,
    storeDir: workerStoreDir(root, WORKER_ID),
    kernelTopic: (!kernel && mode !== 'local') ? kernelTopic : null,
    ...DHT,
    seedDevices: devices
  })

  await registerWorker(handle, WORKER_ID, { kernel, root, mode })
  return handle
}

// Same fixed-device-list model as bootWorker; worker.type tags every device
// (e.g. miner-am-s21) so the plugin resolves its rated J/TH for `snap`.
const bootAntminerWorker = async ({ kernel, kernelTopic, root, mode = DISCOVERY, devices }) => {
  const handle = await startAntminerWorker({
    allowedKeys: await workerTrust({ kernel, root }),
    workerId: ANTMINER_WORKER_ID,
    storeDir: workerStoreDir(root, ANTMINER_WORKER_ID),
    kernelTopic: (!kernel && mode !== 'local') ? kernelTopic : null,
    ...DHT,
    type: deploy.antminer.worker.type,
    seedDevices: devices
  })

  await registerWorker(handle, ANTMINER_WORKER_ID, { kernel, root, mode })
  return handle
}

// Same fixed-device-list model as bootAntminerWorker; worker.series is
// declared on every device so the plugin doesn't infer it from the model.
const bootSealminerWorker = async ({ kernel, kernelTopic, root, mode = DISCOVERY, devices }) => {
  const handle = await startSealminerWorker({
    allowedKeys: await workerTrust({ kernel, root }),
    workerId: SEALMINER_WORKER_ID,
    storeDir: workerStoreDir(root, SEALMINER_WORKER_ID),
    kernelTopic: (!kernel && mode !== 'local') ? kernelTopic : null,
    ...DHT,
    series: deploy.sealminer.worker.series,
    seedDevices: devices
  })

  await registerWorker(handle, SEALMINER_WORKER_ID, { kernel, root, mode })
  return handle
}

// The pool workers' real fetch/save cron is 1m/5m — too slow for a demo, so
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
// ocean-mdk-worker polls the Ocean API on its own one-minute cadence, so it
// takes no demo pacer. DATUM credentials, when a gateway is configured, come
// from the environment like the other pools' credentials.
const bootOceanWorker = async ({ kernel, kernelTopic, root, mode = DISCOVERY }) => {
  const env = {}
  if (process.env.DATUM_USER) env.DATUM_USER = process.env.DATUM_USER
  if (process.env.DATUM_PASSWORD) env.DATUM_PASSWORD = process.env.DATUM_PASSWORD
  const handle = await startOceanWorker({
    allowedKeys: await workerTrust({ kernel, root }),
    workerId: OCEAN_WORKER_ID,
    storeDir: workerStoreDir(root, OCEAN_WORKER_ID),
    pool: deploy.ocean.pool,
    env,
    kernelTopic: (!kernel && mode !== 'local') ? kernelTopic : null,
    ...DHT
  })

  await registerWorker(handle, OCEAN_WORKER_ID, { kernel, root, mode })
  return handle
}

// registerWorker's SIGINT/kernel._cleanup paths both call handle.stop() by a
// fresh property lookup each time, so wrapping it here — after
// registerWorker already wired its own caller — still takes effect. Stop
// the pacer (interval + any in-flight tick) before the underlying stop
// logic runs, so nothing races whatever handle.stop() tears down.
const withPoolDriver = (handle, tickMs) => {
  const poolDriver = drivePool(handle.pool, tickMs)
  const stopWorker = handle.stop.bind(handle)
  handle.stop = async (...args) => {
    await poolDriver.stop()
    return stopWorker(...args)
  }
  return handle
}

// Credentials come from the environment, never from site.deploy.json. Unset,
// they fall back to the package's public mock fixtures, which only the
// bundled mock accepts.
const poolCredentials = (name, env, mockKeys) => {
  const missing = Object.keys(env).filter((key) => !process.env[env[key]])
  if (!missing.length) return Object.fromEntries(Object.entries(env).map(([key, envName]) => [key, process.env[envName]]))
  console.warn('%s: %s unset, using the mock fixture credentials', name, missing.map((key) => env[key]).join(', '))
  return mockKeys
}

const bootPoolPluginWorker = async ({ kernel, kernelTopic, root, mode, pkg, workerId, section, conf }) => {
  const handle = await startPoolPluginWorker({
    Pool: pkg.Pool,
    plugin: pkg.plugin,
    allowedKeys: await workerTrust({ kernel, root }),
    workerId,
    rack: section.worker.rack,
    storeDir: workerStoreDir(root, workerId),
    conf,
    kernelTopic: (!kernel && mode !== 'local') ? kernelTopic : null,
    ...DHT
  })

  await registerWorker(handle, workerId, { kernel, root, mode })
  return withPoolDriver(handle, section.worker.tickMs)
}

const bootEmcdWorker = ({ kernel, kernelTopic, root, mode = DISCOVERY }) => {
  const credentials = poolCredentials('emcd', { apiKey: 'EMCD_API_KEY', apiSecret: 'EMCD_API_SECRET' }, emcdMockKeys)
  return bootPoolPluginWorker({
    kernel,
    kernelTopic,
    root,
    mode,
    pkg: { Pool: emcd.EMCD_POOL, plugin: emcd.plugin },
    workerId: EMCD_WORKER_ID,
    section: deploy.emcd,
    conf: { emcd: { ...deploy.emcd.pool, ...credentials } }
  })
}

const bootSpiderpoolWorker = ({ kernel, kernelTopic, root, mode = DISCOVERY }) => {
  const credentials = poolCredentials(
    'spiderpool',
    { accessKey: 'SPIDERPOOL_ACCESS_KEY', privateKey: 'SPIDERPOOL_PRIVATE_KEY' },
    { accessKey: spiderpoolMockKeys.TEST_ACCESS_KEY, privateKey: spiderpoolMockKeys.TEST_PRIVATE_KEY }
  )
  return bootPoolPluginWorker({
    kernel,
    kernelTopic,
    root,
    mode,
    pkg: { Pool: spiderpool.SPIDER_POOL, plugin: spiderpool.plugin },
    workerId: SPIDERPOOL_WORKER_ID,
    section: deploy.spiderpool,
    conf: { spiderpool: { ...deploy.spiderpool.pool, ...credentials } }
  })
}

// One credential (a sub-account API key or an `fdpat_` personal access token)
// shared by every name in foundry.pool.accounts. Per-sub-account keys go in
// the accounts list as { name, apiKey } entries instead.
const bootFoundryWorker = ({ kernel, kernelTopic, root, mode = DISCOVERY }) => {
  const credentials = poolCredentials('foundry', { apiKey: 'FOUNDRY_API_KEY' }, { apiKey: foundryMockKeys.apiKey })
  return bootPoolPluginWorker({
    kernel,
    kernelTopic,
    root,
    mode,
    pkg: { Pool: foundry.FOUNDRY_POOL, plugin: foundry.plugin },
    workerId: FOUNDRY_WORKER_ID,
    section: deploy.foundry,
    conf: { foundry: { ...deploy.foundry.pool, ...credentials } }
  })
}

const bootSatecWorker = async ({ kernel, kernelTopic, root, mode = DISCOVERY, devices }) => {
  const handle = await startSatecWorker({
    allowedKeys: await workerTrust({ kernel, root }),
    workerId: SATEC_WORKER_ID,
    model: deploy.satec.worker.model,
    storeDir: workerStoreDir(root, SATEC_WORKER_ID),
    conf: {
      allowDuplicateIPs: deploy.satec.worker.allowDuplicateIPs,
      thing: deploy.satec.worker.thing
    },
    kernelTopic: (!kernel && mode !== 'local') ? kernelTopic : null,
    ...DHT,
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
  ANTMINER_MOCK_PORT_BASE,
  SEALMINER_MOCK_PORT_BASE,
  GATEWAY_PORT,
  GATEWAY_HOST,
  GATEWAY_ALLOWED_HOSTS,
  MCP_AGENT_TOOLS_PORT,
  PLUGIN_DIRS,
  MCP_PLUGIN_DIRS,
  STATIC_ROOT_PATH,
  DISCOVERY,
  DHT,
  DHT_CONF,
  WORKER_ID,
  OCEAN_WORKER_ID,
  SATEC_WORKER_ID,
  ANTMINER_WORKER_ID,
  SEALMINER_WORKER_ID,
  EMCD_WORKER_ID,
  SPIDERPOOL_WORKER_ID,
  FOUNDRY_WORKER_ID,
  loadSeedDevices,
  startMocks,
  startAntminerMocks,
  startSealminerMocks,
  startSatecMocks,
  startOceanMock,
  startEmcdMock,
  startSpiderpoolMock,
  startFoundryMock,
  bootKernel,
  bootWorker,
  bootAntminerWorker,
  bootSealminerWorker,
  bootOceanWorker,
  bootSatecWorker,
  bootEmcdWorker,
  bootSpiderpoolWorker,
  bootFoundryWorker
}
