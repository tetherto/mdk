'use strict'

const crypto = require('crypto')
const debug = require('debug')('mdk:ork:hrpc')
const HyperswarmRPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const { validate: validateEnvelope, serialize, deserialize } = require('../protocol/envelope')
const { ACTIONS } = require('../protocol/actions')

class HRPCGateway {
  constructor (opts) {
    this.dispatcher = opts.dispatcher
    this.telemetryCollector = opts.telemetryCollector
    this.registry = opts.registry
    this.whitelist = new Set(opts.whitelist || [])
    this.store = opts.store || null

    this._rpc = null
    this._server = null
    this._dht = null
    this._confBee = null
  }

  async start () {
    const seedDht = await this._getOrCreateSeed('seedDht')
    const seedRpc = await this._getOrCreateSeed('seedRpc')

    this._dht = new DHT({ keyPair: DHT.keyPair(seedDht) })
    this._rpc = new HyperswarmRPC({ dht: this._dht, seed: seedRpc })

    const firewall = this._buildFirewall()
    this._server = this._rpc.createServer({ firewall })

    this._server.respond('mdk', async (reqBuf) => {
      try {
        const envelope = deserialize(reqBuf)
        const result = await this.handleEnvelope(envelope)
        return serialize(result || {})
      } catch (err) {
        debug('request error: %s', err.message)
        return serialize({ error: err.message })
      }
    })

    await this._server.listen()

    const pubKeyHex = this._server.publicKey.toString('hex')
    debug('HRPC gateway listening (pubkey: %s...)', pubKeyHex.slice(0, 16))

    return { publicKey: this._server.publicKey }
  }

  async stop () {
    if (this._server) { await this._server.close(); this._server = null }
    if (this._rpc) { await this._rpc.destroy(); this._rpc = null }
    if (this._dht) { await this._dht.destroy(); this._dht = null }
    debug('HRPC gateway stopped')
  }

  getRpc () { return this._rpc }
  getDht () { return this._dht }

  getPublicKey () {
    return this._server ? this._server.publicKey : null
  }

  async _getOrCreateSeed (name) {
    if (!this.store) return crypto.randomBytes(32)

    if (!this._confBee) {
      this._confBee = this.store.getBee
        ? this.store.getBee({ name: 'storeConf' }, { keyEncoding: 'utf-8' })
        : this.store.sub('storeConf')
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

  async handleEnvelope (envelope) {
    const validation = validateEnvelope(envelope)
    if (!validation.valid) return { error: validation.error }

    switch (envelope.action) {
      case ACTIONS.COMMAND_REQUEST:
        return this.dispatcher.dispatch(envelope)
      case ACTIONS.TELEMETRY_PULL:
        return this.telemetryCollector.pull(
          envelope.deviceId,
          envelope.payload && envelope.payload.query
        )
      case ACTIONS.STATE_PULL:
        return this.telemetryCollector.pullState(envelope.deviceId)
      case ACTIONS.WORKER_LIST:
        return { workers: this.registry.listWorkers() }
      case ACTIONS.DEVICE_CAPABILITIES:
        return { capabilities: this.registry.getCapabilities(envelope.deviceId) }
      case ACTIONS.WORKER_TERMINATE: {
        const { workerId } = envelope.payload || {}
        if (!workerId) return { error: 'ERR_WORKER_ID_REQUIRED' }
        await this.registry.terminate(workerId)
        return { status: 'TERMINATED', workerId }
      }
      default:
        return { error: `ERR_UNKNOWN_ACTION: ${envelope.action}` }
    }
  }

  _buildFirewall () {
    return (remotePublicKey) => {
      if (this.whitelist.size === 0) return false
      const hex = remotePublicKey.toString('hex')
      if (this.whitelist.has(hex)) return false
      debug('blocked: %s...', hex.slice(0, 16))
      return true
    }
  }
}

module.exports = { HRPCGateway }
