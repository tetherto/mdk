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
const { publicError } = require('./public-error')
const { sweep, openTelemetryStore, createPoller, snapshot, validateOps, aggregate, toEntry, createAggregateCache, rollup, createArchive } = require('./telemetry')
const { validateParams, normalizeParams } = require('@tetherto/mdk-kernel/protocol/params')
const { dhtPortOpts } = require('@tetherto/mdk-kernel/dht')

// Contract keys an operator may override per instance from mdk.yaml
// spec.workers[].config (opts.config); the override wins key by key.
const TELEMETRY_CONFIG_KEYS = ['telemetryPollIntervalMs', 'aggregateCacheTtlMs', 'telemetryArchive']
// Published with the contract when the archive is on, so the Kernel
// dispatches it (ERR_COMMAND_NOT_IN_CAPABILITIES otherwise) and spec.rbac
// evaluates it as a device write.
const RESTORE_COMMAND = Object.freeze({
  name: 'restoreTelemetry',
  description: 'Load the archived full-resolution telemetry points of a range back into the device\'s stored series.',
  params: [{ name: 'from', type: 'number' }, { name: 'to', type: 'number' }]
})
// Applied whenever the collector is on, so no worker grows without bound;
// contract and mdk.yaml override it key by key.
const RETENTION_DEFAULTS = Object.freeze({ rawMs: 86400000, rollupIntervalMs: 300000, keepMs: 2592000000 })
// Node's timer ceiling; a retention pass never waits longer than this.
const MAX_INTERVAL_MS = 2147483647
const ROLLUP_PASS_MAX_MS = 3600000

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
 * Telemetry collector (opt-in): a contract that declares
 * `telemetryPollIntervalMs` — or an `opts.config` that sets it (null there
 * turns a contract's polling off) — makes the runtime sweep every online
 * device at start() and then on that interval, calling each distinct handler
 * once, and store the result as a `{ data, ts }` series per device: a value
 * or an `{ error }` marker per metric, so a device that answered nothing
 * still gets a point that says why. The `snapshot` query type is then served
 * from that store with no device call, and every sweep updates the device's
 * reachability like a live poll does. The `aggregate` query type runs a
 * lib-stats op spec over the latest point of every device that holds a
 * reading; an answer is served from memory until a sweep stores a point, or
 * for `aggregateCacheTtlMs` (floored at one poll interval) while none does.
 * An op groups or filters on `metrics.<name>`, `deviceId` or `info.<key>`:
 * `info` is the label block a host attaches to a device spec
 * (`{ deviceId, config, info }`, the CLI's `config.devices[].info`), never
 * the config block, which holds the host's connection details.
 * The capability payload carries the poll interval in force, so the Kernel
 * leaves a polling Worker out of its scheduled pull.
 * `telemetryRetention` { rawMs, rollupIntervalMs, keepMs } bounds the store:
 * points older than rawMs are rolled up into one per rollupIntervalMs
 * bucket, points older than keepMs are dropped (defaults 24h / 5m / 30d).
 * The series lives in `opts.store` when the host provides one, else in a
 * store the runtime opens under `opts.telemetryStoreDir`
 * (default `<storeDir>/telemetry`); ERR_TELEMETRY_STORE_REQUIRED without any.
 * `telemetryArchive: true` keeps the raw points rollup thins out: each
 * bucket is appended to NDJSON day files under `opts.telemetryArchiveDir`
 * (default `<telemetryStoreDir>-archive` or `<storeDir>/telemetry-archive`;
 * ERR_TELEMETRY_ARCHIVE_DIR_REQUIRED without any) before it is deleted.
 * The `archive` query type lists a device's day files, and the
 * `restoreTelemetry` command (published with the contract while the archive
 * is on) puts a range back into the series at full resolution, replacing
 * the rolled points of the buckets it covers; a restored range stays raw
 * until keepMs expires it.
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

    this._telemetry = _telemetryConfig(this._plugin.contract, opts)
    this._publishedContract = _publishPollInterval(this._publishedContract, this._telemetry)
    this._publishedContract = _publishArchiveCommand(this._publishedContract, this._telemetry)

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
        info: spec.info,
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
    // config and info are both plain objects (or absent): arrays are not.
    const isBlock = (block) => block === undefined || (typeof block === 'object' && block !== null && !Array.isArray(block))
    return devices.map((spec) => {
      if (!spec || typeof spec.deviceId !== 'string' || !spec.deviceId) throw new Error('ERR_DEVICE_ID_MISSING')
      if (spec.deviceId.includes('\0')) throw new Error(`ERR_DEVICE_ID_INVALID: ${spec.deviceId}`)
      if (seen.has(spec.deviceId)) throw new Error(`ERR_DEVICE_ID_DUPLICATE: ${spec.deviceId}`)
      seen.add(spec.deviceId)
      if (!isBlock(spec.config)) throw new Error(`ERR_DEVICE_CONFIG_INVALID: ${spec.deviceId}`)
      if (!isBlock(spec.info)) throw new Error(`ERR_DEVICE_INFO_INVALID: ${spec.deviceId}`)
      return { deviceId: spec.deviceId, config: spec.config || {}, info: spec.info || {} }
    })
  }

  async start () {
    if (this._allowAll) {
      console.warn(`[mdk-worker] WARNING: worker ${this.workerId} runs with allowAll — any DHT peer that learns its key can command its devices. Never use this outside local development.`)
    } else if (this._allowedKeys.size === 0) {
      throw new Error('ERR_WORKER_ALLOWED_KEYS_REQUIRED: pass opts.allowedKeys (the Kernel client key, kernel.getClientPublicKey()) or opts.allowAll: true for local development')
    }

    await this._openContexts()
    await this._startTelemetry()

    const seedDht = await this._getOrCreateSeed('seedDht')
    const seedRpc = await this._getOrCreateSeed('seedRpc')

    this._dht = new DHT({
      keyPair: DHT.keyPair(seedDht),
      ...(this._bootstrap ? { bootstrap: this._bootstrap } : {}),
      ...dhtPortOpts(this._bootstrap),
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
        return serialize({ error: publicError(err, 'ERR_REQUEST_FAILED') })
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
    // Sweeps end before the device contexts close; the store itself outlives
    // the RPC server so an in-flight read can finish (see _stopTelemetry).
    if (this._telemetry && this._telemetry.poller) await this._telemetry.poller.stop()
    if (this._telemetry && this._telemetry.rollup) await this._telemetry.rollup.stop()
    if (this._announceTimer) { clearInterval(this._announceTimer); this._announceTimer = null }
    this._discovery = null
    if (this._swarm) { await this._swarm.destroy(); this._swarm = null }
    if (this._server) { await this._server.close(); this._server = null }
    if (this._rpc) { await this._rpc.destroy(); this._rpc = null }
    if (this._dht) { await this._dht.destroy(); this._dht = null }
    await this._closeContexts()
    await this._stopTelemetry()
    debug('worker runtime stopped')
  }

  async _startTelemetry () {
    if (!this._telemetry || this._telemetry.store) return
    const { config, storeOpts } = this._telemetry
    this._telemetry.store = await openTelemetryStore(storeOpts)
    this._telemetry.archive = this._telemetry.archiveDir ? createArchive(this._telemetry.archiveDir) : null
    this._telemetry.cache = createAggregateCache(Math.max(config.aggregateCacheTtlMs || 0, config.telemetryPollIntervalMs))
    this._telemetry.poller = createPoller(config.telemetryPollIntervalMs, () => this._pollTelemetry())
    // The first retention pass scans every device's series; it waits for
    // its interval rather than loading every boot.
    this._telemetry.rollup = createPoller(Math.min(config.telemetryRetention.rollupIntervalMs, ROLLUP_PASS_MAX_MS), () => this._rollupTelemetry(), { immediate: false })
    // Started last: the first sweep runs at once.
    this._telemetry.poller.start()
    this._telemetry.rollup.start()
    debug('telemetry collector started (every %d ms)', config.telemetryPollIntervalMs)
  }

  async _stopTelemetry () {
    if (!this._telemetry || !this._telemetry.store) return
    await this._telemetry.poller.stop()
    await this._telemetry.rollup.stop()
    await this._telemetry.store.close()
    this._telemetry.store = null
    this._telemetry.archive = null
  }

  // One sweep of every online device: each gets a point (values or error
  // markers) and its reachability updated, as a live poll would. Cached
  // aggregates are dropped as each point lands, so no answer outlives the
  // data it was computed from.
  async _pollTelemetry () {
    for (const entry of this._devices.values()) {
      if (this._telemetry.poller.stopped) break
      if (entry.status !== 'online') continue
      const { metrics, answered, error } = await sweep(entry.ctx, this._plugin.contract.capabilities.telemetry, this._plugin.handlers.telemetry, {})
      const ts = Date.now()
      _recordPoll(entry, answered, error, ts)
      await this._telemetry.store.put(entry.deviceId, ts, metrics)
      this._telemetry.cache.clear()
    }
  }

  _rollupTelemetry () {
    const { store, config, cursors, archive } = this._telemetry
    return rollup(store, [...this._devices.keys()], this._plugin.contract.capabilities.telemetry, config.telemetryRetention, cursors, Date.now(), archive)
  }

  async _archiveDays (deviceId) {
    if (!this._telemetry || !this._telemetry.archive) return { error: 'ERR_TELEMETRY_ARCHIVE_DISABLED: archive' }
    if (!deviceId) return { error: 'ERR_DEVICE_ID_REQUIRED: archive' }
    if (!this._devices.has(deviceId)) return { error: `ERR_DEVICE_NOT_FOUND: ${deviceId}` }
    return { deviceId, days: await this._telemetry.archive.days(deviceId) }
  }

  // The rolled point of every bucket the archived range covers is replaced
  // by the raw points; a bucket the archive holds nothing for is left alone.
  // Older than keepMs is refused: expiry would never revisit those points.
  async _restoreTelemetry (deviceId, { from, to }) {
    if (!deviceId) return { error: 'ERR_DEVICE_ID_REQUIRED' }
    if (!this._devices.has(deviceId)) return { error: `ERR_DEVICE_NOT_FOUND: ${deviceId}` }
    if (!Number.isInteger(from) || !Number.isInteger(to) || to < from) return { error: `ERR_RANGE_INVALID: ${from}..${to}` }
    const { store, archive, cache, config, cursors } = this._telemetry
    const { rollupIntervalMs, keepMs } = config.telemetryRetention
    if (from < Date.now() - keepMs) return { error: `ERR_TELEMETRY_RESTORE_RANGE: from ${from} is older than keepMs` }
    // Read whole buckets, not just `from..to`: a bucket is replaced as a unit
    // below, so restoring part of one would delete its rolled point and put
    // back only the slice the caller named, dropping the rest of that bucket
    // from the series.
    const alignedFrom = from - (from % rollupIntervalMs)
    const alignedTo = to - (to % rollupIntervalMs) + rollupIntervalMs - 1
    const points = await archive.read(deviceId, alignedFrom, alignedTo)
    const buckets = new Set(points.map((point) => point.ts - (point.ts % rollupIntervalMs)))
    for (const start of buckets) await store.del(deviceId, start, start + rollupIntervalMs - 1)
    for (const point of points) await store.put(deviceId, point.ts, point.data, { restored: true })
    // `from` is inside keepMs, but aligning down can land before the point
    // expiry has already swept past, and the sweep only moves forward. Rewind
    // its cursor so the next pass covers what was just put back, rather than
    // leaving those readings in the store until a restart resets the cursors.
    const cursor = points.length ? cursors.get(deviceId) : null
    if (cursor && alignedFrom < cursor.expired) cursor.expired = alignedFrom
    cache.clear()
    debug('restored %d points for %s', points.length, deviceId)
    return { restored: points.length, buckets: buckets.size, from: alignedFrom, to: alignedTo }
  }

  _snapshot (deviceId, params) {
    if (!this._telemetry || !this._telemetry.store) return { error: 'ERR_TELEMETRY_STORE_DISABLED: snapshot' }
    if (deviceId && !this._devices.has(deviceId)) return { error: `ERR_DEVICE_NOT_FOUND: ${deviceId}` }
    return snapshot(this._telemetry.store, deviceId ? [deviceId] : [...this._devices.keys()], params)
  }

  async _aggregate (deviceId, params) {
    if (!this._telemetry || !this._telemetry.store) return { error: 'ERR_TELEMETRY_STORE_DISABLED: aggregate' }
    if (deviceId && !this._devices.has(deviceId)) return { error: `ERR_DEVICE_NOT_FOUND: ${deviceId}` }
    const { state, error } = validateOps(params.ops, this._plugin.contract.capabilities.telemetry)
    if (error) return { error }
    const deviceIds = deviceId ? [deviceId] : [...this._devices.keys()]
    const key = { ops: params.ops, deviceIds }
    const { cache } = this._telemetry
    let result = cache.get(key)
    if (!result) {
      // Read before the points: a sweep that lands meanwhile moves the
      // generation on, and the cache then refuses this answer.
      const gen = cache.gen
      // A device whose latest point holds no reading (every handler failed)
      // is left out, as a device with no point is.
      const entries = []
      for (const id of deviceIds) {
        const point = await this._telemetry.store.latest(id)
        const entry = point && toEntry(id, point.data, this._devices.get(id).info)
        if (entry && Object.keys(entry.metrics).length) entries.push(entry)
      }
      // Cached in wire form, so in-process callers see what RPC callers see
      // and nobody holds a reference into the cache.
      result = JSON.parse(JSON.stringify({ ...aggregate(state, entries), deviceCount: entries.length }))
      cache.set(key, result, gen)
    }
    // The pre-tally pack is for the Kernel's cross-worker merge; a
    // device-scoped read gets the tallied ops only.
    if (!deviceId) return result
    const { partial, ...tallied } = result
    return tallied
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
        result = { error: publicError(err, 'ERR_TELEMETRY_FAILED') }
      }
    } else if (type === 'list') {
      result = { devices: [...this._devices.values()].map((e) => ({ deviceId: e.deviceId, status: e.status })) }
    } else if (type === 'snapshot') {
      result = await this._snapshot(deviceId, params)
    } else if (type === 'aggregate') {
      result = await this._aggregate(deviceId, params)
    } else if (type === 'archive') {
      result = await this._archiveDays(deviceId)
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

    const { metrics, answered, error } = await sweep(entry.ctx, this._plugin.contract.capabilities.telemetry, this._plugin.handlers.telemetry, params)
    if (answered || error) _recordPoll(entry, answered, error)
    return { metrics }
  }

  async _pullChannel (entry, name, params) {
    if (entry.status !== 'online') return { error: `ERR_DEVICE_UNAVAILABLE: ${entry.deviceId}` }

    try {
      return { name, value: await this._plugin.handlers.telemetry.get(name)(entry.ctx, params) }
    } catch (err) {
      return { error: publicError(err, 'ERR_TELEMETRY_FAILED') }
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
    if (command === RESTORE_COMMAND.name && this._telemetry && this._telemetry.archive) {
      const invalid = validateParams(RESTORE_COMMAND.params, params || {})
      if (invalid) return fail(invalid)
      const result = await this._restoreTelemetry(deviceId, params)
      if (result.error) return fail(result.error)
      return buildResponse(envelope, ACTIONS.COMMAND_RESULT, { commandId, status: 'SUCCESS', result }, this.workerId)
    }

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
        return fail(publicError(err, 'ERR_COMMAND_FAILED'))
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
      return fail(publicError(err, 'ERR_COMMAND_FAILED'))
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

// null when the plugin does not poll; else { config, storeOpts } with the
// store opened lazily by _startTelemetry().
function _telemetryConfig (contract, opts) {
  const config = {}
  for (const key of TELEMETRY_CONFIG_KEYS) {
    const value = opts.config && opts.config[key] !== undefined ? opts.config[key] : contract[key]
    if (value !== undefined) config[key] = value
  }
  if (config.telemetryPollIntervalMs === undefined || config.telemetryPollIntervalMs === null) return null
  if (!Number.isInteger(config.telemetryPollIntervalMs) || config.telemetryPollIntervalMs < 1 || config.telemetryPollIntervalMs > MAX_INTERVAL_MS) {
    throw new Error(`ERR_TELEMETRY_POLL_INTERVAL_INVALID: ${config.telemetryPollIntervalMs}`)
  }
  if (config.aggregateCacheTtlMs !== undefined && (!Number.isInteger(config.aggregateCacheTtlMs) || config.aggregateCacheTtlMs < 0)) {
    throw new Error(`ERR_AGGREGATE_CACHE_TTL_INVALID: ${config.aggregateCacheTtlMs}`)
  }
  const retention = { ...RETENTION_DEFAULTS }
  for (const source of [contract.telemetryRetention, opts.config && opts.config.telemetryRetention]) {
    if (source === undefined) continue
    if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error(`ERR_TELEMETRY_RETENTION_INVALID: ${source}`)
    for (const key of Object.keys(source)) {
      if (!(key in RETENTION_DEFAULTS)) throw new Error(`ERR_TELEMETRY_RETENTION_INVALID: unknown key ${key}`)
      retention[key] = source[key]
    }
  }
  for (const key of Object.keys(RETENTION_DEFAULTS)) {
    if (!Number.isInteger(retention[key]) || retention[key] < 1) throw new Error(`ERR_TELEMETRY_RETENTION_INVALID: ${key} ${retention[key]}`)
  }
  if (retention.rawMs > retention.keepMs || retention.rollupIntervalMs > retention.keepMs) {
    throw new Error(`ERR_TELEMETRY_RETENTION_INVALID: keepMs ${retention.keepMs} is shorter than the raw or rollup window`)
  }
  config.telemetryRetention = retention
  const storeDir = opts.telemetryStoreDir || (opts.storeDir ? path.join(opts.storeDir, 'telemetry') : null)
  if (!opts.store && !storeDir) throw new Error('ERR_TELEMETRY_STORE_REQUIRED: pass opts.store, opts.telemetryStoreDir or opts.storeDir')
  if (config.telemetryArchive !== undefined && typeof config.telemetryArchive !== 'boolean') {
    throw new Error(`ERR_TELEMETRY_ARCHIVE_INVALID: ${config.telemetryArchive}`)
  }
  let archiveDir = null
  if (config.telemetryArchive) {
    archiveDir = opts.telemetryArchiveDir ||
      (opts.telemetryStoreDir ? `${opts.telemetryStoreDir}-archive` : opts.storeDir ? path.join(opts.storeDir, 'telemetry-archive') : null)
    if (!archiveDir) throw new Error('ERR_TELEMETRY_ARCHIVE_DIR_REQUIRED: pass opts.telemetryArchiveDir, opts.telemetryStoreDir or opts.storeDir')
  }
  return { config, storeOpts: { store: opts.store, storeDir }, archiveDir, archive: null, store: null, poller: null, rollup: null, cache: null, cursors: new Map() }
}

function _publishArchiveCommand (contract, telemetry) {
  if (!telemetry || !telemetry.archiveDir) return contract
  const copy = JSON.parse(JSON.stringify(contract))
  copy.capabilities.commands = [...(copy.capabilities.commands || []), RESTORE_COMMAND]
  return copy
}

// The capability payload says whether this instance polls: the interval in
// force (an mdk.yaml override included), or no key at all when polling is off.
function _publishPollInterval (contract, telemetry) {
  const active = telemetry ? telemetry.config.telemetryPollIntervalMs : null
  if (contract.telemetryPollIntervalMs === (active === null ? undefined : active)) return contract
  const copy = JSON.parse(JSON.stringify(contract))
  if (active === null) delete copy.telemetryPollIntervalMs
  else copy.telemetryPollIntervalMs = active
  return copy
}

function _recordPoll (entry, answered, error, now = Date.now()) {
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

module.exports = WorkerRuntime
