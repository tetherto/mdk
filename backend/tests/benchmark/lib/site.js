'use strict'

// Shared boot primitives for the capacity/metrics benchmark harness — device
// seeding, Kernel/Worker boot, mock miner servers. config/benchmark.config.json
// is the single source of truth for topology (ports, discovery mode, which
// worker types/models/device counts to run); this module just wires it up.
// The device set isn't a fixed devices.json — it's generated per profile
// from a `workers` spec ([{ type, model, devices, simulateMocks }]) so the
// same code sizes every sweep.

const path = require('path')
const fs = require('fs')
const debug = require('debug')('mdk:benchmark:site')
const { getKernel, startGateway } = require('@tetherto/mdk-core')
const { WorkerRuntimeV2 } = require('@tetherto/mdk-worker')
const { createAppRuntime } = require('@tetherto/mdk-app-runtime')
const { createMdkClient } = require('@tetherto/mdk-client')
const { remoteAuthority } = require('@tetherto/mdk-gateway/workers/lib/authority')
const {
  publishWorkerKey, keysDir, trustedKeysDir, waitForKernelKey, trustKernel, trustKeysFromDir,
  publishTrustedKey, callerKeyPair
} = require('@tetherto/mdk-core/lib/local-discovery')
const { generateCredential, gatewayTokenRequest, ServiceAccountTokenSource } = require('@tetherto/mdk-identity')
const { WORKER_REGISTRY, MOCK_PORT_RANGE, HOST, DISCOVERY, ROOT, KERNEL_DEFAULTS, WORKER_CONF_DEFAULTS, MINER_DEVICE_TIMEOUT_MS, GATEWAY_PLUGIN_DIR, GATEWAY_DEFAULTS } = require('./constants')

const benchmarkDir = path.join(__dirname, '..')
const config = require(path.join(benchmarkDir, 'config', 'benchmark.config.json'))

function loadConfig () {
  return config
}

// Root data dir is namespaced per profile id so concurrent/sequential runs
// never share a Hyperbee store or worker-keys dir.
function profileRoot (profileId) {
  return path.join(benchmarkDir, ROOT, profileId)
}

function validateWorkerSpec ({ type, model }) {
  const entry = WORKER_REGISTRY[type]
  if (!entry) throw new Error(`ERR_UNSUPPORTED_WORKER_TYPE: ${type} (supported: ${Object.keys(WORKER_REGISTRY).join(', ')})`)
  if (!entry.models.includes(model)) throw new Error(`ERR_UNSUPPORTED_MODEL: ${model} for ${type} (supported: ${entry.models.join(', ')})`)
}

// scenarios/benchmark.js sweeps this entry's device count from
// ceiling.startDeviceCount up to ceiling.maxDeviceCount in
// ceiling.stepDeviceCount increments — start/step must fall inside
// [1, maxDeviceCount] or the sweep would start past its own ceiling or never
// move. maxDeviceCount: 0 is a sentinel for "uncapped" — the sweep keeps
// raising this entry's device count until a step goes red instead of
// stopping at a fixed ceiling, so start/step then only need to be >= 1.
// Only allowed when it's the only entry in config.workers: every entry now
// runs simultaneously and sweeps the Cartesian product of every entry's
// range, and an unbounded dimension can't be combined into a finite product.
function validateCeilingSpec ({ type, ceiling }, { allowUncapped }) {
  if (!ceiling) throw new Error(`ERR_MISSING_CEILING: workers[] entry for ${type} needs a ceiling: { startDeviceCount, stepDeviceCount, maxDeviceCount }`)
  const { startDeviceCount, stepDeviceCount, maxDeviceCount } = ceiling
  if (!Number.isInteger(maxDeviceCount) || maxDeviceCount < 0) {
    throw new Error(`ERR_INVALID_CEILING_MAX: ${type} ceiling.maxDeviceCount (${maxDeviceCount}) must be a non-negative integer (0 = uncapped, sweep until a step goes red)`)
  }
  if (maxDeviceCount === 0 && !allowUncapped) {
    throw new Error(`ERR_UNCAPPED_CEILING_WITH_MULTIPLE_WORKERS: ${type} ceiling.maxDeviceCount can only be 0 (uncapped) when it's the only entry in config.workers — with more than one entry, every ceiling.maxDeviceCount must be a positive integer so the Cartesian product of device counts stays finite`)
  }
  const upperBound = maxDeviceCount === 0 ? Infinity : maxDeviceCount
  if (!Number.isInteger(startDeviceCount) || startDeviceCount < 1 || startDeviceCount > upperBound) {
    throw new Error(`ERR_INVALID_CEILING_START: ${type} ceiling.startDeviceCount (${startDeviceCount}) must be an integer >= 1${maxDeviceCount === 0 ? '' : ` and <= maxDeviceCount (${maxDeviceCount})`}`)
  }
  if (!Number.isInteger(stepDeviceCount) || stepDeviceCount < 1 || stepDeviceCount > upperBound) {
    throw new Error(`ERR_INVALID_CEILING_STEP: ${type} ceiling.stepDeviceCount (${stepDeviceCount}) must be an integer >= 1${maxDeviceCount === 0 ? '' : ` and <= maxDeviceCount (${maxDeviceCount})`}`)
  }
}

for (const spec of config.workers) {
  validateWorkerSpec(spec)
  validateCeilingSpec(spec, { allowUncapped: config.workers.length === 1 })
}

// --- device seeding ------------------------------------------------------

function pickPort (usedPorts) {
  const { min, max } = MOCK_PORT_RANGE
  let port
  do { port = min + Math.floor(Math.random() * (max - min)) } while (usedPorts.has(port))
  usedPorts.add(port)
  return port
}

// Builds one worker (and its devices) per entry in `workerSpecs`
// ([{ type, model, devices, simulateMocks }]) — every device under a worker
// shares that worker's own randomly picked, run-unique mock port (one mock
// server per worker, not one per device) and the auth password the target
// worker type's mock defaults to. Also reserves a Gateway HTTP port from the
// same pool, so it can never collide with a worker's mock port.
//
// `usedPorts` can be passed in (and is mutated) so two device plans that
// will run concurrently on the same host — e.g. a real profile and its
// zero-device baseline — never pick colliding ports.
function makeDevicePlan ({ workers: workerSpecs, workerIdPrefix = 'bench-worker', usedPorts = new Set() }) {
  const devices = []

  const workers = workerSpecs.map((spec, w) => {
    validateWorkerSpec(spec)
    const { defaultPassword } = WORKER_REGISTRY[spec.type]
    const simulateMocks = spec.simulateMocks !== false
    const port = pickPort(usedPorts)

    const workerDevices = Array.from({ length: spec.devices }, (_, i) => {
      const device = {
        type: spec.type,
        model: spec.model,
        simulateMocks,
        info: { serialNum: `BENCH-${w}-${String(i + 1).padStart(5, '0')}`, container: 'bench-rack' },
        opts: {
          address: HOST,
          port,
          password: defaultPassword
        }
      }
      devices.push(device)
      return device
    })

    return { workerId: `${workerIdPrefix}-${w}`, type: spec.type, model: spec.model, port, password: defaultPassword, simulateMocks, devices: workerDevices }
  })

  const gatewayPort = pickPort(usedPorts)

  return { devices, workers, gatewayPort }
}

function devicePlanPath (root) {
  return path.join(root, 'device-plan.json')
}

function saveDevicePlan (root, devicePlan) {
  fs.writeFileSync(devicePlanPath(root), JSON.stringify(devicePlan))
}

function loadDevicePlan (root) {
  return JSON.parse(fs.readFileSync(devicePlanPath(root), 'utf8'))
}

// --- mock device servers ---------------------------------------------------

function mockHandles (mocks) {
  const ready = Promise.all(mocks.map((m) => m.ready))
  const close = () => { for (const m of mocks) { try { m.exit() } catch {} } }
  return { mocks, ready, close }
}

// One mock server per worker (not per device) — every device under a
// worker dials the same address:port, so they all hit this single server.
// Only `port`/`type`/`password` are needed per entry: `type` is the model
// (the same key `createServer` itself expects), and the worker family that
// owns that model is looked up in WORKER_REGISTRY rather than passed in,
// since model names never collide across families.
function findWorkerFamilyByModel (model) {
  const family = Object.keys(WORKER_REGISTRY).find((type) => WORKER_REGISTRY[type].models.includes(model))
  if (!family) throw new Error(`ERR_UNSUPPORTED_MODEL: no worker type in WORKER_REGISTRY supports model ${model}`)
  return family
}

function startMocks (specs) {
  return mockHandles(specs.map(({ port, type, password }) => {
    const family = findWorkerFamilyByModel(type)
    return WORKER_REGISTRY[family].mock.createServer({ port, host: HOST, type, password })
  }))
}

// --- Kernel + worker boot ------------------------------------------------------

// --- RBAC: service accounts + policy -----------------------------------------

// Every HRPC caller needs an access token and every Gateway app route a bearer
// token. This throwaway stack binds its three service accounts — the harness's
// own client, the Gateway (reads the policy) and the fleet app's runtime — to
// one full-access role: the benchmark measures the data path, not policy shape.
const HARNESS_ACCOUNT = 'bench-harness'
const GATEWAY_ACCOUNT = 'mdk-gateway'
const FLEET_APP_ACCOUNT = 'app:fleet'
const STACK_ACCOUNTS = [HARNESS_ACCOUNT, GATEWAY_ACCOUNT, FLEET_APP_ACCOUNT]

function stackPolicy () {
  return {
    roles: [{ name: 'bench-admin', rules: [{ resources: ['*'], verbs: ['*'] }] }],
    bindings: [{ role: 'bench-admin', subjects: STACK_ACCOUNTS.map((name) => ({ kind: 'ServiceAccount', name })) }]
  }
}

// Generated once per root and read back by every process booted under it (the
// Kernel registers the public keys; each caller signs in with its private key),
// so a restarted Kernel or Gateway keeps the same accounts.
function stackCredentials (root) {
  const file = path.join(root, 'credentials.json')
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'))
  const creds = Object.fromEntries(STACK_ACCOUNTS.map((name) => [name, generateCredential()]))
  fs.mkdirSync(root, { recursive: true })
  fs.writeFileSync(file, JSON.stringify(creds), { mode: 0o600 })
  return creds
}

// What a Kernel client signs in with: { name, privateKey }.
function signingCredential (root, name) {
  return { name, privateKey: stackCredentials(root)[name].privateKeyPem }
}

// Bearer tokens for the harness's own HTTP calls to Gateway app routes, signed
// in at the Gateway's /auth/token and renewed before they expire.
function gatewayTokenSource (root, baseUrl) {
  const { name, privateKey } = signingCredential(root, HARNESS_ACCOUNT)
  return new ServiceAccountTokenSource({ name, privateKey, request: gatewayTokenRequest(baseUrl) })
}

// `mode`: 'local' (register the worker by the RPC key it publishes to the
// shared dir) or 'dht' (Hyperswarm topic; `topic` pins it).
async function bootKernel ({ root, topic, mode = DISCOVERY } = {}) {
  const creds = stackCredentials(root)
  const opts = {
    root,
    rbac: stackPolicy(),
    serviceAccounts: STACK_ACCOUNTS.map((name) => ({ name, publicKey: creds[name].publicKey })),
    storeDir: path.join(root, 'kernel-db'),
    telemetryPullMs: KERNEL_DEFAULTS.telemetryPullMs,
    healthPingMs: KERNEL_DEFAULTS.healthPingMs,
    // Benchmark processes exit on Ctrl-C/SIGTERM (mdk-core no longer does
    // this by default).
    handleSignals: true
  }
  if (mode === 'local') {
    opts.discovery = { mode: 'local' }
  } else {
    opts.topicFile = path.join(root, '.dht-topic')
    if (topic) opts.topic = topic
    // Topic admission is fail-closed. Split-process workers' RPC keys are not
    // known here, so this throwaway benchmark Kernel admits any Worker on the
    // topic (logs a warning).
    opts.discovery = { mode: 'dht', allowAnyWorker: true }
  }
  return getKernel(opts)
}

// With an in-process kernel handle, register directly and chain cleanup onto
// it; without one (split/multi-process mode), publish the RPC key to the
// shared local-discovery dir and bind SIGINT/SIGTERM.
// Worker RPC is fail-closed and admits the Kernel's client key only:
// in-process from the Kernel, otherwise its kernel.pub in the trusted-keys dir.
async function workerTrust ({ kernel, root }) {
  if (kernel) return [kernel.getClientPublicKey()]
  return [await waitForKernelKey(trustedKeysDir(root), { timeoutMs: 60000 })]
}

// Keep following the Kernel's key after boot.
function followTrust (handle, { kernel, root }) {
  const follower = kernel ? trustKernel(handle.runtime, kernel) : trustKeysFromDir(handle.runtime, trustedKeysDir(root))
  const stop = handle.stop.bind(handle)
  handle.stop = async (...args) => {
    follower.stop()
    return stop(...args)
  }
}

// A persistent harness client identity, published so the separately-running
// Kernel and workers admit it. Spread into createMdkClient's config.
function harnessClientConfig (root) {
  const kernelKeyPair = callerKeyPair(path.join(root, 'harness-identity'))
  publishTrustedKey(trustedKeysDir(root), 'harness', kernelKeyPair.publicKey)
  return { kernelKeyPair, kernelCredential: signingCredential(root, HARNESS_ACCOUNT) }
}

async function registerWorker (handle, workerId, { kernel, root, mode }) {
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

function workerStoreDir (root, workerId) {
  const storeDir = path.join(root, 'workers', workerId, 'store')
  fs.mkdirSync(storeDir, { recursive: true })
  return storeDir
}

// Hosts one Worker package on WorkerRuntimeV2 with the plan's device list.
// The runtime's poll interval is set to WORKER_CONF_DEFAULTS.collectSnapsItvMs
// so the worker actually samples at the cadence every "Configured ... interval"
// row and headroomRatio in the report assume; `conf.timeout` is the real
// per-device RPC timeout the Thing base class otherwise defaults to 10000 ms
// (MINER_DEVICE_TIMEOUT_MS, the number that bounds a live pullTelemetry() /
// sendCommand() against a hung device; processes/run-process.js's
// device-outage drill uses the same constant for its analytical worst case).
// Device ids are the plan's serial numbers; `info` is what aggregate reads
// label a device by.
async function bootWorker ({ workerId, type, kernel, kernelTopic, root, mode = DISCOVERY, devices }) {
  const { pkgDir } = WORKER_REGISTRY[type]
  const runtime = new WorkerRuntimeV2(pkgDir, {
    workerId,
    allowedKeys: await workerTrust({ kernel, root }),
    storeDir: workerStoreDir(root, workerId),
    kernelTopic: (!kernel && mode !== 'local') ? kernelTopic : null,
    config: {
      telemetryPollIntervalMs: WORKER_CONF_DEFAULTS.collectSnapsItvMs,
      conf: { timeout: MINER_DEVICE_TIMEOUT_MS }
    },
    devices: devices.map((d) => ({ deviceId: d.info.serialNum, config: { ...d.opts }, info: d.info })),
    // The zero-device baseline profile (run-process.js) boots a worker with no devices.
    allowEmptyDevices: true
  })
  await runtime.start()
  const handle = { runtime, stop: () => runtime.stop() }

  await registerWorker(handle, workerId, { kernel, root, mode })
  debug('worker %s (%s) up: %d devices', workerId, type, devices.length)
  return handle
}

// Enforces spec.rbac on every app route against the separately-running
// Kernel, signed in as the Gateway's own account (it reads the policy). Built
// here rather than via startGateway's gatewayCredential: that path dials with
// a throwaway key the fail-closed Kernel never admits, so this client dials
// with a persistent identity published to the trusted-keys dir, and waits for
// the Kernel to admit it before the Gateway reads the policy at start.
async function gatewayAuthority ({ root, kernelKey }) {
  const kernelKeyPair = callerKeyPair(path.join(root, 'gateway-authority-identity'))
  publishTrustedKey(trustedKeysDir(root), 'gateway-authority', kernelKeyPair.publicKey)
  const client = createMdkClient({ kernelKey, kernelKeyPair, kernelCredential: signingCredential(root, GATEWAY_ACCOUNT) })
  await client.connect({ warmup: true, warmupRetries: 10 })
  return remoteAuthority({ client })
}

// Boots the one Gateway every profile run carries, mounting the harness's own
// generic fleet-summary app (GATEWAY_PLUGIN_DIR) at the root — never a
// site-specific app, so the harness stays device-family agnostic. The app runs
// in an app runtime (started here, in the Gateway's process, so resource
// sampling of the gateway role covers it) and the Gateway forwards to it over
// HRPC; the runtime only accepts the Gateway's key (gatewayKeyFile).
// env: 'test' is required (not just tmpdir) — startGateway's
// underlying corestore only honors an explicit tmpdir when env==='test';
// otherwise every Gateway process, across every profile, shares one
// CWD-relative corestore path and any two whose lifetimes overlap in time
// (e.g. two profile runs started close together) hit an FD lock collision.
async function bootGateway ({ root, port, kernelKey }) {
  const gatewayRoot = path.join(root, 'gateway')
  fs.mkdirSync(gatewayRoot, { recursive: true })
  const runDir = path.join(gatewayRoot, 'run')
  fs.mkdirSync(runDir, { recursive: true })
  const gatewayKeyFile = path.join(runDir, 'gateway.key')
  const appKeyFile = path.join(runDir, 'fleet.key')

  const runtime = createAppRuntime({
    name: 'fleet',
    appDir: GATEWAY_PLUGIN_DIR,
    kernelKey,
    storeDir: path.join(gatewayRoot, 'fleet-app'),
    keyFile: appKeyFile,
    allowedKeyFiles: [gatewayKeyFile],
    credential: signingCredential(root, FLEET_APP_ACCOUNT),
    // The separately-running Kernel is fail-closed and admits keys published here.
    kernelKeyFile: path.join(trustedKeysDir(root), 'app-fleet.pub')
  })
  await runtime.start()

  // No handleSignals: the gateway role binds its own SIGINT/SIGTERM.
  const gateway = await startGateway({
    // publish the gateway client key for the separately-running Kernel/workers
    trustedKeysDir: trustedKeysDir(root),
    env: 'test',
    kernelKey,
    port,
    root: gatewayRoot,
    tmpdir: gatewayRoot,
    apps: [{ name: 'fleet', appDir: GATEWAY_PLUGIN_DIR, keyFile: appKeyFile, mount: '/' }],
    gatewayKeyFile,
    rateLimit: GATEWAY_DEFAULTS.rateLimit,
    authority: await gatewayAuthority({ root, kernelKey })
  })

  // One handle: stopping the Gateway stops its app runtime too.
  const stop = gateway.stop.bind(gateway)
  gateway.stop = (cb) => { runtime.stop().catch(() => {}).then(() => stop(cb)) }
  return gateway
}

module.exports = {
  benchmarkDir,
  config,
  HOST,
  DISCOVERY,
  loadConfig,
  profileRoot,
  validateWorkerSpec,
  validateCeilingSpec,
  makeDevicePlan,
  saveDevicePlan,
  loadDevicePlan,
  startMocks,
  bootKernel,
  bootWorker,
  bootGateway,
  registerWorker,
  harnessClientConfig,
  gatewayTokenSource,
  stackPolicy,
  stackCredentials,
  signingCredential,
  workerStoreDir
}
