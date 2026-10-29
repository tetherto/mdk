'use strict'

const EventEmitter = require('events')
const path = require('path')
const fs = require('fs')
const debug = require('debug')('mdk:kernel')
const StoreFacility = require('@tetherto/hp-svc-facs-store')

const { WorkerRegistry } = require('./modules/worker-registry')
const { CommandDispatcher } = require('./modules/command-dispatcher')
const { CommandStateMachine } = require('./modules/command-state-machine')
const { CommandLog } = require('./modules/command-log')
const { TelemetryCollector } = require('./modules/telemetry-collector')
const { Scheduler } = require('./modules/scheduler')
const { HealthMonitor } = require('./modules/health-monitor')
const { DHTListener } = require('./discovery/dht-listener')
const { HRPCListener } = require('./transport/hrpc-listener')
const { WorkerChannel } = require('./transport/worker-channel')
const { createStores } = require('./storage/stores')
const { ActionCaller } = require('./modules/action-caller')
const { ActionManager } = require('./modules/action-manager')
const ActionApproverFacility = require('@tetherto/svc-facs-action-approver')
const { PolicyStore, validatePolicy } = require('@tetherto/mdk-rbac')
const { TokenIssuer } = require('@tetherto/mdk-identity')
const { KernelAuthorizer } = require('./transport/authorizer')

/**
 * MDK Kernel Manager — Orchestration Kernel
 *
 * Standalone lib class following the ThingManager/MinerManager pattern.
 * Does NOT extend TetherWrkBase — creates its own facilities.
 *
 * Usage:
 *   const kernel = new KernelManager({}, { storeDir: './store', root: './config' })
 *   await kernel.init()
 *   await kernel.start()
 *   // ... running ...
 *   await kernel.stop()
 *
 * Modules:
 *   WorkerRegistry, CommandDispatcher, CommandStateMachine,
 *   TelemetryCollector, Scheduler, HealthMonitor
 *
 * RBAC:
 *   The spec.rbac in force lives in the `kernel-rbac` sub-bee (PolicyStore).
 *   ctx.rbac, when given (the stack's mdk.yaml, including `null` for a stack
 *   with no policy), is validated in init() and applied at start(); without it
 *   the last applied policy is reloaded. No policy at all denies everything.
 *
 * Authorization:
 *   Every HRPC request is authorized by KernelAuthorizer: an access token in
 *   `envelope.auth`, checked against spec.rbac per device or worker it touches.
 *   Each decision is emitted as 'authz-decision'. The caller allowlist still
 *   decides who may connect at all.
 *
 * Identity:
 *   The token issuer (TokenIssuer) lives in the `kernel-identity` sub-bee:
 *   users, service accounts, signing keys and sessions. conf.kernel.identity
 *   sets its issuer name and lifetimes. ctx.serviceAccounts, when given (the
 *   stack's apps and agents with their public keys), is the exact set of
 *   service accounts registered at start().
 *
 * Transports:
 *   HRPCListener (@hyperswarm/rpc). Fail-closed: only allowlisted caller keys
 *   (conf.kernel.hrpc.whitelist, or allowKey() at runtime) are admitted; an
 *   empty allowlist admits nobody. Admission only lets a key connect.
 *
 * Discovery:
 *   DHTListener (Hyperswarm topic). Fail-closed: only Worker RPC keys on
 *   conf.kernel.discovery.workerKeys (or allowWorkerKey() at runtime) register
 *   from the topic; an empty list admits nobody unless
 *   conf.kernel.discovery.allowAnyWorker is true. registerWorker() and local
 *   discovery hand keys in directly and skip the topic allowlist.
 */
class KernelManager extends EventEmitter {
  constructor (conf, ctx) {
    super()
    this.conf = conf || {}
    this.ctx = ctx || {}

    this.loadConf = ctx.loadConf || this._defaultLoadConf.bind(this)

    // Facilities
    this.store_s0 = null
    this.actionApprover_0 = null

    // Stores
    this.stores = null

    // Modules
    this.registry = null
    this.dispatcher = null
    this.stateMachine = null
    this.telemetryCollector = null
    this.scheduler = null
    this.healthMonitor = null
    this.actionCaller = null
    this.actionManager = null
    this.rbac = null
    this.identity = null
    this.authorizer = null

    // Transport & discovery
    this.hrpcListener = null
    this.dhtListener = null
    this.workerChannel = null

    this._initialized = false
    this._started = false
  }

  // ─── Lifecycle ──────────────────────────────────────────────────

  async init () {
    if (this._initialized) return

    this.loadConf('kernel', 'kernel')
    if (this.conf.kernel && this.conf.kernel.hrpc && this.conf.kernel.hrpc.allowAll !== undefined) {
      throw new Error('ERR_KERNEL_ALLOW_ALL_REMOVED: hrpc.allowAll is gone; admit callers by key (whitelist, allowKey)')
    }

    // An invalid policy refuses the boot before anything is opened.
    if (this.ctx.rbac !== undefined) validatePolicy(this.ctx.rbac)
    if (this.ctx.serviceAccounts !== undefined && !Array.isArray(this.ctx.serviceAccounts)) {
      throw new Error('ERR_KERNEL_SERVICE_ACCOUNTS_INVALID: serviceAccounts must be a list of { name, publicKey }')
    }

    await this._createFacilities(this.ctx)
    await this._initStores()
    await this._initModules()
    await this._initTransports()

    this._initialized = true
    debug('kernel initialized')
  }

  async start () {
    if (!this._initialized) throw new Error('ERR_KERNEL_NOT_INITIALIZED')
    if (this._started) return

    await this._recoverState()
    await this._startModules()

    this._started = true
    this.emit('started')
    debug('kernel started')
  }

  async stop () {
    if (!this._started) return

    debug('kernel stopping...')

    if (this.scheduler) this.scheduler.stop()
    if (this.healthMonitor) this.healthMonitor.stop()
    if (this.stateMachine) await this.stateMachine.drain()
    if (this.dhtListener) await this.dhtListener.stop()
    if (this.hrpcListener) await this.hrpcListener.stop()
    if (this.stores) await this.stores.close()

    if (this._ownsFacilities) {
      if (this.actionApprover_0) await this._stopFacility(this.actionApprover_0)
      if (this.store_s0) await this._stopFacility(this.store_s0)
    }

    this._started = false
    this.emit('stopped')
    debug('kernel stopped')
  }

  // ─── Public API ─────────────────────────────────────────────────

  getPublicKey () {
    return this.hrpcListener ? this.hrpcListener.getPublicKey() : null
  }

  /**
   * The public key this Kernel dials workers with. Workers must allow it
   * (WorkerRuntime `allowedKeys`) to accept the Kernel's requests. Available
   * after start(); null when HRPC is disabled.
   * @returns {Buffer|null}
   */
  getClientPublicKey () {
    return this.hrpcListener ? this.hrpcListener.getClientPublicKey() : null
  }

  /**
   * Admit an HRPC caller (Gateway, MCP server, CLI client) at runtime.
   * Admission is fail-closed: callers not on the allowlist are rejected.
   *
   * Admission only lets the key connect: what it may do is decided per request
   * by its access token and spec.rbac.
   *
   * @param {string|Buffer} key - caller DHT public key (hex or Buffer)
   * @returns {string} the normalized hex key
   */
  allowKey (key) {
    if (!this.hrpcListener) throw new Error('ERR_KERNEL_NO_HRPC: call init() first, or HRPC is disabled')
    const hex = this.hrpcListener.allowKey(key)
    this.emit('caller-allowed', { key: hex })
    return hex
  }

  /** Hex keys currently admitted. */
  listAllowedKeys () {
    return this.hrpcListener ? this.hrpcListener.listAllowedKeys() : []
  }

  /** The RBAC record in force ({ version, appliedAt, source, policy, ... }), or null. */
  getRbac () {
    return this.rbac ? this.rbac.info() : null
  }

  /**
   * Validate, persist and switch to a new spec.rbac. Throws
   * ERR_RBAC_POLICY_INVALID (the policy in force is kept) for an invalid one.
   * @returns {Promise<{ changed: boolean, record: object }>}
   */
  async applyRbac (rbac, meta) {
    if (!this.rbac) throw new Error('ERR_KERNEL_NOT_INITIALIZED')
    return this.rbac.apply(rbac, meta)
  }

  /**
   * Verify an access token this Kernel issued. A token bound to a transport
   * key verifies only with that key as `cnf`. Throws ERR_IDENTITY_TOKEN_*.
   * @returns {object} claims
   */
  verifyToken (token, opts) {
    if (!this.identity) throw new Error('ERR_KERNEL_NOT_INITIALIZED')
    return this.identity.verify(token, opts)
  }

  /** Remove an HRPC caller; later requests from it are rejected. */
  revokeKey (key) {
    if (!this.hrpcListener) return false
    const had = this.hrpcListener.revokeKey(key)
    if (had) this.emit('caller-revoked', { key: Buffer.isBuffer(key) ? key.toString('hex') : String(key).toLowerCase() })
    return had
  }

  /**
   * Directly register a worker by its RPC public key.
   * Use this when the kernel and worker are in the same process
   * (skips DHT discovery, connects via RPC key directly).
   *
   * @param {string|Buffer} rpcKey - Worker's RPC public key (hex string or Buffer)
   */
  async registerWorker (rpcKey) {
    if (!this._started) throw new Error('ERR_KERNEL_NOT_STARTED')
    if (!this.dhtListener) throw new Error('ERR_KERNEL_NO_DISCOVERY: kernel has no discovery configured')
    const keyHex = Buffer.isBuffer(rpcKey) ? rpcKey.toString('hex') : rpcKey
    return this.dhtListener._onWorkerKeyReceived(keyHex)
  }

  /**
   * Admit a Worker RPC key on the discovery topic at runtime. Topic discovery
   * is fail-closed: a Worker announcing a key that is not allowed is ignored.
   * Not needed for registerWorker() or local discovery.
   *
   * @param {string|Buffer} rpcKey - Worker's RPC public key (hex string or Buffer)
   * @returns {string} the normalized hex key
   */
  allowWorkerKey (rpcKey) {
    if (!this.dhtListener) throw new Error('ERR_KERNEL_NO_DISCOVERY: kernel has no discovery configured')
    return this.dhtListener.allowWorkerKey(rpcKey)
  }

  // ─── Facility Management (same pattern as ThingManager) ─────────

  async _createFacilities (ctx) {
    if (ctx.facs) {
      this.store_s0 = ctx.facs.store_s0
      return
    }

    const storeDir = ctx.storeDir || 'store/kernel-db'

    this.store_s0 = new StoreFacility(this, { storeDir }, ctx)
    await this._startFacility(this.store_s0)

    this.actionApprover_0 = new ActionApproverFacility(this, {}, this.ctx)
    await this._startFacility(this.actionApprover_0)

    this._ownsFacilities = true
  }

  _startFacility (facility) {
    return new Promise((resolve, reject) => {
      facility.start((err) => (err ? reject(err) : resolve()))
    })
  }

  _stopFacility (facility) {
    return new Promise((resolve, reject) => {
      if (typeof facility.stop !== 'function') return resolve()
      facility.stop((err) => (err ? reject(err) : resolve()))
    })
  }

  // ─── Config Loading (same pattern as ThingManager) ──────────────

  _defaultLoadConf (name, group = null) {
    const root = this.ctx.root || ''
    const configPath = path.join(root, 'config', `${name}.json`)
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      Object.assign(this.conf, group ? { [group]: data } : data)
    }
  }

  // ─── Internal Init ──────────────────────────────────────────────

  async _initStores () {
    this.stores = await createStores(this.store_s0)
    debug('stores initialized')
  }

  async _initModules () {
    const orkConf = this.conf.kernel || {}

    this.workerChannel = new WorkerChannel({
      timeout: orkConf.commandTimeoutMs || 30000
    })

    this.registry = new WorkerRegistry({
      store: this.stores.registry,
      capabilityStore: this.stores.capabilities
    })

    this.telemetryCollector = new TelemetryCollector({
      registry: this.registry,
      workerChannel: this.workerChannel
    })

    this.stateMachine = new CommandStateMachine({
      wal: this.stores.commandWal,
      workerChannel: this.workerChannel,
      registry: this.registry,
      telemetryCollector: this.telemetryCollector,
      timeoutMs: orkConf.commandTimeoutMs || 30000,
      resultTtlMs: orkConf.commandResultTtlMs,
      verifyIntervalMs: orkConf.commandVerifyIntervalMs
    })

    this.commandLog = new CommandLog({
      store: this.stores.commandLog,
      ttlMs: orkConf.commandLogTtlMs
    })
    this.stateMachine.on('command:done', ({ commandId, state, error }) => {
      this.commandLog.append({ event: 'settled', commandId, outcome: state, error: error || null })
        .catch(err => debug('command log append failed: %s', err.message))
    })

    this.dispatcher = new CommandDispatcher({
      registry: this.registry,
      stateMachine: this.stateMachine,
      commandLog: this.commandLog
    })

    this.healthMonitor = new HealthMonitor({
      registry: this.registry,
      workerChannel: this.workerChannel,
      failureThreshold: orkConf.healthFailureThreshold || 3
    })

    this.scheduler = new Scheduler({
      telemetryCollector: this.telemetryCollector,
      healthMonitor: this.healthMonitor,
      registry: this.registry,
      workerChannel: this.workerChannel,
      dhtListener: null, // set after transports are initialized
      cadences: {
        telemetryPullMs: orkConf.telemetryPullMs || 10000,
        statePullMs: orkConf.statePullMs || 5000,
        healthPingMs: orkConf.healthPingMs || 5000
      }
    })

    this.actionCaller = new ActionCaller({
      registry: this.registry,
      workerChannel: this.workerChannel,
      dispatcher: this.dispatcher,
      callTargetsLimit: orkConf.callTargetsLimit || 50,
      getWriteCallsLimit: orkConf.getWriteCallsLimit || 5
    })

    this.actionManager = new ActionManager({
      actionApprover: this.actionApprover_0,
      actionCaller: this.actionCaller,
      store: this.stores.actionApprover,
      actionIntvlMs: orkConf.actionIntvlMs || 30000
    })

    this.rbac = new PolicyStore({ bee: this.stores.rbac })

    const idConf = orkConf.identity || {}
    this.identity = new TokenIssuer({
      bee: this.stores.identity,
      issuer: idConf.issuer,
      audience: idConf.audience,
      accessTtlSec: idConf.accessTtlSec,
      refreshTtlSec: idConf.refreshTtlSec,
      familyTtlSec: idConf.familyTtlSec,
      assertionMaxTtlSec: idConf.assertionMaxTtlSec,
      ...(idConf.scryptParams ? { scryptParams: idConf.scryptParams } : {})
    })

    this.authorizer = new KernelAuthorizer({
      identity: this.identity,
      rbac: this.rbac,
      registry: this.registry,
      stateMachine: this.stateMachine
    })
    this.authorizer.on('decision', (d) => this.emit('authz-decision', d))

    debug('modules initialized')
  }

  async _initTransports () {
    const orkConf = this.conf.kernel || {}

    if (orkConf.hrpc !== false) {
      this.hrpcListener = new HRPCListener({
        dispatcher: this.dispatcher,
        telemetryCollector: this.telemetryCollector,
        registry: this.registry,
        actionManager: this.actionManager,
        rbac: this.rbac,
        identity: this.identity,
        authorizer: this.authorizer,
        whitelist: (orkConf.hrpc && orkConf.hrpc.whitelist) || [],
        bootstrap: (orkConf.hrpc && orkConf.hrpc.bootstrap) || null,
        dhtHost: (orkConf.hrpc && orkConf.hrpc.dhtHost) || null,
        store: this.store_s0
      })
    }

    // Local mode has no topic — the listener is still needed for its
    // discoverWorker(rpcKey) hook (connect-by-key over HRPC). start() no-ops the
    // swarm when topic is undefined, so the only change here is to instantiate it.
    if (orkConf.discovery && (orkConf.discovery.topic || orkConf.discovery.mode === 'local')) {
      this.dhtListener = new DHTListener({
        topic: orkConf.discovery.topic,
        workerKeys: orkConf.discovery.workerKeys,
        allowAnyWorker: orkConf.discovery.allowAnyWorker === true,
        registry: this.registry,
        workerChannel: this.workerChannel
      })
    }

    debug('transports initialized')
  }

  async _recoverState () {
    await this.registry.recover()
    await this.stateMachine.recover()
    try {
      await this.rbac.load()
    } catch (err) {
      // A stored policy that no longer validates (an upgrade tightened the
      // rules): the spec.rbac handed in below replaces it. Until it does the
      // policy store is deny-all; with nothing to replace it, refuse to start.
      if (this.ctx.rbac === undefined || !String(err.message).startsWith('ERR_RBAC_POLICY_INVALID')) throw err
      debug('stored rbac policy no longer valid, replacing it with the one given: %s', err.message.split('\n')[0])
    }
    if (this.ctx.rbac !== undefined) {
      const { changed, record } = await this.rbac.apply(this.ctx.rbac, { source: 'boot' })
      debug('rbac policy %s %s', record.version, changed ? 'applied' : 'unchanged')
    }
    await this.identity.ready()
    if (this.ctx.serviceAccounts !== undefined) {
      const { added, updated, removed } = await this.identity.syncServiceAccounts(this.ctx.serviceAccounts)
      debug('service accounts: +%d ~%d -%d', added.length, updated.length, removed.length)
    }
    debug('state recovered')
  }

  async _startModules () {
    if (this.hrpcListener) {
      await this.hrpcListener.start()
      const rpc = this.hrpcListener.getRpc()
      if (rpc) this.workerChannel.setRpc(rpc)

      // Share the DHT with DHTListener so we have one network identity
      if (this.dhtListener) {
        this.dhtListener.setDht(this.hrpcListener.getDht())
      }
    }

    if (this.dhtListener) {
      await this.dhtListener.start()
      this.scheduler.dhtListener = this.dhtListener
    }

    this.scheduler.start()
    this.healthMonitor.start()
    await this.actionManager.start()

    debug('all modules started')
  }
}

module.exports = KernelManager
