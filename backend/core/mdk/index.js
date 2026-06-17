'use strict'

const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const os = require('os')
const debug = require('debug')('mdk:lifecycle')
const { setTimeout: sleep } = require('timers/promises')
const { OrkManager } = require('../ork')
const { MDKWorkerAdapter } = require('../../workers/base/lib/mdk-worker-adapter')
const StoreFacility = require('@tetherto/hp-svc-facs-store')
const { MDK_STORE } = require('./utils/constants')
const initialize = require('./utils/initialize')
const { startServices } = require('./services')
const { keysDir, publishWorkerKey, discoverWorkerKeys } = require('./lib/local-discovery')

const defaultRoot = path.join(os.tmpdir(), 'mdk')

// Well-known paths used as defaults when running without explicit configuration.
// Override via opts.topicFile / opts.ipc.path if co-locating multiple instances.
const DEFAULT_TOPIC_FILE = path.join(defaultRoot, '.dht-topic')
const DEFAULT_IPC_SOCK = path.join(defaultRoot, 'ork.sock')

function _startFacility (fac) {
  return new Promise((resolve, reject) => { fac.start((e) => (e ? reject(e) : resolve())) })
}

function _ensureDirs (...dirs) {
  for (const d of dirs) fs.mkdirSync(d, { recursive: true })
}

function _copyConfig (src, dst) {
  if (fs.existsSync(src) && !fs.existsSync(dst)) fs.copyFileSync(src, dst)
}

function _deepMerge (base, override) {
  const result = Object.assign({}, base)
  for (const key of Object.keys(override)) {
    if (
      typeof override[key] === 'object' && override[key] !== null && !Array.isArray(override[key]) &&
      typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])
    ) {
      result[key] = _deepMerge(result[key], override[key])
    } else {
      result[key] = override[key]
    }
  }
  return result
}

/**
 * Write a config file merging example defaults with user overrides.
 * If the dest file already exists and no overrides are given, it is left untouched
 * so user-edited configs remain as authoritative fallbacks.
 */
function _writeConfigWithOverride (examplePath, destPath, overrides) {
  const hasOverrides = Object.keys(overrides).length > 0
  if (fs.existsSync(destPath) && !hasOverrides) return

  let base = {}
  let hasBase = false
  if (fs.existsSync(destPath)) {
    try { base = JSON.parse(fs.readFileSync(destPath, 'utf8')); hasBase = true } catch {}
  } else {
    // prefer .example; fall back to plain file (e.g. logging.config.json has no .example)
    const src = fs.existsSync(examplePath) ? examplePath : examplePath.replace(/\.example$/, '')
    if (fs.existsSync(src)) {
      try { base = JSON.parse(fs.readFileSync(src, 'utf8')); hasBase = true } catch {}
    }
  }

  // No template, no existing file, no overrides → leave the file absent so
  // facilities (e.g. @tetherto/svc-facs-logging) can write their own defaults
  // in init() without being preempted by an empty {} on disk.
  if (!hasBase && !hasOverrides) return

  fs.writeFileSync(destPath, JSON.stringify(_deepMerge(base, overrides), null, 2), 'utf8')
}

// Minimal oauth2 stub used in noAuth mode — facilities must pass method validation in _start
const _NOAUTH_OAUTH2_STUB = {
  h0: {
    method: 'google',
    credentials: { client: { id: 'stub', secret: 'stub' } },
    startRedirectPath: '/oauth/google',
    callbackUri: 'http://localhost:3000/oauth/google/callback',
    callbackUriUI: 'http://localhost:3000',
    users: []
  },
  h1: {
    method: 'microsoft',
    credentials: { client: { id: 'stub', secret: 'stub' }, tenant: '' },
    startRedirectPath: '/oauth/microsoft',
    callbackUri: 'http://localhost:3000/oauth/microsoft/callback',
    callbackUriUI: 'http://localhost:3000',
    users: []
  }
}

function _loadContract (workerPackagePath) {
  const contractPath = path.join(workerPackagePath, 'mdk-contract.json')
  if (fs.existsSync(contractPath)) return JSON.parse(fs.readFileSync(contractPath, 'utf8'))
  return null
}

function _findWorkerPackagePath (ManagerClass) {
  for (const [filename, mod] of Object.entries(require.cache)) {
    if (!mod || !mod.exports) continue
    if (mod.exports === ManagerClass) {
      let dir = path.dirname(filename)
      for (let i = 0; i < 6; i++) {
        if (fs.existsSync(path.join(dir, 'mdk-contract.json'))) return dir
        const parent = path.dirname(dir)
        if (parent === dir) break
        dir = parent
      }
    }
  }
  return null
}

/**
 * Start the ORK (Orchestration Kernel).
 *
 * When called with no arguments the ork reads the DHT topic from
 * DEFAULT_TOPIC_FILE (written by startWorker when running standalone)
 * and opens an IPC socket at DEFAULT_IPC_SOCK so client.js can connect
 * without any configuration.
 *
 * @param {object} [opts]
 * @param {string} [opts.root]        - Data root dir (default: os.tmpdir()/mdk)
 * @param {string} [opts.storeDir]    - Override store dir
 * @param {string} [opts.topic]       - DHT topic hex (default: read from topicFile)
 * @param {string} [opts.topicFile]   - Path to topic file (default: DEFAULT_TOPIC_FILE)
 * @param {object} [opts.ipc]         - IPC config; pass `false` to disable
 * @param {object} [opts.hrpc]        - HRPC config (default: enabled)
 * @param {object} [opts.discovery]   - Discovery config: { mode: 'dht' | 'local', dir? }.
 *                                       Default 'dht' (Hyperswarm topic; works on one host or
 *                                       across machines). 'local' is a faster same-machine option:
 *                                       the ORK registers workers by the RPC keys they publish to a
 *                                       shared dir (default: <root>/.worker-keys), skipping the topic.
 */
async function getOrk (opts = {}) {
  const root = opts.root || defaultRoot
  const storeDir = opts.storeDir || path.join(root, MDK_STORE, 'ork-db')
  _ensureDirs(storeDir)

  const mode = (opts.discovery && opts.discovery.mode) || 'dht'

  let topic
  let localKeysDir
  if (mode === 'local') {
    localKeysDir = opts.discovery.dir || keysDir(root)
  } else {
    topic = opts.topic
    if (!topic) {
      const topicFile = opts.topicFile || DEFAULT_TOPIC_FILE
      topic = fs.existsSync(topicFile)
        ? fs.readFileSync(topicFile, 'utf8').trim()
        : crypto.randomBytes(32).toString('hex')
    }
  }

  const conf = { ork: {} }
  if (opts.hrpc !== false) conf.ork.hrpc = opts.hrpc || { whitelist: [] }
  if (opts.telemetryPullMs) conf.ork.telemetryPullMs = opts.telemetryPullMs
  if (opts.healthPingMs) conf.ork.healthPingMs = opts.healthPingMs
  conf.ork.discovery = mode === 'local' ? { mode: 'local', dir: localKeysDir } : (opts.discovery || { topic })

  const ipc = opts.ipc !== false ? (opts.ipc || { path: DEFAULT_IPC_SOCK }) : null
  if (ipc) conf.ork.ipc = ipc

  const ork = new OrkManager(conf, { storeDir, root, loadConf: () => {} })
  await ork.init()
  await ork.start()

  ork.topic = topic
  ork._cleanup = []

  // Local mode: register workers by the RPC keys they publish to the shared dir,
  // skipping the DHT topic — immediate discovery for same-machine setups.
  if (mode === 'local') {
    const watcher = discoverWorkerKeys(ork, localKeysDir)
    ork._cleanup.push(async () => watcher.stop())
  }

  onShutdown(async () => {
    for (const fn of ork._cleanup) {
      try { await fn() } catch {}
    }
    await ork.stop()
  })

  return ork
}

/**
 * Start the ORK with explicit configuration (backward-compatible).
 * Prefer `getOrk()` for new code.
 */
async function startOrk (opts = {}) {
  const root = opts.root || defaultRoot
  const storeDir = opts.storeDir || path.join(root, MDK_STORE, 'ork-db')
  _ensureDirs(storeDir)

  const conf = { ork: {} }
  if (opts.hrpc !== false) conf.ork.hrpc = opts.hrpc || { whitelist: [] }
  if (opts.ipc) conf.ork.ipc = opts.ipc
  if (opts.discovery) conf.ork.discovery = opts.discovery
  if (opts.telemetryPullMs) conf.ork.telemetryPullMs = opts.telemetryPullMs
  if (opts.healthPingMs) conf.ork.healthPingMs = opts.healthPingMs

  const ork = new OrkManager(conf, { storeDir, root, loadConf: opts.loadConf || undefined })
  await ork.init()
  await ork.start()
  return ork
}

/**
 * Start a worker backed by the given ManagerClass.
 *
 * When running without an ork (standalone / DHT mode) the worker
 * auto-generates a DHT topic and writes it to DEFAULT_TOPIC_FILE so
 * a subsequent `getOrk()` call picks it up without any configuration.
 *
 * @param {Function} ManagerClass
 * @param {object}   [opts]
 * @param {object}   [opts.ork]               - ORK instance from getOrk()
 * @param {string}   [opts.orkTopic]           - DHT topic hex
 * @param {string}   [opts.topicFile]          - Override topic file path
 * @param {string}   [opts.root]              - Data root dir
 * @param {string}   [opts.rack]              - Rack ID (default: 'rack-1')
 * @param {string}   [opts.wtype]             - Worker type string
 * @param {string}   [opts.workerId]          - Override worker ID
 * @param {string}   [opts.workerPackagePath] - Path to package with mdk-contract.json
 * @param {object}   [opts.contract]          - Override contract object
 * @param {object}   [opts.discovery]          - { mode: 'dht' | 'local', dir? }. Default 'dht'.
 *                                                In 'local' mode the worker skips the swarm topic
 *                                                join and publishes its RPC key to a shared dir
 *                                                (default: <root>/.worker-keys) for the ORK to pick up.
 */
async function startWorker (ManagerClass, opts = {}) {
  const rack = opts.rack || 'rack-1'
  const root = opts.root || defaultRoot
  const mode = (opts.discovery && opts.discovery.mode) || 'dht'

  const workerPackagePath = opts.workerPackagePath || _findWorkerPackagePath(ManagerClass)

  const workerDir = path.join(root, 'workers', opts.workerId || ManagerClass.name)
  const storeDir = path.join(workerDir, 'store')
  const configDir = path.join(workerDir, 'config')
  const adapterStoreDir = path.join(workerDir, 'adapter-store')
  _ensureDirs(storeDir, configDir, adapterStoreDir)

  if (workerPackagePath) {
    _copyConfig(path.join(workerPackagePath, 'config', 'base.thing.json.example'), path.join(configDir, 'base.thing.json'))
  }
  _copyConfig(path.join(__dirname, '../../workers/base/config/common.json.example'), path.join(configDir, 'common.json'))

  const manager = new ManagerClass({}, {
    rack,
    storeDir,
    root: workerDir,
    wtype: opts.wtype || 'wrk-thing'
  })
  await manager.init()

  // Standalone DHT mode: generate topic and write to the well-known file
  // so getOrk() can pick it up without any coordination code in the caller.
  // Local mode has no topic — orkTopic stays null and the adapter skips the join.
  let orkTopic = null
  if (mode !== 'local') {
    orkTopic = opts.orkTopic || (opts.ork ? opts.ork.topic : null)
    if (!opts.ork) {
      if (!orkTopic) orkTopic = crypto.randomBytes(32).toString('hex')
      const topicFile = opts.topicFile || DEFAULT_TOPIC_FILE
      _ensureDirs(path.dirname(topicFile))
      fs.writeFileSync(topicFile, orkTopic, 'utf8')
    }
  }

  const contract = opts.contract || (workerPackagePath ? _loadContract(workerPackagePath) : null)
  if (!contract) throw new Error('ERR_NO_CONTRACT: provide opts.contract or opts.workerPackagePath with mdk-contract.json')

  const adapterStore = new StoreFacility(null, { storeDir: adapterStoreDir }, {})
  await _startFacility(adapterStore)

  const workerId = opts.workerId || `${manager.getThingType()}-${rack}`
  const adapter = new MDKWorkerAdapter(manager, contract, {
    workerId,
    orkTopic,
    store: adapterStore
  })
  await adapter.start()

  // Local mode: publish our stable RPC key so the ORK can connect by key
  // directly, skipping the DHT topic announce/lookup.
  if (mode === 'local') {
    const dir = opts.discovery.dir || keysDir(root)
    publishWorkerKey(dir, workerId, adapter.getPublicKey().toString('hex'))
  }

  if (opts.ork && opts.ork.registerWorker) {
    await opts.ork.registerWorker(adapter.getPublicKey())
  }

  // Await the callback-based manager.stop so RocksDB/Corestore flush before
  // adapter.stop() and process exit.
  const stopManager = () => new Promise((resolve) => manager.stop(() => resolve()))

  if (opts.ork && Array.isArray(opts.ork._cleanup)) {
    opts.ork._cleanup.push(async () => {
      await stopManager()
      await adapter.stop()
    })
  } else if (!opts.ork) {
    onShutdown(async () => {
      try { await stopManager() } catch {}
      try { await adapter.stop() } catch {}
    })
  }

  return { manager, adapter, store: adapterStore }
}

/**
 * Start the app-node HTTP server programmatically.
 *
 * Writes config files under `opts.root` using example defaults deep-merged
 * with any overrides supplied in opts.  Files that already exist and have no
 * corresponding override are left untouched — they remain user-editable
 * fallbacks, consistent with the rest of the MDK architecture.
 *
 * @param {object}  [opts]
 * @param {string}  [opts.root]          - Config/data root dir (default: os.tmpdir()/mdk/app-node)
 * @param {number}  [opts.port]          - HTTP port (default: 3000)
 * @param {string}  [opts.env]           - Environment string (default: 'development')
 * @param {string}  [opts.tmpdir]        - Isolate the corestore under this dir instead of a
 *                                         CWD-relative path (defaults to root when env==='test')
 * @param {boolean} [opts.noAuth]        - Skip OAuth plugins; write stub oauth2 config (default: false)
 * @param {object}  [opts.ork]           - ORK instance; cleanup is registered on opts.ork._cleanup
 * @param {*}       [opts.orkKey]        - ORK HRPC gateway public key (hex/Buffer); selects HRPC transport (no IPC)
 * @param {*}       [opts.orkIpc]        - IPC socket path, or false to disable MDK client connection
 * @param {Array}   [opts.extraPluginDirs] - Extra plugin package dirs to load + register at boot
 * @param {object}  [opts.common]        - Overrides for common.json
 * @param {object}  [opts.auth]          - Overrides for auth.config.json
 * @param {object}  [opts.httpd]         - Overrides for httpd.config.json
 * @param {object}  [opts.httpdOauth2]   - Overrides for httpd-oauth2.config.json
 * @param {object}  [opts.net]           - Overrides for net.config.json
 * @param {object}  [opts.store]         - Overrides for store.config.json
 * @param {object}  [opts.logging]       - Overrides for logging.config.json
 * @param {Array}   [opts.additionalRoutes] - Extra Fastify routes to register
 * @returns {Promise<object>}  WrkServerHttp instance (already started)
 */
async function startAppNode (opts = {}) {
  const appNodePkg = path.resolve(__dirname, '..', 'app-node')
  const root = opts.root || path.join(defaultRoot, 'app-node')
  const facsDir = path.join(root, 'config', 'facs')
  const facsExampleDir = path.join(appNodePkg, 'config', 'facs')

  _ensureDirs(facsDir, path.join(root, 'db'), path.join(root, 'status'), path.join(root, 'store'), path.join(root, 'workers'))

  // Stub so that code paths using bfx-svc-boot-js worker path resolution still work
  const wrkStubPath = path.join(root, 'workers', 'http.node.wrk.js')
  if (!fs.existsSync(wrkStubPath)) {
    fs.writeFileSync(
      wrkStubPath,
      `'use strict'\nmodule.exports = require(${JSON.stringify(path.join(appNodePkg, 'workers', 'http.node.wrk'))})\n`
    )
  }

  _writeConfigWithOverride(
    path.join(appNodePkg, 'config', 'common.json.example'),
    path.join(root, 'config', 'common.json'),
    opts.common || {}
  )

  // oauth2: in noAuth mode with no explicit override, use a minimal stub so the
  // svc-facs-httpd-oauth2 facility can start() without failing method validation.
  const oauth2Overrides = opts.httpdOauth2 || (opts.noAuth ? _NOAUTH_OAUTH2_STUB : {})

  const facMappings = [
    ['auth.config.json', opts.auth || {}],
    ['httpd.config.json', opts.httpd || {}],
    ['net.config.json', opts.net || {}],
    ['store.config.json', opts.store || {}],
    ['logging.config.json', opts.logging || {}],
    ['httpd-oauth2.config.json', oauth2Overrides]
  ]

  for (const [filename, overrides] of facMappings) {
    _writeConfigWithOverride(
      path.join(facsExampleDir, `${filename}.example`),
      path.join(facsDir, filename),
      overrides
    )
  }

  // require() resolves relative to the WrkServerHttp file itself so its dependencies
  // in app-node/node_modules are found by Node's normal resolution algorithm.
  const WrkServerHttp = require('../app-node/workers/http.node.wrk')

  const ctx = {
    root,
    wtype: 'wrk-node-http',
    env: opts.env || 'development',
    port: opts.port || 3000,
    shard: opts.shard || 0
  }
  // tether-wrk-base resolves the corestore to a CWD-relative `store/<storeDir>`
  // unless env==='test' AND ctx.tmpdir is set, in which case it lives under
  // tmpdir. The CWD-relative default makes every app-node sharing a working dir
  // contend for one RocksDB lock (ERR: "File descriptor could not be locked" →
  // a half-open corestore that later surfaces as "Corestore is closed"). Honour
  // an explicit tmpdir, and in test env default it to root so each instance is
  // hermetic under its own data dir.
  if (opts.tmpdir) ctx.tmpdir = opts.tmpdir
  else if (ctx.env === 'test') ctx.tmpdir = root
  if (opts.noAuth) ctx.noauth = true
  if (opts.ork) ctx.ork = opts.ork
  if (opts.orkKey) {
    ctx.orkKey = opts.orkKey
    // HRPC transport selected; never open the IPC socket unless explicitly asked.
    ctx.orkIpc = opts.orkIpc !== undefined ? opts.orkIpc : false
  } else if (opts.orkIpc !== undefined) {
    ctx.orkIpc = opts.orkIpc
  }
  if (opts.extraPluginDirs) ctx.extraPluginDirs = opts.extraPluginDirs
  if (opts.additionalRoutes) ctx.additionalRoutes = opts.additionalRoutes

  // WrkServerHttp constructor calls this.init() + this.start() automatically.
  // bfx-wrk-base emits 'started' (via process.nextTick) when start() completes.
  const hnd = new WrkServerHttp({}, ctx)
  await new Promise((resolve) => hnd.once('started', resolve))

  if (opts.ork && Array.isArray(opts.ork._cleanup)) {
    opts.ork._cleanup.push(() => new Promise((resolve) => hnd.stop(resolve)))
  } else if (!opts.ork) {
    // No ork to register cleanup onto (standalone app-node): own the signal.
    onShutdown(() => new Promise((resolve) => hnd.stop(resolve)))
  }

  return hnd
}

// Wait until the registry holds `minWorkers` READY workers (with ≥1 device unless
// requireDevices is false); return the worker list (current list on timeout).
// Back-compat: a numeric second arg is read as timeoutMs.
async function waitForDiscovery (ork, opts = {}) {
  const o = (typeof opts === 'number') ? { timeoutMs: opts } : opts
  const { minWorkers = 1, requireDevices = true, timeoutMs = 30000, intervalMs = 500 } = o
  const ready = () => ork.registry.listWorkers()
    .filter(w => w.state === 'READY' && (!requireDevices || (w.deviceIds || []).length > 0))
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (ready().length >= minWorkers) return ork.registry.listWorkers()
    await sleep(intervalMs)
  }
  return ork.registry.listWorkers()
}

// Run cleanupFn once on the first of `signals`, then exit. The unref'd force
// timer bounds a hung cleanup. Idempotent; returns the handler so tests can
// invoke or removeListener it.
function onShutdown (cleanupFn, { signals = ['SIGINT', 'SIGTERM'], forceMs = 3000 } = {}) {
  let ran = false
  const handler = async () => {
    if (ran) return
    ran = true
    const force = setTimeout(() => process.exit(0), forceMs).unref()
    try { await cleanupFn() } catch (err) { debug('shutdown cleanup error: %s', err && err.message) }
    clearTimeout(force)
    process.exit(0)
  }
  for (const sig of signals) process.once(sig, handler)
  return handler
}

// Tear down any boot handle without the caller knowing its shape: drain
// _cleanup, then stop via the handle's top-level stop() (ork/app-node) or, for a
// worker handle, manager-then-adapter. Idempotent and partial-handle safe.
async function shutdown (handle) {
  if (!handle || handle.__mdkShutdownDone) return

  if (Array.isArray(handle._cleanup)) {
    for (const fn of handle._cleanup) {
      try { await fn() } catch (err) { debug('cleanup error: %s', err && err.message) }
    }
  }

  if (typeof handle.stop === 'function') {
    // ork.stop() resolves a promise; app-node hnd.stop(cb) calls back.
    await new Promise((resolve) => {
      const r = handle.stop(resolve)
      if (r && typeof r.then === 'function') r.then(resolve, resolve)
    })
  } else if (handle.manager || handle.adapter) {
    if (handle.manager && typeof handle.manager.stop === 'function') {
      await new Promise((resolve) => handle.manager.stop(() => resolve()))
    }
    if (handle.adapter && typeof handle.adapter.stop === 'function') {
      try { await handle.adapter.stop() } catch (err) { debug('adapter stop: %s', err && err.message) }
    }
  }

  handle.__mdkShutdownDone = true
}

module.exports = {
  initialize,
  getOrk,
  startOrk,
  startWorker,
  startAppNode,
  waitForDiscovery,
  onShutdown,
  shutdown,
  DEFAULT_TOPIC_FILE,
  DEFAULT_IPC_SOCK,
  startServices
}
