'use strict'

const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const os = require('os')
const { setTimeout: sleep } = require('timers/promises')
const { OrkManager } = require('../ork')
const { MDKWorkerAdapter } = require('../../workers/base/lib/mdk-worker-adapter')
const StoreFacility = require('@tetherto/hp-svc-facs-store')
const { MDK_STORE } = require('./utils/constants')
const initialize = require('./utils/initialize')
const { startServices } = require('./services')

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
 */
async function getOrk (opts = {}) {
  const root = opts.root || defaultRoot
  const storeDir = opts.storeDir || path.join(root, MDK_STORE, 'ork-db')
  _ensureDirs(storeDir)

  let topic = opts.topic
  if (!topic) {
    const topicFile = opts.topicFile || DEFAULT_TOPIC_FILE
    topic = fs.existsSync(topicFile)
      ? fs.readFileSync(topicFile, 'utf8').trim()
      : crypto.randomBytes(32).toString('hex')
  }

  const conf = { ork: {} }
  if (opts.hrpc !== false) conf.ork.hrpc = opts.hrpc || { whitelist: [] }
  if (opts.telemetryPullMs) conf.ork.telemetryPullMs = opts.telemetryPullMs
  if (opts.healthPingMs) conf.ork.healthPingMs = opts.healthPingMs
  conf.ork.discovery = opts.discovery || { topic }

  const ipc = opts.ipc !== false ? (opts.ipc || { path: DEFAULT_IPC_SOCK }) : null
  if (ipc) conf.ork.ipc = ipc

  const ork = new OrkManager(conf, { storeDir, root, loadConf: () => {} })
  await ork.init()
  await ork.start()

  ork.topic = topic
  ork._cleanup = []

  process.once('SIGINT', async () => {
    const forceExit = setTimeout(() => process.exit(0), 3000).unref()
    for (const fn of ork._cleanup) {
      try { await fn() } catch {}
    }
    try { await ork.stop() } catch {}
    clearTimeout(forceExit)
    process.exit(0)
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
 */
async function startWorker (ManagerClass, opts = {}) {
  const rack = opts.rack || 'rack-1'
  const root = opts.root || defaultRoot

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
  let orkTopic = opts.orkTopic || (opts.ork ? opts.ork.topic : null)
  if (!opts.ork) {
    if (!orkTopic) orkTopic = crypto.randomBytes(32).toString('hex')
    const topicFile = opts.topicFile || DEFAULT_TOPIC_FILE
    _ensureDirs(path.dirname(topicFile))
    fs.writeFileSync(topicFile, orkTopic, 'utf8')
  }

  const contract = opts.contract || (workerPackagePath ? _loadContract(workerPackagePath) : null)
  if (!contract) throw new Error('ERR_NO_CONTRACT: provide opts.contract or opts.workerPackagePath with mdk-contract.json')

  const adapterStore = new StoreFacility(null, { storeDir: adapterStoreDir }, {})
  await _startFacility(adapterStore)

  const adapter = new MDKWorkerAdapter(manager, contract, {
    workerId: opts.workerId || `${manager.getThingType()}-${rack}`,
    orkTopic,
    store: adapterStore
  })
  await adapter.start()

  if (opts.ork && opts.ork.registerWorker) {
    await opts.ork.registerWorker(adapter.getPublicKey())
  }

  // manager.stop is callback-based — wait for it so RocksDB/Corestore flush
  // before adapter.stop() and the surrounding process exit. Fire-and-forget
  // here leaves a half-written MANIFEST that crashes the next boot with
  // "IO error: No such file or directory ... MANIFEST-NNNN may be corrupted".
  const stopManager = () => new Promise((resolve) => manager.stop(() => resolve()))

  if (opts.ork && Array.isArray(opts.ork._cleanup)) {
    opts.ork._cleanup.push(async () => {
      await stopManager()
      await adapter.stop()
    })
  } else if (!opts.ork) {
    process.once('SIGINT', async () => {
      setTimeout(() => process.exit(0), 3000).unref()
      try { await stopManager() } catch {}
      try { await adapter.stop() } catch {}
      process.exit(0)
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
 * @param {boolean} [opts.noAuth]        - Skip OAuth plugins; write stub oauth2 config (default: false)
 * @param {object}  [opts.ork]           - ORK instance; cleanup is registered on opts.ork._cleanup
 * @param {*}       [opts.orkIpc]        - IPC socket path, or false to disable MDK client connection
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
  if (opts.noAuth) ctx.noauth = true
  if (opts.ork) ctx.ork = opts.ork
  if (opts.orkIpc !== undefined) ctx.orkIpc = opts.orkIpc
  if (opts.additionalRoutes) ctx.additionalRoutes = opts.additionalRoutes

  // WrkServerHttp constructor calls this.init() + this.start() automatically.
  // bfx-wrk-base emits 'started' (via process.nextTick) when start() completes.
  const hnd = new WrkServerHttp({}, ctx)
  await new Promise((resolve) => hnd.once('started', resolve))

  if (opts.ork && Array.isArray(opts.ork._cleanup)) {
    opts.ork._cleanup.push(() => new Promise((resolve) => hnd.stop(resolve)))
  }

  return hnd
}

async function waitForDiscovery (ork, timeout = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const w = ork.registry.listWorkers()
    const ready = w.filter(wk => wk.state === 'READY' && wk.deviceIds.length > 0)
    if (ready.length > 0) return w
    await sleep(500)
  }
  return ork.registry.listWorkers()
}

module.exports = {
  initialize,
  getOrk,
  startOrk,
  startWorker,
  startAppNode,
  waitForDiscovery,
  DEFAULT_TOPIC_FILE,
  DEFAULT_IPC_SOCK,
  startServices
}
