'use strict'

const Hyperswarm = require('hyperswarm')
const debug = require('debug')('mdk:ork:discovery')
const { ACTIONS, MESSAGE_TYPES } = require('../protocol/actions')
const { build: buildEnvelope } = require('../protocol/envelope')

/**
 * DHT Listener — Worker Discovery
 *
 * Discovery flow:
 *   1. Worker starts an RPC server (via @hyperswarm/rpc) and gets a public key
 *   2. Worker joins a known Hyperswarm topic as a server
 *   3. On swarm connection, worker sends its RPC public key (first 32 bytes)
 *   4. ORK joins same topic as client, receives worker's RPC key
 *   5. ORK uses that key with WorkerChannel (HRPC) for all subsequent communication
 *   6. ORK sends identity.request → capability.request → marks Ready
 *
 * The swarm stream is only used for key exchange. All protocol communication
 * goes through @hyperswarm/rpc (stateless request/response, pooled connections).
 */
class DHTListener {
  constructor (opts) {
    this.topic = opts.topic
    this.registry = opts.registry
    this.workerChannel = opts.workerChannel
    this._swarmOpts = opts.swarmOpts || {}
    this._swarm = null
    this._dht = null
    this._ownsDht = false
    this._orkId = 'ork:kernel:default'
    this._discoveredPeers = new Set()
  }

  setDht (dht) {
    this._dht = dht
  }

  async start () {
    if (!this.topic) {
      debug('DHT listener: no topic configured, skipping')
      return
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

    this._swarm.on('connection', (stream, info) => {
      this._handleSwarmConnection(stream, info)
    })

    this._swarm.join(topicBuf, { server: false, client: true })

    // Periodically re-flush to discover workers that joined after us
    this._refreshTimer = setInterval(() => {
      if (this._swarm) this._swarm.flush().catch(() => {})
    }, 10000)

    debug(`DHT listener started (topic: ${topicBuf.toString('hex').slice(0, 16)}...)`)
  }

  async stop () {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer)
      this._refreshTimer = null
    }
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
        const identity = await this._pullIdentity(worker.channel)
        if (!identity) continue
        const newDeviceIds = identity.devices.map(d => d.deviceId)
        await this.registry.syncDeviceIds(worker.workerId, newDeviceIds, worker.channel)
      } catch (err) {
        debug(`identity refresh failed for ${worker.workerId}: ${err.message}`)
      }
    }
  }

  async _onWorkerKeyReceived (rpcKey) {
    if (this._discoveredPeers.has(rpcKey)) {
      debug(`peer already discovered: ${rpcKey.slice(0, 16)}...`)
      return
    }
    this._discoveredPeers.add(rpcKey)
    debug(`worker RPC key received: ${rpcKey.slice(0, 16)}...`)

    try {
      const channel = this.workerChannel.connect({ rpcKey })
      if (!channel) {
        this._discoveredPeers.delete(rpcKey)
        return
      }

      const identity = await this._pullIdentity(channel)
      if (!identity) {
        this._discoveredPeers.delete(rpcKey)
        return
      }

      const registered = await this.registry.register({
        workerId: identity.workerId,
        deviceIds: identity.devices.map(d => d.deviceId),
        rpcKey,
        channel
      })
      if (!registered) {
        await this.workerChannel.disconnect(channel)
        this._discoveredPeers.delete(rpcKey)
        return
      }

      const contract = await this._pullCapabilities(channel)
      if (!contract) return

      if (!this._validateContract(contract)) {
        debug(`invalid contract from ${identity.workerId}`)
        await this.registry.terminate(identity.workerId)
        this._discoveredPeers.delete(rpcKey)
        return
      }

      await this.registry.setReady(identity.workerId, contract)
      debug(`worker registered: ${identity.workerId} (${identity.devices.length} devices)`)
    } catch (err) {
      debug(`peer registration failed: ${err.message}`)
      this._discoveredPeers.delete(rpcKey)
    }
  }

  async _pullIdentity (channel) {
    const envelope = buildEnvelope({
      action: ACTIONS.IDENTITY_REQUEST,
      type: MESSAGE_TYPES.REQUEST,
      sender: this._orkId,
      payload: {}
    })
    try {
      const response = await this.workerChannel.send(channel, envelope, { timeout: 10000 })
      return response && response.payload ? response.payload : null
    } catch (err) {
      debug(`identity.request failed: ${err.message}`)
      return null
    }
  }

  async _pullCapabilities (channel) {
    const envelope = buildEnvelope({
      action: ACTIONS.CAPABILITY_REQUEST,
      type: MESSAGE_TYPES.REQUEST,
      sender: this._orkId,
      payload: {}
    })
    try {
      const response = await this.workerChannel.send(channel, envelope, { timeout: 10000 })
      return response && response.payload ? response.payload.contract : null
    } catch (err) {
      debug(`capability.request failed: ${err.message}`)
      return null
    }
  }

  _validateContract (contract) {
    if (!contract || typeof contract !== 'object') return false
    if (!contract.capabilities || typeof contract.capabilities !== 'object') return false
    if (!contract.metadata || typeof contract.metadata !== 'object') return false
    return true
  }
}

module.exports = { DHTListener }
