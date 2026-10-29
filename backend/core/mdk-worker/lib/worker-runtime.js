'use strict'

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const HyperswarmRPC = require('@hyperswarm/rpc')
const Hyperswarm = require('hyperswarm')
const DHT = require('hyperdht')
const debug = require('debug')('mdk:worker:runtime')
const { ACTIONS } = require('@tetherto/mdk-kernel/protocol/actions')
const { buildResponse, serialize, deserialize, validateFull: validateEnvelope } = require('@tetherto/mdk-kernel/protocol/envelope')
const { loadPlugin } = require('./plugin-loader')
const { telemetryBuiltin, commandBuiltin, mergeBuiltinCommands, builtinCommandParams } = require('./service-builtins')
const { validateParams, normalizeParams } = require('@tetherto/mdk-kernel/protocol/params')

// Errors that already carry a protocol code (ERR_*) are part of the wire
// contract and go back as-is; anything else (a stack-less TypeError from a
// handler, a driver message with an address or a credential in it) is logged
// here and replaced by the fallback code before it crosses the RPC boundary.
const ERR_CODE = /^ERR_[A-Z0-9_]+/

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
 * Every metrics poll (the Kernel's scheduled telemetry.pull) records whether
 * the device answered any channel, and the `health` channel serves that per
 * device ({ reachable, lastSuccessAt, lastError, lastErrorAt }) unless the
 * plugin declares its own `health` channel. It is the device-level signal:
 * the Kernel's READY state and HealthMonitor only say the Worker answers.
 *
 * `opts.services` (optional) injects worker-infra services (logs, comments,
 * settings, stats, provisioning, write-call approval). When present, the
 * runtime serves the legacy adapter surface from them as built-ins (see
 * service-builtins.js) and exposes the same object to handlers as
 * ctx.services. Services are process-owned, never plugin-owned.
 *
 * DHT/RPC identity: pass `opts.store` (Hyperbee-style) or `opts.storeDir`
 * (directory of seed files) so the public key is stable across restarts.
 * Without either, seeds are random per boot.
 *
 * RPC admission is fail closed: `opts.allowedKeys` (hex/Buffer public keys —
 * the Kernel's kernel.getClientPublicKey()) or runtime allowKey() name who may
 * call; start() throws ERR_WORKER_ALLOWED_KEYS_REQUIRED with none, unless
 * `opts.allowAll: true` (development only, logs a warning). Every request is
 * envelope-validated (validateFull) before dispatch.
 */
class WorkerRuntime {
  constructor (plugin, opts) {
    opts = opts || {}
    if (!opts.workerId || typeof opts.workerId !== 'string') throw new Error('ERR_WORKER_ID_REQUIRED')

    this._plugin = loadPlugin(plugin)
    this.workerId = opts.workerId
    this.kernelTopic = opts.kernelTopic || null
    this.store = opts.store || null
    this.storeDir = opts.storeDir || null
    this.services = opts.services || null
    this._publishedContract = mergeBuiltinCommands(this._plugin.publishedContract, this.services)

    this._commandParams = new Map()
    for (const entry of this._plugin.contract.capabilities.commands || []) {
      this._commandParams.set(entry.name, Array.isArray(entry.params) ? entry.params : [])
    }
    // Optional DHT bootstrap override. Defaults to hyperdht's public bootstrap;
    // set for a private DHT network (local / air-gapped) or hermetic tests.
    this._bootstrap = opts.bootstrap || null
    // Interface the DHT node binds (hyperdht `host`); default all interfaces.
    this._dhtHost = opts.dhtHost || null

    // RPC caller allowlist (fail closed). Only these public keys — normally
    // the Kernel's client key, kernel.getClientPublicKey() — may connect;
    // start() refuses to run with none unless allowAll is set explicitly.
    this._allowedKeys = new Set()
    for (const key of opts.allowedKeys || []) this.allowKey(key)
    this._allowAll = opts.allowAll === true

    this._devices = new Map()
    for (const spec of this._validateDeviceSpecs(opts.devices, opts.allowEmptyDevices)) {
      this._devices.set(spec.deviceId, {
        deviceId: spec.deviceId,
        config: spec.config,
        device: null,
        ctx: null,
        status: 'offline',
        error: null,
        reachable: null,
        lastSuccessAt: null,
        lastError: null,
        lastErrorAt: null
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
    if (this._allowAll) {
      console.warn(`[mdk-worker] WARNING: worker ${this.workerId} runs with allowAll — any DHT peer that learns its key can command its devices. Never use this outside local development.`)
    } else if (this._allowedKeys.size === 0) {
      throw new Error('ERR_WORKER_ALLOWED_KEYS_REQUIRED: pass opts.allowedKeys (the Kernel client key, kernel.getClientPublicKey()) or opts.allowAll: true for local development')
    }

    await this._openContexts()

    const seedDht = await this._getOrCreateSeed('seedDht')
    const seedRpc = await this._getOrCreateSeed('seedRpc')

    this._dht = new DHT({
      keyPair: DHT.keyPair(seedDht),
      ...(this._bootstrap ? { bootstrap: this._bootstrap } : {}),
      ...(this._dhtHost ? { host: this._dhtHost } : {})
    })
    this._rpc = new HyperswarmRPC({ dht: this._dht, seed: seedRpc })
    this._server = this._rpc.createServer({ firewall: (remotePublicKey) => !this._isAllowed(remotePublicKey) })

    this._server.respond('mdk', async (reqBuf, rpc) => {
      try {
        // Re-checked per request so revokeKey() takes effect on open connections.
        const remote = rpc && rpc.stream && rpc.stream.remotePublicKey
        if (!remote || !this._isAllowed(remote)) return serialize({ error: 'ERR_WORKER_CALLER_NOT_ALLOWED' })
        const envelope = deserialize(reqBuf)
        const validation = validateEnvelope(envelope)
        if (!validation.valid) return serialize({ error: validation.error })
        const result = await this.handleRequest(envelope)
        return serialize(result)
      } catch (err) {
        return serialize({ error: _publicError(err, 'ERR_REQUEST_FAILED') })
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

  /**
   * Admit an RPC caller (hex or Buffer public key), e.g. a Kernel's
   * getClientPublicKey(). Works before or after start().
   */
  allowKey (key) {
    const hex = _normalizeKey(key)
    this._allowedKeys.add(hex)
    return hex
  }

  revokeKey (key) {
    return this._allowedKeys.delete(_normalizeKey(key))
  }

  getAllowedKeys () {
    return [...this._allowedKeys]
  }

  _isAllowed (remotePublicKey) {
    if (this._allowAll) return true
    const ok = this._allowedKeys.has(remotePublicKey.toString('hex'))
    if (!ok) debug('blocked caller: %s...', remotePublicKey.toString('hex').slice(0, 16))
    return ok
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
    if (this.store) {
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

    if (this.storeDir) return this._getOrCreateSeedFile(name)

    return crypto.randomBytes(32)
  }

  // File-backed seeds for hosts that own a directory but not a Hyperbee store
  // (WorkerRuntimeV2 / CLI). Same 32-byte seedDht/seedRpc
  // names the Hyperbee path uses, so the RPC public key stays stable across
  // process restarts without pulling in worker-infra.
  //
  // The seed IS the worker's identity, so this fails closed: a malformed
  // seed is an error (never silently replaced, which would rotate the key the
  // Kernel knows), a symlink is refused, a file owned by another user is
  // refused, and group/other permission bits are stripped. A new seed is
  // created exclusively (O_EXCL, so a planted file or link is never written
  // through) with mode 0600.
  _getOrCreateSeedFile (name) {
    fs.mkdirSync(this.storeDir, { recursive: true, mode: 0o700 })
    const seedPath = path.join(this.storeDir, name)

    const existing = _readSeedFile(seedPath)
    if (existing) return existing

    const seed = crypto.randomBytes(32)
    const { O_WRONLY, O_CREAT, O_EXCL } = fs.constants
    const fd = fs.openSync(seedPath, O_WRONLY | O_CREAT | O_EXCL, 0o600)
    try {
      fs.writeSync(fd, seed)
      fs.fsyncSync(fd)
    } finally {
      fs.closeSync(fd)
    }
    debug('created persistent seed file: %s', name)
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
        result = { error: _publicError(err, 'ERR_TELEMETRY_FAILED') }
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
      } else if (type === 'health') {
        result = { name: 'health', value: _health(entry) }
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
    if (entry.status !== 'online') {
      const error = `ERR_DEVICE_UNAVAILABLE: ${entry.deviceId}`
      _recordPoll(entry, false, error)
      return { error }
    }

    const metrics = {}
    let answered = false
    let error = null
    for (const [name, fn] of this._plugin.handlers.telemetry) {
      try {
        metrics[name] = await fn(entry.ctx, params)
        answered = true
      } catch (err) {
        metrics[name] = { error: _publicError(err, 'ERR_TELEMETRY_FAILED') }
        error = error || metrics[name].error
      }
    }
    if (answered || error) _recordPoll(entry, answered, error)
    return { metrics }
  }

  async _pullChannel (entry, name, params) {
    if (entry.status !== 'online') return { error: `ERR_DEVICE_UNAVAILABLE: ${entry.deviceId}` }

    try {
      return { name, value: await this._plugin.handlers.telemetry.get(name)(entry.ctx, params) }
    } catch (err) {
      return { error: _publicError(err, 'ERR_TELEMETRY_FAILED') }
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
    // Worker-scoped (deviceId null) and store-backed commands must work for
    // devices the runtime holds offline.
    const builtin = commandBuiltin(this.services, command)
    if (builtin) {
      const invalid = validateParams(builtinCommandParams(command), params || {})
      if (invalid) return fail(invalid)
      try {
        const result = await builtin.handle(this.services, deviceId, params || {})
        return buildResponse(envelope, ACTIONS.COMMAND_RESULT, {
          commandId,
          status: 'SUCCESS',
          result: result === undefined ? {} : result
        }, this.workerId)
      } catch (err) {
        return fail(_publicError(err, 'ERR_COMMAND_FAILED'))
      }
    }

    if (!deviceId) return fail('ERR_DEVICE_ID_REQUIRED')
    const entry = this._devices.get(deviceId)
    if (!entry) return fail(`ERR_DEVICE_NOT_FOUND: ${deviceId}`)
    if (entry.status !== 'online') return fail(`ERR_DEVICE_UNAVAILABLE: ${deviceId}`)
    const handler = this._plugin.handlers.commands.get(command)
    if (!handler) return fail(`ERR_UNKNOWN_COMMAND: ${command}`)

    // Declared params are checked here as well as at the Kernel, not left to
    // each handler: an operator may admit other keys on the Worker.
    const declared = this._commandParams.get(command)
    const normalized = normalizeParams(declared, params)
    const invalid = validateParams(declared, normalized)
    if (invalid) return fail(invalid)

    try {
      const result = await handler(entry.ctx, normalized)
      return buildResponse(envelope, ACTIONS.COMMAND_RESULT, {
        commandId,
        status: 'SUCCESS',
        result: result === undefined ? {} : result
      }, this.workerId)
    } catch (err) {
      return fail(_publicError(err, 'ERR_COMMAND_FAILED'))
    }
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

// Returns the 32-byte seed at seedPath, or null when there is none yet.
function _readSeedFile (seedPath) {
  let lst
  try {
    lst = fs.lstatSync(seedPath)
  } catch (err) {
    if (err.code === 'ENOENT') return null
    throw err
  }
  if (lst.isSymbolicLink()) throw new Error(`ERR_SEED_FILE_SYMLINK: ${seedPath}`)
  if (!lst.isFile()) throw new Error(`ERR_SEED_FILE_INVALID: ${seedPath}`)

  // O_NOFOLLOW closes the window between the lstat above and the open.
  const fd = fs.openSync(seedPath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0))
  try {
    const st = fs.fstatSync(fd)
    if (!st.isFile()) throw new Error(`ERR_SEED_FILE_INVALID: ${seedPath}`)
    if (typeof process.getuid === 'function' && st.uid !== process.getuid()) {
      throw new Error(`ERR_SEED_FILE_OWNER: ${seedPath}`)
    }
    if (process.platform !== 'win32' && (st.mode & 0o077)) {
      fs.fchmodSync(fd, 0o600)
      debug('tightened seed file permissions to 0600: %s', seedPath)
    }
    const buf = Buffer.alloc(33)
    const n = fs.readSync(fd, buf, 0, 33, 0)
    if (n !== 32) throw new Error(`ERR_SEED_FILE_MALFORMED: ${seedPath}`)
    return buf.subarray(0, 32)
  } finally {
    fs.closeSync(fd)
  }
}

function _normalizeKey (key) {
  const hex = Buffer.isBuffer(key) ? key.toString('hex') : (typeof key === 'string' ? key.trim().toLowerCase() : '')
  if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error('ERR_WORKER_ALLOWED_KEY_INVALID: expected a 32-byte hex public key')
  return hex
}

function _recordPoll (entry, answered, error) {
  const now = Date.now()
  entry.reachable = answered
  if (answered) entry.lastSuccessAt = now
  if (error) {
    entry.lastError = error
    entry.lastErrorAt = now
  }
}

function _health (entry) {
  return {
    reachable: entry.reachable,
    lastSuccessAt: entry.lastSuccessAt,
    lastError: entry.lastError,
    lastErrorAt: entry.lastErrorAt
  }
}

function _publicError (err, fallback) {
  const message = err && typeof err.message === 'string' ? err.message : String(err)
  if (ERR_CODE.test(message)) return message
  debug('%s: %s', fallback, (err && err.stack) || message)
  return fallback
}

module.exports = WorkerRuntime
