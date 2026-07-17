'use strict'

const crypto = require('crypto')
const HyperswarmRPC = require('@hyperswarm/rpc')
const Hyperswarm = require('hyperswarm')
const DHT = require('hyperdht')
const debug = require('debug')('mdk:worker:runtime')
const { ACTIONS } = require('../../kernel/lib/protocol/actions')
const { buildResponse, serialize, deserialize } = require('../../kernel/lib/protocol/envelope')
const { loadPlugin } = require('./plugin-loader')
const { telemetryBuiltin, commandBuiltin, mergeBuiltinCommands } = require('./service-builtins')

/**
 * Generic host for a Worker Plugin: N same-type devices behind one HRPC
 * channel to the Kernel. The plugin is loaded (never subclassed); every
 * command/telemetry handler is invoked with the addressed device's context
 * ({ deviceId, device, config }) and its return value is wrapped into the
 * MDK Protocol envelope here. Handlers never see envelopes or transport.
 *
 * The device list is fixed at construction. A device whose connect() fails
 * is held as `offline` (requests to it return ERR_DEVICE_UNAVAILABLE) so one
 * unreachable unit cannot take down its siblings.
 *
 * `opts.services` (optional) injects worker-infra services (logs, comments,
 * settings, stats, provisioning, write-call approval). When present, the
 * runtime serves the legacy adapter surface from them as built-ins (see
 * service-builtins.js) and exposes the same object to handlers as
 * ctx.services. Services are process-owned, never plugin-owned.
 */
class WorkerRuntime {
  constructor (plugin, opts) {
    opts = opts || {}
    if (!opts.workerId || typeof opts.workerId !== 'string') throw new Error('ERR_WORKER_ID_REQUIRED')

    this._plugin = loadPlugin(plugin)
    this.workerId = opts.workerId
    this.kernelTopic = opts.kernelTopic || null
    this.store = opts.store || null
    this.services = opts.services || null
    this._publishedContract = mergeBuiltinCommands(this._plugin.publishedContract, this.services)

    this._commandParamNames = new Map()
    for (const entry of this._plugin.contract.capabilities.commands || []) {
      this._commandParamNames.set(entry.name, (entry.params || []).map((p) => p.name))
    }
    // Optional DHT bootstrap override. Defaults to hyperdht's public bootstrap;
    // set only for a custom DHT network or hermetic tests (hyperdht/testnet).
    this._bootstrap = opts.bootstrap || null

    this._devices = new Map()
    for (const spec of this._validateDeviceSpecs(opts.devices, opts.allowEmptyDevices)) {
      this._devices.set(spec.deviceId, {
        deviceId: spec.deviceId,
        config: spec.config,
        device: null,
        ctx: null,
        status: 'offline',
        error: null
      })
    }

    this._rpc = null
    this._server = null
    this._swarm = null
    this._discovery = null
    this._announceTimer = null
    this._dht = null
    this._confBee = null
  }

  // allowEmpty supports provisioning-first bootstrap: a fresh worker boots
  // with no devices, receives registerThing writes, and is restarted with
  // the provisioned set. Without the flag an empty list stays an error.
  _validateDeviceSpecs (devices, allowEmpty) {
    if (allowEmpty && (!devices || (Array.isArray(devices) && devices.length === 0))) return []
    if (!Array.isArray(devices) || devices.length === 0) throw new Error('ERR_DEVICES_REQUIRED')
    const seen = new Set()
    return devices.map((spec) => {
      if (!spec || typeof spec.deviceId !== 'string' || !spec.deviceId) throw new Error('ERR_DEVICE_ID_MISSING')
      if (seen.has(spec.deviceId)) throw new Error(`ERR_DEVICE_ID_DUPLICATE: ${spec.deviceId}`)
      seen.add(spec.deviceId)
      if (spec.config !== undefined && (typeof spec.config !== 'object' || spec.config === null)) {
        throw new Error(`ERR_DEVICE_CONFIG_INVALID: ${spec.deviceId}`)
      }
      return { deviceId: spec.deviceId, config: spec.config || {} }
    })
  }

  async start () {
    await this._openContexts()

    const seedDht = await this._getOrCreateSeed('seedDht')
    const seedRpc = await this._getOrCreateSeed('seedRpc')

    this._dht = new DHT({ keyPair: DHT.keyPair(seedDht), ...(this._bootstrap ? { bootstrap: this._bootstrap } : {}) })
    this._rpc = new HyperswarmRPC({ dht: this._dht, seed: seedRpc })
    this._server = this._rpc.createServer()

    this._server.respond('mdk', async (reqBuf) => {
      try {
        const envelope = deserialize(reqBuf)
        const result = await this.handleRequest(envelope)
        return serialize(result)
      } catch (err) {
        debug('request error: %s', err.message)
        return serialize({ error: err.message })
      }
    })

    await this._server.listen()
    debug('runtime RPC listening (key: %s...)', this._server.publicKey.toString('hex').slice(0, 16))

    if (this.kernelTopic) {
      await this._joinDiscoveryTopic()
    }

    return { publicKey: this._server.publicKey }
  }

  async stop () {
    if (this._announceTimer) { clearInterval(this._announceTimer); this._announceTimer = null }
    this._discovery = null
    if (this._swarm) { await this._swarm.destroy(); this._swarm = null }
    if (this._server) { await this._server.close(); this._server = null }
    if (this._rpc) { await this._rpc.destroy(); this._rpc = null }
    if (this._dht) { await this._dht.destroy(); this._dht = null }
    await this._closeContexts()
    debug('worker runtime stopped')
  }

  getPublicKey () {
    return this._server ? this._server.publicKey : null
  }

  // Read access to a device's frozen handler context ({ deviceId, device,
  // config, services }) for the process that owns the runtime — e.g. to wire
  // a snap-collection service to the device clients. Null while offline.
  getDeviceContext (deviceId) {
    const entry = this._devices.get(deviceId)
    return entry && entry.status === 'online' ? entry.ctx : null
  }

  async _openContexts () {
    for (const entry of this._devices.values()) {
      if (entry.status === 'online') continue
      try {
        entry.device = await this._plugin.connect(entry.config, { deviceId: entry.deviceId })
        entry.ctx = Object.freeze({ deviceId: entry.deviceId, device: entry.device, config: entry.config, services: this.services })
        entry.status = 'online'
        entry.error = null
        debug('device context opened: %s', entry.deviceId)
      } catch (err) {
        entry.error = err.message
        debug('connect failed for %s: %s', entry.deviceId, err.message)
      }
    }
  }

  async _closeContexts () {
    if (!this._plugin.disconnect) return
    for (const entry of this._devices.values()) {
      if (entry.status !== 'online') continue
      try {
        await this._plugin.disconnect(entry.device, { deviceId: entry.deviceId })
      } catch (err) {
        debug('disconnect failed for %s: %s', entry.deviceId, err.message)
      }
      entry.status = 'offline'
    }
  }

  async _getOrCreateSeed (name) {
    if (!this.store) return crypto.randomBytes(32)

    if (!this._confBee) {
      this._confBee = this.store.getBee
        ? this.store.getBee({ name: 'workerConf' }, { keyEncoding: 'utf-8' })
        : this.store.sub('workerConf')
      if (this._confBee.ready) await this._confBee.ready()
    }

    const existing = await this._confBee.get(name)
    if (existing && existing.value) {
      return Buffer.isBuffer(existing.value) ? existing.value : Buffer.from(existing.value)
    }

    const seed = crypto.randomBytes(32)
    await this._confBee.put(name, seed)
    debug('created persistent seed: %s', name)
    return seed
  }

  async _joinDiscoveryTopic () {
    this._swarm = new Hyperswarm({ dht: this._dht })
    const topicBuf = Buffer.isBuffer(this.kernelTopic)
      ? this.kernelTopic
      : Buffer.from(this.kernelTopic, 'hex')

    // Attach the handler BEFORE join. A Hyperswarm connection is persistent and
    // its `connection` event fires once, immediately on open — if the Kernel client
    // connects before this is attached (e.g. during an awaited flush), the event
    // is missed and the worker never writes its key on that long-lived socket,
    // so the Kernel times out and discovery hangs.
    this._swarm.on('connection', (stream) => {
      stream.write(this._server.publicKey)
      stream.on('error', () => {})
    })

    // Server join: announce this keypair under the topic. `discovery.flushed()`
    // is the server-mode wait — it resolves once we are announced on the DHT and
    // reachable (swarm.flush() is the client "connect to pending peers" wait, the
    // wrong semantics here). Hold the handle so we can re-announce and leave it.
    this._discovery = this._swarm.join(topicBuf, { server: true, client: false })
    await this._discovery.flushed()

    // Announce/lookup is an ongoing process; re-announce periodically so a Kernel
    // that joins later (or after our announce expires) still finds us.
    this._announceTimer = setInterval(() => {
      if (this._discovery) this._discovery.refresh({ server: true }).catch(() => {})
    }, 30000)
    this._announceTimer.unref()

    debug('joined discovery topic: %s... (announced)', topicBuf.toString('hex').slice(0, 16))
  }

  async handleRequest (envelope) {
    switch (envelope.action) {
      case ACTIONS.IDENTITY_REQUEST:
        return this._handleIdentity(envelope)
      case ACTIONS.CAPABILITY_REQUEST:
        return this._handleCapability(envelope)
      case ACTIONS.TELEMETRY_PULL:
        return this._handleTelemetry(envelope)
      case ACTIONS.COMMAND_REQUEST:
        return this._handleCommand(envelope)
      case ACTIONS.HEALTH_PING:
        return this._handleHealthPing(envelope)
      case ACTIONS.STATE_PULL:
        return this._handleStatePull(envelope)
      case ACTIONS.WRITE_CALLS_REQUEST:
        if (this.services && this.services.actions) return this._handleWriteCalls(envelope)
        break
    }

    return buildResponse(envelope, envelope.action, {
      error: `ERR_UNKNOWN_ACTION: ${envelope.action}`
    }, this.workerId)
  }

  async _handleWriteCalls (envelope) {
    const res = await this.services.actions.getWriteCalls(envelope.payload || {})
    return buildResponse(envelope, ACTIONS.WRITE_CALLS_RESPONSE, res, this.workerId)
  }

  _handleIdentity (envelope) {
    return buildResponse(envelope, ACTIONS.IDENTITY_RESPONSE, {
      workerId: this.workerId,
      devices: [...this._devices.keys()].map((deviceId) => ({ deviceId }))
    }, this.workerId)
  }

  _handleCapability (envelope) {
    return buildResponse(envelope, ACTIONS.CAPABILITY_RESPONSE, {
      contract: this._publishedContract
    }, this.workerId)
  }

  async _handleTelemetry (envelope) {
    const query = (envelope.payload && envelope.payload.query) || {}
    const deviceId = envelope.deviceId || (envelope.payload && envelope.payload.deviceId) || null
    const { type = 'metrics', ...params } = query

    let result
    const builtin = telemetryBuiltin(this.services, type)
    if (builtin) {
      // Adapter parity: worker-infra queries answer for absent/offline
      // devices too (the record lives in the store, not on the device), and
      // their errors come back inside the telemetry payload.
      try {
        result = await builtin.handle(this.services, deviceId, params, {
          workerId: this.workerId,
          metadata: this._publishedContract.metadata,
          deviceIds: [...this._devices.keys()]
        })
      } catch (err) {
        result = { error: err.message }
      }
    } else if (type === 'list') {
      result = { devices: [...this._devices.values()].map((e) => ({ deviceId: e.deviceId, status: e.status })) }
    } else if (!deviceId) {
      if (type !== 'metrics') {
        result = { error: `ERR_DEVICE_ID_REQUIRED: ${type}` }
      } else {
        const devices = []
        for (const entry of this._devices.values()) {
          devices.push({ deviceId: entry.deviceId, ...(await this._collectMetrics(entry, params)) })
        }
        result = { devices }
      }
    } else {
      const entry = this._devices.get(deviceId)
      if (!entry) {
        result = { error: `ERR_DEVICE_NOT_FOUND: ${deviceId}` }
      } else if (type === 'metrics') {
        result = await this._collectMetrics(entry, params)
      } else if (this._plugin.handlers.telemetry.has(type)) {
        result = await this._pullChannel(entry, type, params)
      } else {
        result = { error: `ERR_UNKNOWN_QUERY_TYPE: ${type}` }
      }
    }

    return buildResponse(envelope, ACTIONS.TELEMETRY_RESPONSE, {
      deviceId,
      ...result,
      timestamp: Date.now()
    }, this.workerId)
  }

  async _collectMetrics (entry, params) {
    if (entry.status !== 'online') return { error: `ERR_DEVICE_UNAVAILABLE: ${entry.deviceId}` }

    const metrics = {}
    for (const [name, fn] of this._plugin.handlers.telemetry) {
      try {
        metrics[name] = await fn(entry.ctx, params)
      } catch (err) {
        metrics[name] = { error: err.message }
      }
    }
    return { metrics }
  }

  async _pullChannel (entry, name, params) {
    if (entry.status !== 'online') return { error: `ERR_DEVICE_UNAVAILABLE: ${entry.deviceId}` }

    try {
      return { name, value: await this._plugin.handlers.telemetry.get(name)(entry.ctx, params) }
    } catch (err) {
      return { error: err.message }
    }
  }

  async _handleCommand (envelope) {
    const { commandId, command, params } = envelope.payload
    const deviceId = envelope.deviceId
    const fail = (error) => buildResponse(envelope, ACTIONS.COMMAND_RESULT, {
      commandId,
      status: 'FAILED',
      error
    }, this.workerId)

    // Built-ins run before the device checks: provisioning commands arrive
    // worker-scoped (deviceId null) and store-backed commands must work for
    // devices the runtime holds offline.
    const builtin = commandBuiltin(this.services, command)
    if (builtin) {
      try {
        const result = await builtin.handle(this.services, deviceId, params || {})
        return buildResponse(envelope, ACTIONS.COMMAND_RESULT, {
          commandId,
          status: 'SUCCESS',
          result: result === undefined ? {} : result
        }, this.workerId)
      } catch (err) {
        return fail(err.message)
      }
    }

    if (!deviceId) return fail('ERR_DEVICE_ID_REQUIRED')
    const entry = this._devices.get(deviceId)
    if (!entry) return fail(`ERR_DEVICE_NOT_FOUND: ${deviceId}`)
    if (entry.status !== 'online') return fail(`ERR_DEVICE_UNAVAILABLE: ${deviceId}`)
    const handler = this._plugin.handlers.commands.get(command)
    if (!handler) return fail(`ERR_UNKNOWN_COMMAND: ${command}`)

    try {
      const result = await handler(entry.ctx, this._normalizeParams(command, params))
      return buildResponse(envelope, ACTIONS.COMMAND_RESULT, {
        commandId,
        status: 'SUCCESS',
        result: result === undefined ? {} : result
      }, this.workerId)
    } catch (err) {
      return fail(err.message)
    }
  }

  // The Kernel's action-approver dispatches write actions positionally —
  // `{ value: x }` for one argument, `{ args: [...] }` for several (the
  // legacy applyThings consumed Object.values). Map those onto the
  // contract-declared param names so handlers only ever see named params.
  // Params that already look named (or commands without declared params)
  // pass through untouched.
  _normalizeParams (command, params) {
    const declared = this._commandParamNames.get(command)
    if (!declared || !declared.length) return params || {}

    let positional = null
    if (Array.isArray(params)) {
      positional = params
    } else if (params && Array.isArray(params.args) && Object.keys(params).length === 1 && !declared.includes('args')) {
      positional = params.args
    } else if (params && Object.keys(params).length === 1 && 'value' in params && !declared.includes('value')) {
      positional = [params.value]
    }
    if (!positional) return params || {}

    const named = {}
    declared.forEach((name, i) => {
      if (positional[i] !== undefined) named[name] = positional[i]
    })
    return named
  }

  _handleHealthPing (envelope) {
    return buildResponse(envelope, ACTIONS.HEALTH_PONG, {
      status: 'OK'
    }, this.workerId)
  }

  _handleStatePull (envelope) {
    const state = {}
    for (const entry of this._devices.values()) {
      state[entry.deviceId] = { status: entry.status }
    }

    return buildResponse(envelope, ACTIONS.STATE_RESPONSE, {
      state,
      deviceCount: this._devices.size,
      workerId: this.workerId
    }, this.workerId)
  }
}

module.exports = WorkerRuntime
