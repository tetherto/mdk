'use strict'

const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const os = require('os')
const debug = require('debug')('mdk:lifecycle')
const { setTimeout: sleep } = require('timers/promises')
const { KernelManager } = require('@tetherto/mdk-kernel')
const { MDK_STORE } = require('./utils/constants')
const initialize = require('./utils/initialize')
const { startServices } = require('./services')
const {
  keysDir, discoverWorkerKeys, trustedKeysDir, publishTrustedKey, admitTrustedKeys, KERNEL_KEY_NAME
} = require('./lib/local-discovery')
const { startDhtBootstrap, dhtFromEnv, parseBootstrap, parseDhtHost, resolveDhtHost } = require('./lib/dht-bootstrap')

const defaultRoot = path.join(os.homedir(), '.mdk')

// The gateway package, which startGateway boots.
const GATEWAY_PKG = path.dirname(require.resolve('@tetherto/mdk-gateway/package.json'))

// Well-known paths used as defaults when running without explicit configuration.
// Override via opts.topicFile / opts.keyFile if co-locating multiple instances.
const DEFAULT_TOPIC_FILE = path.join(defaultRoot, '.dht-topic')
const DEFAULT_KEY_FILE = path.join(defaultRoot, '.kernel-key')
// Default rendezvous for caller/worker keys (fail-closed RPC admission); a
// getKernel() with the default root uses the same dir.
const DEFAULT_TRUSTED_KEYS_DIR = trustedKeysDir(defaultRoot)

function _ensureDirs (...dirs) {
  for (const d of dirs) fs.mkdirSync(d, { recursive: true, mode: 0o700 })
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

/**
 * Start the Kernel (Orchestration Kernel).
 *
 * When called with no arguments the kernel reads the DHT topic from
 * DEFAULT_TOPIC_FILE (written by a standalone worker boot)
 * and publishes its HRPC public key to DEFAULT_KEY_FILE so clients can
 * connect without any configuration.
 *
 * @param {object} [opts]
 * @param {string} [opts.root]        - Data root dir (default: ~/.mdk)
 * @param {string} [opts.storeDir]    - Override store dir
 * @param {string} [opts.topic]       - DHT topic hex (default: read from topicFile)
 * @param {string} [opts.topicFile]   - Path to topic file (default: DEFAULT_TOPIC_FILE)
 * @param {string|boolean} [opts.keyFile] - Path for the HRPC key file (default: DEFAULT_KEY_FILE); `false` to disable
 * @param {object|false} [opts.hrpc] - HRPC listener config, or `false` to disable it. Admission is
 *                                       fail-closed: only listed callers are admitted.
 * @param {Array<string|{key: string}>} [opts.hrpc.whitelist] - Caller allowlist: the hex DHT public keys
 *                                       that may connect. Default `[]` = nobody until admitted via
 *                                       kernel.allowKey(), startGateway({ kernel }) or the trusted-keys dir.
 *                                       A key only connects: what its caller may do is set by its access
 *                                       token and spec.rbac.
 * @param {Array}  [opts.hrpc.bootstrap] - DHT bootstrap nodes (`'host:port'` or `{ host, port }`); a private
 *                                       list keeps the Kernel off the public HyperDHT (see startDhtBootstrap)
 * @param {string} [opts.hrpc.dhtHost]   - Interface the Kernel's DHT node binds (default all interfaces):
 *                                       `127.0.0.1` for a same-machine stack, a LAN address for an isolated LAN
 * @param {string|false} [opts.trustedKeysDir] - Same-machine key rendezvous (default <root>/.trusted-keys).
 *                                       The Kernel publishes kernel.pub (its worker-dialing key,
 *                                       kernel.getClientPublicKey()) there and admits every other
 *                                       `<name>.pub` as a full-access caller. `false` disables both.
 * @param {object} [opts.discovery]   - Discovery config: { mode: 'dht' | 'local', dir?, workerKeys?, allowAnyWorker? }.
 *                                       Default 'dht' (Hyperswarm topic; works on one host or
 *                                       across machines). 'local' is a faster same-machine option:
 *                                       the Kernel registers workers by the RPC keys they publish to a
 *                                       shared dir (default: <root>/.worker-keys), skipping the topic.
 *                                       Topic admission is fail-closed: only `workerKeys` (or
 *                                       kernel.allowWorkerKey()) register from the topic, unless
 *                                       `allowAnyWorker: true` (development only; logs a warning).
 *                                       kernel.registerWorker() skips the topic allowlist.
 * @param {object|null} [opts.rbac]       - spec.rbac from mdk.yaml, validated and applied at boot (null: the
 *                                       stack has no policy, which denies everything). Omit to keep the
 *                                       last policy applied to this Kernel's store.
 * @param {Array<{name: string, publicKey: string}>} [opts.serviceAccounts] - The exact set of service accounts
 *                                       (apps as `app:<name>`, agents) to register at boot. Omit to keep
 *                                       the registered ones.
 * @param {object} [opts.identity]       - Token issuer settings (issuer, accessTtlSec, refreshTtlSec, ...).
 * @param {boolean} [opts.handleSignals] - Install SIGINT/SIGTERM handlers that drain kernel._cleanup,
 *                                       stop the Kernel and call process.exit(0). Default false
 *                                       (library use): stop it yourself with shutdown(kernel).
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
  // An empty whitelist admits nobody (fail closed); callers are added below.
  conf.kernel.hrpc = opts.hrpc === false ? false : { whitelist: [], ...(opts.hrpc || {}) }
  if (opts.telemetryPullMs) conf.kernel.telemetryPullMs = opts.telemetryPullMs
  if (opts.healthPingMs) conf.kernel.healthPingMs = opts.healthPingMs
  if (opts.statePullMs) conf.kernel.statePullMs = opts.statePullMs
  if (opts.actionIntvlMs) conf.kernel.actionIntvlMs = opts.actionIntvlMs
  if (opts.identity) conf.kernel.identity = opts.identity
  conf.kernel.discovery = mode === 'local'
    ? { mode: 'local', dir: localKeysDir }
    : { ...(opts.discovery || {}), topic: (opts.discovery && opts.discovery.topic) || topic }

  const kernel = new KernelManager(conf, {
    storeDir,
    root,
    loadConf: () => {},
    ...(opts.rbac !== undefined ? { rbac: opts.rbac } : {}),
    ...(opts.serviceAccounts !== undefined ? { serviceAccounts: opts.serviceAccounts } : {})
  })
  await kernel.init()
  await kernel.start()

  if (opts.keyFile !== false) _writeKernelKeyFile(kernel, opts.keyFile || DEFAULT_KEY_FILE)

  kernel.topic = topic
  kernel._cleanup = []

  // Trusted-keys rendezvous: publish the key workers must allow, and admit the
  // callers (Gateway, MCP, CLI) that other processes publish.
  kernel.trustedKeysDir = null
  if (opts.trustedKeysDir !== false && kernel.getClientPublicKey()) {
    const dir = opts.trustedKeysDir || trustedKeysDir(root)
    publishTrustedKey(dir, KERNEL_KEY_NAME, kernel.getClientPublicKey())
    const admitter = admitTrustedKeys(kernel, dir)
    kernel._cleanup.push(async () => admitter.stop())
    kernel.trustedKeysDir = dir
  }

  // Local mode: register workers by the RPC keys they publish to the shared dir,
  // skipping the DHT topic — immediate discovery for same-machine setups.
  if (mode === 'local') {
    const watcher = discoverWorkerKeys(kernel, localKeysDir)
    kernel._cleanup.push(async () => watcher.stop())
  }

  // Library default: leave the process's signals alone (tear down with
  // shutdown(kernel)). Standalone processes opt in with handleSignals.
  if (opts.handleSignals === true) {
    onShutdown(async () => {
      for (const fn of kernel._cleanup) {
        try { await fn() } catch {}
      }
      await kernel.stop()
    })
  }

  return kernel
}

/**
 * Start the Kernel with explicit configuration (backward-compatible).
 * Prefer `getKernel()` for new code.
 */
async function startKernel (opts = {}) {
  return await getKernel(opts)
}

const APP_NAME_RE = /^[a-z][a-z0-9-]*$/
// A literal path segment: no Fastify `:param` / `*` wildcard, no `.` or `..`.
const MOUNT_SEGMENT_RE = /^(?!\.\.?$)[A-Za-z0-9._~-]+$/

// Checked before any boot side effect. Paths are resolved now: the process may
// chdir before a request reads them.
function _normalizeApps (apps = []) {
  if (!Array.isArray(apps)) throw new Error('ERR_GATEWAY_APPS_INVALID: apps must be an array')
  const names = new Set()
  const mounts = new Map()
  return apps.map((app, i) => {
    const { name, appDir, keyFile, mount } = app || {}
    if (typeof name !== 'string' || !APP_NAME_RE.test(name)) throw new Error(`ERR_GATEWAY_APP_NAME_INVALID: apps[${i}].name must match ${APP_NAME_RE}`)
    if (names.has(name)) throw new Error(`ERR_GATEWAY_APP_DUPLICATE: ${name}`)
    names.add(name)
    if (typeof appDir !== 'string' || !appDir) throw new Error(`ERR_GATEWAY_APP_DIR_REQUIRED: ${name}`)
    if (typeof keyFile !== 'string' || !keyFile) throw new Error(`ERR_GATEWAY_APP_KEY_REQUIRED: ${name} needs a keyFile`)
    const out = { name, appDir: path.resolve(appDir), keyFile: path.resolve(keyFile) }
    if (mount != null) {
      if (typeof mount !== 'string' || !mount.startsWith('/')) throw new Error(`ERR_GATEWAY_APP_MOUNT_INVALID: ${name}: mount must start with "/"`)
      const segments = mount.split('/').filter(Boolean)
      if (!segments.every((s) => MOUNT_SEGMENT_RE.test(s))) {
        throw new Error(`ERR_GATEWAY_APP_MOUNT_INVALID: ${name}: mount "${mount}" must be literal path segments (no ":", "*", "." or "..")`)
      }
      out.mount = '/' + segments.join('/')
    }
    const effective = out.mount || `/apps/${name}`
    if (mounts.has(effective) && effective !== '/') {
      throw new Error(`ERR_GATEWAY_APP_MOUNT_DUPLICATE: ${name} and ${mounts.get(effective)} are both mounted at ${effective}`)
    }
    mounts.set(effective, name)
    return out
  })
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
 * @param {string}  [opts.root]          - Config/data root dir (default: ~/.mdk/gateway)
 * @param {number}  [opts.port]          - HTTP port (default: 3000)
 * @param {string}  [opts.env]           - Environment string (default: 'development')
 * @param {string}  [opts.tmpdir]        - Isolate the corestore under this dir instead of a
 *                                         CWD-relative path (defaults to root when env==='test')
 * @param {object}  [opts.kernel]           - Kernel instance; cleanup is registered on opts.kernel._cleanup
 * @param {*}       [opts.kernelKey]        - Kernel HRPC listener public key (hex/Buffer); `false` to run
 *                                            without a Kernel connection. Default: resolved from opts.kernel,
 *                                            then the key file.
 * @param {string}  [opts.keyFile]       - Key file to resolve the Kernel key from (default: DEFAULT_KEY_FILE)
 * @param {Array}   [opts.bootstrap]     - DHT bootstrap nodes for every DHT node the gateway starts: its net
 *                                         facility (Kernel/Worker client key), the Kernel client and the app
 *                                         runtime client. A private list keeps it off the public HyperDHT
 * @param {string}  [opts.dhtHost]       - Interface those DHT nodes bind (default all interfaces)
 * @param {Array}   [opts.apps]          - The apps this gateway mounts — all of them. Each runs in its own
 *                                         runtime process (@tetherto/mdk-app-runtime); the gateway reads only
 *                                         its route table and forwards every request over HRPC.
 *                                         Entry: `{ name, appDir, keyFile, mount? }` — `keyFile` is where the
 *                                         runtime publishes its key (re-read per request; 503 until then),
 *                                         `mount` defaults to `/apps/<name>` (`/` mounts at the root).
 * @param {string}  [opts.gatewayKeyFile] - Where the gateway writes its runtime-client public key once
 *                                          serving: the key app runtimes allow-list (`allowedKeyFiles`).
 * @param {object}  [opts.common]        - Overrides for common.json
 * @param {object}  [opts.httpd]         - Overrides for httpd.config.json
 * @param {object}  [opts.net]           - Overrides for net.config.json
 * @param {object}  [opts.store]         - Overrides for store.config.json
 * @param {object}  [opts.logging]       - Overrides for logging.config.json
 * @param {Array}   [opts.additionalRoutes] - Extra Fastify routes to register
 * @param {object}  [opts.authority]     - What checks every app route against spec.rbac (see
 *                                         @tetherto/mdk-gateway workers/lib/authority.js). Default: the
 *                                         in-process opts.kernel's issuer and policy, else a Kernel reached
 *                                         at opts.kernelKey as opts.gatewayCredential. With one, every app
 *                                         route needs a bearer token and a rule, and /auth/login|refresh|
 *                                         logout|me are served.
 * @param {{name: string, privateKey: string}} [opts.gatewayCredential] - The Gateway's service account,
 *                                         for a Kernel in another process: it reads the policy (`policy: read`).
 * @param {Function} [opts.authVerifier] - Without an authority only: `async (request, route) => identity | false`.
 *                                         Gates every app route whose manifest says `auth: true` (401 when
 *                                         absent or falsy); the identity becomes the controller's `req._info`.
 *                                         Routes without `auth: true` stay open.
 * @param {string[]} [opts.allowedHosts] - Extra Host header values to serve (`name` or `name:port`);
 *                                         loopback on `port` is always allowed. `['*']` disables the check.
 * @param {*}       [opts.trustProxy]    - Fastify trustProxy (default: false)
 * @param {number}  [opts.bodyLimit]     - Max request body in bytes (default: 1048576)
 * @param {object|false} [opts.rateLimit] - @fastify/rate-limit options (default: 300 per minute per IP);
 *                                          false disables
 * @param {object|false} [opts.helmet]   - @fastify/helmet options; false disables
 * @param {string|false} [opts.trustedKeysDir] - Where to publish the gateway's Kernel/Worker client key
 *                                         (status.rpcClientKey) as `<trustedKeyName>.pub`, so a Kernel and
 *                                         workers in other processes admit it. Default: opts.kernel's dir,
 *                                         else DEFAULT_TRUSTED_KEYS_DIR. `false` disables. With opts.kernel
 *                                         the key is also admitted in-process (kernel.allowKey).
 * @param {string}  [opts.trustedKeyName] - File name for that key (default 'gateway')
 * @param {boolean} [opts.handleSignals] - Standalone gateway (no opts.kernel) only: install
 *                                         SIGINT/SIGTERM handlers that stop it and call
 *                                         process.exit(0). Default false — use shutdown(hnd).
 * @returns {Promise<object>}  WrkServerHttp instance (already started)
 */
async function startGateway (opts = {}) {
  if (opts.extraPluginDirs !== undefined) {
    throw new Error('ERR_GATEWAY_EXTRA_PLUGIN_DIRS_UNSUPPORTED: extraPluginDirs is not supported; run each app with @tetherto/mdk-app-runtime and pass it in apps: [{ name, appDir, keyFile, mount? }]')
  }
  const apps = _normalizeApps(opts.apps)
  const kernelKey = _resolveKernelKey(opts)
  const root = opts.root || path.join(defaultRoot, 'gateway')
  const facsDir = path.join(root, 'config', 'facs')
  const facsExampleDir = path.join(GATEWAY_PKG, 'config', 'facs')

  _ensureDirs(facsDir, path.join(root, 'db'), path.join(root, 'status'), path.join(root, 'store'), path.join(root, 'workers'))

  // Stub so that code paths using bfx-svc-boot-js worker path resolution still work
  const wrkStubPath = path.join(root, 'workers', 'http.node.wrk.js')
  if (!fs.existsSync(wrkStubPath)) {
    fs.writeFileSync(
      wrkStubPath,
      `'use strict'\nmodule.exports = require(${JSON.stringify(path.join(GATEWAY_PKG, 'workers', 'http.node.wrk'))})\n`
    )
  }

  _writeConfigWithOverride(
    path.join(GATEWAY_PKG, 'config', 'common.json.example'),
    path.join(root, 'config', 'common.json'),
    opts.common || {}
  )

  const facMappings = [
    ['httpd.config.json', opts.httpd || {}],
    ['net.config.json', opts.net || {}],
    ['store.config.json', opts.store || {}],
    ['logging.config.json', opts.logging || {}]
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
  const WrkServerHttp = require('@tetherto/mdk-gateway/workers/http.node.wrk')

  const ctx = {
    root,
    wtype: 'wrk-node-http',
    env: opts.env || 'development',
    port: opts.port || 3000,
    shard: opts.shard || 0
  }
  // The gateway keeps its corestore at `<tmpdir || root>/store/http`, never
  // relative to the working directory, so gateways sharing a working dir don't
  // contend for one RocksDB lock (ERR: "File descriptor could not be locked" →
  // a half-open corestore that later surfaces as "Corestore is closed"). Honour
  // an explicit tmpdir, and in test env default it to root so each instance is
  // hermetic under its own data dir.
  if (opts.tmpdir) ctx.tmpdir = opts.tmpdir
  else if (ctx.env === 'test') ctx.tmpdir = root
  if (opts.kernel) ctx.kernel = opts.kernel
  if (kernelKey) ctx.kernelKey = kernelKey
  // A Kernel in another process admits this Gateway by its net facility's DHT
  // key (gateway.pub), so the authority's Kernel client dials with that key.
  // It is read on first connect, once the facility is up.
  let hnd = null
  const authority = _resolveAuthority(opts, kernelKey, () => hnd && hnd.net_r0 && hnd.net_r0.dht && hnd.net_r0.dht.defaultKeyPair)
  if (authority) ctx.authority = authority
  if (opts.bootstrap) ctx.kernelBootstrap = opts.bootstrap
  if (opts.dhtHost) ctx.kernelDhtHost = opts.dhtHost
  if (apps.length) ctx.apps = apps
  if (opts.gatewayKeyFile) ctx.gatewayKeyFile = path.resolve(opts.gatewayKeyFile)
  if (opts.additionalRoutes) ctx.additionalRoutes = opts.additionalRoutes
  // HTTP hardening (see @tetherto/mdk-gateway workers/lib/security.js); unset
  // keys fall back to common.json, then to the gateway's safe defaults.
  for (const key of ['authVerifier', 'allowedHosts', 'trustProxy', 'bodyLimit', 'rateLimit', 'helmet']) {
    if (opts[key] !== undefined) ctx[key] = opts[key]
  }

  // WrkServerHttp constructor calls this.init() + this.start() automatically.
  // bfx-wrk-base emits 'started' (via process.nextTick) when start() completes.
  hnd = new WrkServerHttp({}, ctx)
  await new Promise((resolve) => hnd.once('started', resolve))

  _trustGatewayKey(hnd, opts)

  if (opts.kernel && Array.isArray(opts.kernel._cleanup)) {
    opts.kernel._cleanup.push(() => new Promise((resolve) => hnd.stop(resolve)))
  } else if (!opts.kernel && opts.handleSignals === true) {
    // Standalone gateway that opted in: own SIGINT/SIGTERM. Otherwise the
    // caller stops it via shutdown(hnd) / hnd.stop().
    onShutdown(() => new Promise((resolve) => hnd.stop(resolve)))
  }

  return hnd
}

// What enforces spec.rbac at this Gateway: given outright, the in-process
// Kernel's own issuer and policy, or a Kernel in another process reached as
// the Gateway's service account, dialing with `gatewayKeyPair()`. None: the
// older authVerifier path.
function _resolveAuthority (opts, kernelKey, gatewayKeyPair) {
  const { localAuthority, remoteAuthority } = require('@tetherto/mdk-gateway/workers/lib/authority')
  if (opts.authority) return opts.authority
  if (opts.kernel && opts.kernel.identity && opts.kernel.rbac) return localAuthority(opts.kernel)
  if (opts.gatewayCredential && kernelKey) {
    const { createMdkClient } = require('@tetherto/mdk-client')
    return remoteAuthority({
      client: createMdkClient({
        kernelKey,
        kernelKeyPair: gatewayKeyPair,
        kernelCredential: opts.gatewayCredential,
        ...(opts.bootstrap ? { kernelBootstrap: opts.bootstrap } : {}),
        ...(opts.dhtHost ? { kernelDhtHost: opts.dhtHost } : {})
      })
    })
  }
  return null
}

// The Kernel is fail-closed, so the gateway's client key (the one plugin
// clients dial with) must be admitted: directly on an in-process Kernel, and
// through the trusted-keys dir for a Kernel in another process. Workers admit
// the Kernel only.
function _trustGatewayKey (hnd, opts) {
  const key = hnd.status && hnd.status.rpcClientKey
  if (!key) return
  if (opts.kernel && typeof opts.kernel.allowKey === 'function') opts.kernel.allowKey(key)
  if (opts.trustedKeysDir === false) return
  const dir = opts.trustedKeysDir || (opts.kernel && opts.kernel.trustedKeysDir) ||
    (opts.kernel ? null : DEFAULT_TRUSTED_KEYS_DIR)
  if (dir) publishTrustedKey(dir, opts.trustedKeyName || 'gateway', key)
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
  DEFAULT_TRUSTED_KEYS_DIR,
  startServices,

  // Private HyperDHT network (local / air-gapped profile)
  startDhtBootstrap,
  dhtFromEnv,
  parseBootstrap,
  parseDhtHost,
  resolveDhtHost,

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
  // Telemetry aggregation ops (applyStats/tallyStats, groupBy, getVal)
  libStats: require('./lib/stats'),
  utils: require('./lib/utils')
}
