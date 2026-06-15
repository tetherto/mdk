'use strict'

const EventEmitter = require('events')
const path = require('path')
const fs = require('fs')
const debug = require('debug')('mdk:ork')
const StoreFacility = require('@tetherto/hp-svc-facs-store')
const IntervalsFacility = require('@bitfinex/bfx-facs-interval')

const { WorkerRegistry } = require('./modules/worker-registry')
const { CommandDispatcher } = require('./modules/command-dispatcher')
const { CommandStateMachine } = require('./modules/command-state-machine')
const { TelemetryCollector } = require('./modules/telemetry-collector')
const { Scheduler } = require('./modules/scheduler')
const { HealthMonitor } = require('./modules/health-monitor')
const { DHTListener } = require('./discovery/dht-listener')
const { HRPCGateway } = require('./transport/hrpc-gateway')
const { IPCGateway } = require('./transport/ipc-gateway')
const { WorkerChannel } = require('./transport/worker-channel')
const { createStores } = require('./storage/stores')

/**
 * MDK ORK Manager — Orchestration Kernel
 *
 * Standalone lib class following the ThingManager/MinerManager pattern.
 * Does NOT extend TetherWrkBase — creates its own facilities.
 *
 * Usage:
 *   const ork = new OrkManager({}, { storeDir: './store', root: './config' })
 *   await ork.init()
 *   await ork.start()
 *   // ... running ...
 *   await ork.stop()
 *
 * Modules:
 *   WorkerRegistry, CommandDispatcher, CommandStateMachine,
 *   TelemetryCollector, Scheduler, HealthMonitor
 *
 * Transports:
 *   HRPCGateway (@hyperswarm/rpc), IPCGateway (Unix socket)
 *
 * Discovery:
 *   DHTListener (Hyperswarm topic)
 */
class OrkManager extends EventEmitter {
  constructor (conf, ctx) {
    super()
    this.conf = conf || {}
    this.ctx = ctx || {}

    this.loadConf = ctx.loadConf || this._defaultLoadConf.bind(this)

    // Facilities
    this.store_s0 = null
    this.interval_0 = null

    // Stores
    this.stores = null

    // Modules
    this.registry = null
    this.dispatcher = null
    this.stateMachine = null
    this.telemetryCollector = null
    this.scheduler = null
    this.healthMonitor = null

    // Transport & discovery
    this.hrpcGateway = null
    this.ipcGateway = null
    this.dhtListener = null
    this.workerChannel = null

    this._initialized = false
    this._started = false
  }

  // ─── Lifecycle ──────────────────────────────────────────────────

  async init () {
    if (this._initialized) return

    this.loadConf('ork', 'ork')

    await this._createFacilities(this.ctx)
    await this._initStores()
    await this._initModules()
    await this._initTransports()

    this._initialized = true
    debug('ork initialized')
  }

  async start () {
    if (!this._initialized) throw new Error('ERR_ORK_NOT_INITIALIZED')
    if (this._started) return

    await this._recoverState()
    await this._startModules()

    this._started = true
    this.emit('started')
    debug('ork started')
  }

  async stop () {
    if (!this._started) return

    debug('ork stopping...')

    if (this.scheduler) this.scheduler.stop()
    if (this.healthMonitor) this.healthMonitor.stop()
    if (this.stateMachine) await this.stateMachine.drain()
    if (this.dhtListener) await this.dhtListener.stop()
    if (this.hrpcGateway) await this.hrpcGateway.stop()
    if (this.ipcGateway) await this.ipcGateway.stop()
    if (this.stores) await this.stores.close()

    if (this._ownsFacilities) {
      if (this.interval_0) await this._stopFacility(this.interval_0)
      if (this.store_s0) await this._stopFacility(this.store_s0)
    }

    this._started = false
    this.emit('stopped')
    debug('ork stopped')
  }

  // ─── Public API ─────────────────────────────────────────────────

  getPublicKey () {
    return this.hrpcGateway ? this.hrpcGateway.getPublicKey() : null
  }

  /**
   * Directly register a worker by its RPC public key.
   * Use this when the ork and worker are in the same process
   * (skips DHT discovery, connects via RPC key directly).
   *
   * @param {string|Buffer} rpcKey - Worker's RPC public key (hex string or Buffer)
   */
  async registerWorker (rpcKey) {
    if (!this._started) throw new Error('ERR_ORK_NOT_STARTED')
    if (!this.dhtListener) throw new Error('ERR_ORK_NO_DISCOVERY: ork has no discovery configured')
    const keyHex = Buffer.isBuffer(rpcKey) ? rpcKey.toString('hex') : rpcKey
    return this.dhtListener._onWorkerKeyReceived(keyHex)
  }

  // ─── Facility Management (same pattern as ThingManager) ─────────

  async _createFacilities (ctx) {
    if (ctx.facs) {
      this.store_s0 = ctx.facs.store_s0
      this.interval_0 = ctx.facs.interval_0
      return
    }

    const storeDir = ctx.storeDir || 'store/ork-db'

    this.store_s0 = new StoreFacility(this, { storeDir }, ctx)
    await this._startFacility(this.store_s0)

    this.interval_0 = new IntervalsFacility(this, {}, ctx)
    await this._startFacility(this.interval_0)

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
    const orkConf = this.conf.ork || {}

    this.workerChannel = new WorkerChannel({
      timeout: orkConf.commandTimeoutMs || 30000
    })

    this.registry = new WorkerRegistry({
      store: this.stores.registry,
      capabilityStore: this.stores.capabilities
    })

    this.stateMachine = new CommandStateMachine({
      wal: this.stores.commandWal,
      workerChannel: this.workerChannel,
      registry: this.registry,
      maxRetries: orkConf.commandMaxRetries || 3,
      timeoutMs: orkConf.commandTimeoutMs || 30000
    })

    this.dispatcher = new CommandDispatcher({
      registry: this.registry,
      stateMachine: this.stateMachine
    })

    this.telemetryCollector = new TelemetryCollector({
      registry: this.registry,
      workerChannel: this.workerChannel
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

    debug('modules initialized')
  }

  async _initTransports () {
    const orkConf = this.conf.ork || {}

    if (orkConf.hrpc !== false) {
      this.hrpcGateway = new HRPCGateway({
        dispatcher: this.dispatcher,
        telemetryCollector: this.telemetryCollector,
        registry: this.registry,
        whitelist: (orkConf.hrpc && orkConf.hrpc.whitelist) || [],
        store: this.store_s0
      })
    }

    if (orkConf.ipc) {
      this.ipcGateway = new IPCGateway({
        dispatcher: this.dispatcher,
        telemetryCollector: this.telemetryCollector,
        registry: this.registry,
        path: orkConf.ipc.path || '/tmp/mdk-ork.sock'
      })
    }

    if (orkConf.discovery && orkConf.discovery.topic) {
      this.dhtListener = new DHTListener({
        topic: orkConf.discovery.topic,
        registry: this.registry,
        workerChannel: this.workerChannel
      })
    }

    debug('transports initialized')
  }

  async _recoverState () {
    await this.registry.recover()
    await this.stateMachine.recover()
    debug('state recovered')
  }

  async _startModules () {
    if (this.hrpcGateway) {
      await this.hrpcGateway.start()
      const rpc = this.hrpcGateway.getRpc()
      if (rpc) this.workerChannel.setRpc(rpc)

      // Share the DHT with DHTListener so we have one network identity
      if (this.dhtListener) {
        this.dhtListener.setDht(this.hrpcGateway.getDht())
      }
    }

    if (this.ipcGateway) await this.ipcGateway.start()
    if (this.dhtListener) {
      await this.dhtListener.start()
      this.scheduler.dhtListener = this.dhtListener
    }

    this.scheduler.start()
    this.healthMonitor.start()

    debug('all modules started')
  }
}

module.exports = OrkManager
