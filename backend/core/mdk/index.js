'use strict'

const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const os = require('os')
const debug = require('debug')('mdk:lifecycle')
const { setTimeout: sleep } = require('timers/promises')
const { KernelManager } = require('../kernel')
const { MDK_STORE } = require('./utils/constants')
const initialize = require('./utils/initialize')
const { startServices } = require('./services')
const { keysDir, discoverWorkerKeys } = require('./lib/local-discovery')

const defaultRoot = path.join(os.tmpdir(), 'mdk')

// Well-known paths used as defaults when running without explicit configuration.
// Override via opts.topicFile / opts.keyFile if co-locating multiple instances.
const DEFAULT_TOPIC_FILE = path.join(defaultRoot, '.dht-topic')
const DEFAULT_KEY_FILE = path.join(defaultRoot, '.kernel-key')

function _ensureDirs (...dirs) {
  for (const d of dirs) fs.mkdirSync(d, { recursive: true })
}

// Publish the Kernel HRPC public key to a well-known file so out-of-process
// clients (gateway, CLIs) can connect without configuration. The file is not
// removed on shutdown: the key is stable across restarts (seeds persist in the
// kernel store), so a leftover file stays correct for the same storeDir.
function _writeKernelKeyFile (kernel, keyFile) {
  const key = kernel.getPublicKey()
  if (!key) return
  _ensureDirs(path.dirname(keyFile))
  fs.writeFileSync(keyFile, key.toString('hex'), 'utf8')
  debug('kernel key file written: %s', keyFile)
}

// Resolve the Kernel HRPC key for startGateway before any boot side effects,
// so a missing key fails fast. `kernelKey: false` means run without a Kernel
// connection (mdkClient stays null in the gateway worker).
function _resolveKernelKey (opts) {
  if (opts.kernelKey === false) return null
  if (opts.kernelKey) return Buffer.isBuffer(opts.kernelKey) ? opts.kernelKey.toString('hex') : opts.kernelKey
  if (opts.kernel && typeof opts.kernel.getPublicKey === 'function') {
    const key = opts.kernel.getPublicKey()
    if (key) return key.toString('hex')
  }
  const keyFile = opts.keyFile || DEFAULT_KEY_FILE
  if (fs.existsSync(keyFile)) {
    const key = fs.readFileSync(keyFile, 'utf8').trim()
    if (key) return key
  }
  throw new Error(`ERR_KERNEL_KEY_FILE_NOT_FOUND: no kernel key at ${keyFile} — start the Kernel first, pass opts.kernelKey/opts.kernel, or set kernelKey: false to run without a Kernel connection`)
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

/**
 * Start the Kernel (Orchestration Kernel).
 *
 * When called with no arguments the kernel reads the DHT topic from
 * DEFAULT_TOPIC_FILE (written by a standalone worker boot)
 * and publishes its HRPC public key to DEFAULT_KEY_FILE so clients can
 * connect without any configuration.
 *
 * @param {object} [opts]
 * @param {string} [opts.root]        - Data root dir (default: os.tmpdir()/mdk)
 * @param {string} [opts.storeDir]    - Override store dir
 * @param {string} [opts.topic]       - DHT topic hex (default: read from topicFile)
 * @param {string} [opts.topicFile]   - Path to topic file (default: DEFAULT_TOPIC_FILE)
 * @param {string|boolean} [opts.keyFile] - Path for the HRPC key file (default: DEFAULT_KEY_FILE); `false` to disable
 * @param {object} [opts.hrpc]        - HRPC config (default: enabled)
 * @param {object} [opts.discovery]   - Discovery config: { mode: 'dht' | 'local', dir? }.
 *                                       Default 'dht' (Hyperswarm topic; works on one host or
 *                                       across machines). 'local' is a faster same-machine option:
 *                                       the Kernel registers workers by the RPC keys they publish to a
 *                                       shared dir (default: <root>/.worker-keys), skipping the topic.
 */
async function getKernel (opts = {}) {
  const root = opts.root || defaultRoot
  const storeDir = opts.storeDir || path.join(root, MDK_STORE, 'kernel-db')
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

  const conf = { kernel: {} }
  // Propagate `false` explicitly — the manager treats an absent hrpc conf as enabled.
  conf.kernel.hrpc = opts.hrpc === false ? false : (opts.hrpc || { whitelist: [] })
  if (opts.telemetryPullMs) conf.kernel.telemetryPullMs = opts.telemetryPullMs
  if (opts.healthPingMs) conf.kernel.healthPingMs = opts.healthPingMs
  if (opts.actionIntvlMs) conf.kernel.actionIntvlMs = opts.actionIntvlMs
  conf.kernel.discovery = mode === 'local' ? { mode: 'local', dir: localKeysDir } : (opts.discovery || { topic })

  const kernel = new KernelManager(conf, { storeDir, root, loadConf: () => {} })
  await kernel.init()
  await kernel.start()

  if (opts.keyFile !== false) _writeKernelKeyFile(kernel, opts.keyFile || DEFAULT_KEY_FILE)

  kernel.topic = topic
  kernel._cleanup = []

  // Local mode: register workers by the RPC keys they publish to the shared dir,
  // skipping the DHT topic — immediate discovery for same-machine setups.
  if (mode === 'local') {
    const watcher = discoverWorkerKeys(kernel, localKeysDir)
    kernel._cleanup.push(async () => watcher.stop())
  }

  onShutdown(async () => {
    for (const fn of kernel._cleanup) {
      try { await fn() } catch {}
    }
    await kernel.stop()
  })

  return kernel
}

/**
 * Start the Kernel with explicit configuration (backward-compatible).
 * Prefer `getKernel()` for new code.
 */
async function startKernel (opts = {}) {
  const root = opts.root || defaultRoot
  const storeDir = opts.storeDir || path.join(root, MDK_STORE, 'kernel-db')
  _ensureDirs(storeDir)

  const conf = { kernel: {} }
  conf.kernel.hrpc = opts.hrpc === false ? false : (opts.hrpc || { whitelist: [] })
  if (opts.discovery) conf.kernel.discovery = opts.discovery
  if (opts.telemetryPullMs) conf.kernel.telemetryPullMs = opts.telemetryPullMs
  if (opts.healthPingMs) conf.kernel.healthPingMs = opts.healthPingMs

  const kernel = new KernelManager(conf, { storeDir, root, loadConf: opts.loadConf || undefined })
  await kernel.init()
  await kernel.start()
  if (opts.keyFile) _writeKernelKeyFile(kernel, opts.keyFile)
  return kernel
}

/**
 * Start the gateway HTTP server programmatically.
 *
 * Writes config files under `opts.root` using example defaults deep-merged
 * with any overrides supplied in opts.  Files that already exist and have no
 * corresponding override are left untouched — they remain user-editable
 * fallbacks, consistent with the rest of the MDK architecture.
 *
 * @param {object}  [opts]
 * @param {string}  [opts.root]          - Config/data root dir (default: os.tmpdir()/mdk/gateway)
 * @param {number}  [opts.port]          - HTTP port (default: 3000)
 * @param {string}  [opts.env]           - Environment string (default: 'development')
 * @param {string}  [opts.tmpdir]        - Isolate the corestore under this dir instead of a
 *                                         CWD-relative path (defaults to root when env==='test')
 * @param {boolean} [opts.noAuth]        - Skip OAuth plugins; write stub oauth2 config (default: false)
 * @param {object}  [opts.kernel]           - Kernel instance; cleanup is registered on opts.kernel._cleanup
 * @param {*}       [opts.kernelKey]        - Kernel HRPC listener public key (hex/Buffer); `false` to run
 *                                            without a Kernel connection. Default: resolved from opts.kernel,
 *                                            then the key file.
 * @param {string}  [opts.keyFile]       - Key file to resolve the Kernel key from (default: DEFAULT_KEY_FILE)
 * @param {Array}   [opts.bootstrap]     - DHT bootstrap nodes for the Client (testnets)
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
async function startGateway (opts = {}) {
  const kernelKey = _resolveKernelKey(opts)
  const gatewayPkg = path.resolve(__dirname, '..', 'gateway')
  const root = opts.root || path.join(defaultRoot, 'gateway')
  const facsDir = path.join(root, 'config', 'facs')
  const facsExampleDir = path.join(gatewayPkg, 'config', 'facs')

  _ensureDirs(facsDir, path.join(root, 'db'), path.join(root, 'status'), path.join(root, 'store'), path.join(root, 'workers'))

  // Stub so that code paths using bfx-svc-boot-js worker path resolution still work
  const wrkStubPath = path.join(root, 'workers', 'http.node.wrk.js')
  if (!fs.existsSync(wrkStubPath)) {
    fs.writeFileSync(
      wrkStubPath,
      `'use strict'\nmodule.exports = require(${JSON.stringify(path.join(gatewayPkg, 'workers', 'http.node.wrk'))})\n`
    )
  }

  _writeConfigWithOverride(
    path.join(gatewayPkg, 'config', 'common.json.example'),
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
  // in gateway/node_modules are found by Node's normal resolution algorithm.
  const WrkServerHttp = require('../gateway/workers/http.node.wrk')

  const ctx = {
    root,
    wtype: 'wrk-node-http',
    env: opts.env || 'development',
    port: opts.port || 3000,
    shard: opts.shard || 0
  }
  // tether-wrk-base resolves the corestore to a CWD-relative `store/<storeDir>`
  // unless env==='test' AND ctx.tmpdir is set, in which case it lives under
  // tmpdir. The CWD-relative default makes every gateway sharing a working dir
  // contend for one RocksDB lock (ERR: "File descriptor could not be locked" →
  // a half-open corestore that later surfaces as "Corestore is closed"). Honour
  // an explicit tmpdir, and in test env default it to root so each instance is
  // hermetic under its own data dir.
  if (opts.tmpdir) ctx.tmpdir = opts.tmpdir
  else if (ctx.env === 'test') ctx.tmpdir = root
  if (opts.noAuth) ctx.noauth = true
  if (opts.kernel) ctx.kernel = opts.kernel
  if (kernelKey) {
    ctx.kernelKey = kernelKey
    if (opts.bootstrap) ctx.kernelBootstrap = opts.bootstrap
  }
  if (opts.extraPluginDirs) ctx.extraPluginDirs = opts.extraPluginDirs
  if (opts.additionalRoutes) ctx.additionalRoutes = opts.additionalRoutes

  // WrkServerHttp constructor calls this.init() + this.start() automatically.
  // bfx-wrk-base emits 'started' (via process.nextTick) when start() completes.
  const hnd = new WrkServerHttp({}, ctx)
  await new Promise((resolve) => hnd.once('started', resolve))

  if (opts.kernel && Array.isArray(opts.kernel._cleanup)) {
    opts.kernel._cleanup.push(() => new Promise((resolve) => hnd.stop(resolve)))
  } else if (!opts.kernel) {
    // No kernel to register cleanup onto (standalone gateway): own the signal.
    onShutdown(() => new Promise((resolve) => hnd.stop(resolve)))
  }

  return hnd
}

// Wait until the registry holds `minWorkers` READY workers (with ≥1 device unless
// requireDevices is false); return the worker list (current list on timeout).
// Back-compat: a numeric second arg is read as timeoutMs.
async function waitForDiscovery (kernel, opts = {}) {
  const o = (typeof opts === 'number') ? { timeoutMs: opts } : opts
  const { minWorkers = 1, requireDevices = true, timeoutMs = 30000, intervalMs = 500 } = o
  const ready = () => kernel.registry.listWorkers()
    .filter(w => w.state === 'READY' && (!requireDevices || (w.deviceIds || []).length > 0))
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (ready().length >= minWorkers) return kernel.registry.listWorkers()
    await sleep(intervalMs)
  }
  return kernel.registry.listWorkers()
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
// _cleanup, then stop via the handle's top-level stop() (kernel/gateway/
// runtime worker). Idempotent and partial-handle safe.
async function shutdown (handle) {
  if (!handle || handle.__mdkShutdownDone) return

  if (Array.isArray(handle._cleanup)) {
    for (const fn of handle._cleanup) {
      try { await fn() } catch (err) { debug('cleanup error: %s', err && err.message) }
    }
  }

  if (typeof handle.stop === 'function') {
    // kernel.stop() resolves a promise; gateway hnd.stop(cb) calls back.
    await new Promise((resolve) => {
      const r = handle.stop(resolve)
      if (r && typeof r.then === 'function') r.then(resolve, resolve)
    })
  }

  handle.__mdkShutdownDone = true
}

module.exports = {
  initialize,
  getKernel,
  startKernel,
  startGateway,
  waitForDiscovery,
  onShutdown,
  shutdown,
  DEFAULT_TOPIC_FILE,
  DEFAULT_KEY_FILE,
  startServices,

  // Worker-side infra: injectable services, device layer, and templates
  LogsService: require('./lib/services/logs.service'),
  LogHistoryService: require('./lib/services/log-history.service'),
  SettingsService: require('./lib/services/settings.service'),
  CommentsService: require('./lib/services/comments.service'),
  AlertsService: require('./lib/services/alerts.service'),
  StatsService: require('./lib/services/stats.service'),
  SnapsService: require('./lib/services/snaps.service'),
  ActionsService: require('./lib/services/actions.service'),
  DeviceProvisioningService: require('./lib/services/provisioning.service'),
  PoolService: require('./lib/services/pool.service'),
  Thing: require('./lib/things/thing'),
  Miner: require('./lib/things/miner'),
  Container: require('./lib/things/container'),
  PowerMeter: require('./lib/things/powermeter'),
  Sensor: require('./lib/things/sensor'),
  constants: require('./lib/things/constants'),
  templates: {
    alerts: require('./lib/templates/alerts'),
    stats: require('./lib/templates/stats')
  },
  utils: require('./lib/utils')
}
