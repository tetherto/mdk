'use strict'

const Hyperswarm = require('hyperswarm')
const debug = require('debug')('mdk:kernel:discovery')
const { ACTIONS, MESSAGE_TYPES } = require('../protocol/actions')
const { build: buildEnvelope, validate: validateEnvelope } = require('../protocol/envelope')
const { validateIdentityResponse, validateCapabilityResponse } = require('../protocol/schemas')

function normalizeKey (key) {
  return Buffer.isBuffer(key) ? key.toString('hex') : String(key).toLowerCase()
}

/**
 * DHT Listener — Worker Discovery
 *
 * Discovery flow:
 *   1. Worker starts an RPC server (via @hyperswarm/rpc) and gets a public key
 *   2. Worker joins a known Hyperswarm topic as a server
 *   3. On swarm connection, worker sends its RPC public key (first 32 bytes)
 *   4. Kernel joins same topic as client, receives worker's RPC key
 *   5. Kernel uses that key with WorkerChannel (HRPC) for all subsequent communication
 *   6. Kernel sends identity.request → capability.request → marks Ready
 *
 * The swarm stream is only used for key exchange. All protocol communication
 * goes through @hyperswarm/rpc (stateless request/response, pooled connections).
 *
 * Any peer can announce on the topic, so a topic-discovered key is only a
 * candidate. Admission is fail-closed: only keys on `workerKeys` (or added at
 * runtime with allowWorkerKey()) are registered, and an empty allowlist admits
 * nobody. `allowAnyWorker: true` is the one explicit way to admit every topic
 * peer (development only; logged loudly). Every identity/capability reply is
 * schema-checked, and the registry binds each workerId to the first key it
 * registered with. Keys handed in directly (discoverWorker / Kernel
 * registerWorker) come from the caller and skip the topic allowlist.
 */
class DHTListener {
  constructor (opts) {
    this.topic = opts.topic
    this.registry = opts.registry
    this.workerChannel = opts.workerChannel
    this._swarmOpts = opts.swarmOpts || {}
    this._swarm = null
    this._discovery = null
    this._refreshTimer = null
    this._dht = null
    this._ownsDht = false
    this._kernelId = 'kernel:kernel:default'
    // rpcKey → Promise<boolean> for the registration attempt on that key. A
    // resolved `true` entry is a registered worker and stays; a failed attempt
    // removes itself, so the next offer of the same key retries.
    this._discoveredPeers = new Map()
    this._workerKeys = new Set((opts.workerKeys || []).map(normalizeKey))
    this.allowAnyWorker = opts.allowAnyWorker === true
  }

  // Add a worker RPC key to the topic allowlist at runtime.
  allowWorkerKey (rpcKey) {
    const hex = normalizeKey(rpcKey)
    this._workerKeys.add(hex)
    return hex
  }

  /** Whether a topic-announced RPC key (hex) may register. */
  isWorkerKeyAllowed (rpcKey) {
    return this.allowAnyWorker || this._workerKeys.has(rpcKey)
  }

  setDht (dht) {
    this._dht = dht
  }

  async start () {
    if (!this.topic) {
      debug('DHT listener: no topic configured, skipping')
      return
    }

    if (this.allowAnyWorker) {
      console.warn('[mdk-kernel] WARNING: discovery allowAnyWorker is enabled — every DHT peer that knows the discovery topic can register as a Worker and receive its device family\'s commands. Never use this outside local development.')
    } else if (this._workerKeys.size === 0) {
      debug('discovery workerKeys is empty: every topic peer is rejected until allowWorkerKey() admits one')
    }

    if (this._dht) {
      this._swarm = new Hyperswarm({ dht: this._dht, ...this._swarmOpts })
    } else {
      this._swarm = new Hyperswarm(this._swarmOpts)
      this._ownsDht = true
    }

    const topicBuf = Buffer.isBuffer(this.topic)
      ? this.topic
      : Buffer.from(this.topic, 'hex')

    // Handler before join: connections are emitted immediately on open, so a
    // late handler would miss a worker that connects during join.
    this._swarm.on('connection', (stream, info) => {
      this._handleSwarmConnection(stream, info)
    })

    // Client join: query the topic for announcing workers and connect to them.
    this._discovery = this._swarm.join(topicBuf, { server: false, client: true })
    await this._swarm.flush()

    // Re-query periodically so workers that announce later are discovered.
    // discovery.refresh({ client: true }) is the topic-scoped re-lookup;
    // swarm.flush() is documented as heavyweight (every pending DHT op + conn).
    this._refreshTimer = setInterval(() => {
      if (this._discovery) this._discovery.refresh({ client: true }).catch(() => {})
    }, 10000)

    debug(`DHT listener started (topic: ${topicBuf.toString('hex').slice(0, 16)}...)`)
  }

  async stop () {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer)
      this._refreshTimer = null
    }
    this._discovery = null
    if (this._swarm) {
      await this._swarm.destroy()
      this._swarm = null
    }
    this._discoveredPeers.clear()
    debug('DHT listener stopped')
  }

  /**
   * Handle a swarm connection — read the worker's RPC public key,
   * then initiate the registration flow over HRPC.
   */
  _handleSwarmConnection (stream, info) {
    let received = Buffer.alloc(0)

    stream.on('data', (chunk) => {
      received = Buffer.concat([received, chunk])

      // Worker sends exactly 32 bytes: its RPC server public key
      if (received.length >= 32) {
        const rpcKey = received.subarray(0, 32).toString('hex')
        stream.destroy()
        if (!this.isWorkerKeyAllowed(rpcKey)) {
          debug(`topic peer key not on workerKeys allowlist: ${rpcKey.slice(0, 16)}...`)
          return
        }
        this._onWorkerKeyReceived(rpcKey)
      }
    })

    stream.on('error', (err) => {
      debug(`swarm stream error: ${err.message}`)
    })

    // Timeout if worker doesn't send key within 5s
    const timer = setTimeout(() => {
      debug('swarm connection timed out waiting for RPC key')
      stream.destroy()
    }, 5000)

    stream.on('close', () => clearTimeout(timer))
  }

  /**
   * Re-pull identity from all registered workers and sync device IDs.
   * Called periodically by the Scheduler so the registry stays current
   * when devices are added/removed from workers after initial discovery.
   */
  async refreshAll () {
    for (const worker of this.registry.getReadyWorkers()) {
      if (!worker.channel) continue
      try {
        const identity = await this._pullIdentity(worker.channel, worker.workerId)
        if (!identity) continue
        const newDeviceIds = identity.devices.map(d => d.deviceId)
        await this.registry.syncDeviceIds(worker.workerId, newDeviceIds, worker.channel)
      } catch (err) {
        debug(`identity refresh failed for ${worker.workerId}: ${err.message}`)
      }
    }
  }

  /**
   * Register a worker by its RPC public key, bypassing swarm key-exchange.
   *
   * The swarm topic only exists to deliver a worker's RPC key to the Kernel; the
   * registration itself (identity → capability → READY) runs over HRPC against
   * that key. When the key is already known by other means — e.g. the in-process
   * registerWorker() path, or same-machine local discovery where workers publish
   * their key directly — callers hand it in here. Idempotent: a key already
   * discovered starts no second attempt.
   *
   * Resolves true once the worker is Ready, false when this attempt did not get
   * it there. Callers that retry — local discovery rescans the keys dir every
   * few seconds, and one attempt can outlive several scans — need that to tell
   * a worker still starting up from one that is never going to arrive.
   */
  discoverWorker (rpcKey) {
    return this._onWorkerKeyReceived(rpcKey)
  }

  _onWorkerKeyReceived (rpcKey) {
    // Concurrent offers of one key share the attempt already in flight, so they
    // report its real outcome rather than "someone else is on it" — a retrying
    // caller that saw the latter could never tell how long a key had been failing.
    const inFlight = this._discoveredPeers.get(rpcKey)
    if (inFlight) {
      debug(`peer already discovered: ${rpcKey.slice(0, 16)}...`)
      return inFlight
    }
    debug(`worker RPC key received: ${rpcKey.slice(0, 16)}...`)

    // Forget a failed key so the next offer retries it; keep a registered one.
    // The cleanup runs in `.then` rather than inside `_register` so it cannot
    // fire before the map entry below exists.
    const attempt = this._register(rpcKey).then((registered) => {
      if (!registered) this._discoveredPeers.delete(rpcKey)
      return registered
    })
    this._discoveredPeers.set(rpcKey, attempt)
    return attempt
  }

  async _register (rpcKey) {
    const peer = `${rpcKey.slice(0, 16)}...`
    try {
      const channel = this.workerChannel.connect({ rpcKey })
      if (!channel) return false

      const identity = await this._pullIdentity(channel, peer)
      if (!identity) return false

      const registered = await this.registry.register({
        workerId: identity.workerId,
        deviceIds: identity.devices.map(d => d.deviceId),
        rpcKey,
        channel
      })
      if (!registered) {
        await this.workerChannel.disconnect(channel)
        return false
      }

      const contract = await this._pullCapabilities(channel)
      if (!contract || !this._validateContract(contract)) {
        debug(`invalid contract from ${identity.workerId}`)
        await this.registry.terminate(identity.workerId)
        return false
      }

      await this.registry.setReady(identity.workerId, contract)
      debug(`worker registered: ${identity.workerId} (${identity.devices.length} devices)`)
      return true
    } catch (err) {
      debug(`peer registration failed: ${err.message}`)
      return false
    }
  }

  /**
   * `who` names the peer in the log line. Identity is what tells the Kernel a
   * worker's id, so before it answers there is nothing to call it but its key —
   * and an unattributed "identity.request failed" is what made a missing worker
   * so hard to place.
   */
  async _pullIdentity (channel, who = 'unknown peer') {
    const envelope = buildEnvelope({
      action: ACTIONS.IDENTITY_REQUEST,
      type: MESSAGE_TYPES.REQUEST,
      sender: this._kernelId,
      payload: {}
    })
    try {
      const response = await this.workerChannel.send(channel, envelope, { timeout: 10000 })
      const check = this._checkReply(response, ACTIONS.IDENTITY_RESPONSE, validateIdentityResponse)
      if (!check.valid) {
        debug(`invalid identity.response from ${who}: ${check.error}`)
        return null
      }
      return response.payload
    } catch (err) {
      debug(`identity.request to ${who} failed: ${err.message}`)
      return null
    }
  }

  async _pullCapabilities (channel) {
    const envelope = buildEnvelope({
      action: ACTIONS.CAPABILITY_REQUEST,
      type: MESSAGE_TYPES.REQUEST,
      sender: this._kernelId,
      payload: {}
    })
    try {
      const response = await this.workerChannel.send(channel, envelope, { timeout: 10000 })
      const check = this._checkReply(response, ACTIONS.CAPABILITY_RESPONSE, validateCapabilityResponse)
      if (!check.valid) {
        debug(`invalid capability.response: ${check.error}`)
        return null
      }
      return response.payload.contract
    } catch (err) {
      debug(`capability.request failed: ${err.message}`)
      return null
    }
  }

  _checkReply (response, expectedAction, validatePayload) {
    const env = validateEnvelope(response)
    if (!env.valid) return env
    if (response.action !== expectedAction) return { valid: false, error: `ERR_UNEXPECTED_ACTION: ${response.action}` }
    return validatePayload(response.payload)
  }

  _validateContract (contract) {
    if (!contract || typeof contract !== 'object') return false
    if (!contract.capabilities || typeof contract.capabilities !== 'object') return false
    if (!contract.metadata || typeof contract.metadata !== 'object') return false
    return true
  }
}

module.exports = { DHTListener }
