'use strict'

const crypto = require('crypto')
const debug = require('debug')('mdk:kernel:hrpc')
const HyperswarmRPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const { serialize, deserialize } = require('../protocol/envelope')
const { routeEnvelope } = require('./envelope-router')
const { parseAllowlist, normalizeKey } = require('./caller-auth')

/**
 * Kernel HRPC listener. Admission is fail-closed: only public keys on the
 * allowlist (`whitelist`, or added at runtime with allowKey()) may connect,
 * and an empty allowlist admits nobody. There is no way to admit every peer.
 * Admission grants nothing else: every request is authorized by its access
 * token against spec.rbac (the authorizer).
 */

class HRPCListener {
  constructor (opts) {
    this.dispatcher = opts.dispatcher
    this.telemetryCollector = opts.telemetryCollector
    this.registry = opts.registry
    this.actionManager = opts.actionManager
    this.rbac = opts.rbac || null
    this.identity = opts.identity || null
    this.authorizer = opts.authorizer || null
    if (opts.allowAll !== undefined) throw new Error('ERR_KERNEL_ALLOW_ALL_REMOVED: admit callers by key (whitelist, allowKey)')
    this._allowed = parseAllowlist(opts.whitelist)
    this.store = opts.store || null
    this.bootstrap = opts.bootstrap || null
    // Interface the DHT node binds (hyperdht `host`); default all interfaces.
    this.dhtHost = opts.dhtHost || null

    this._rpc = null
    this._server = null
    this._dht = null
    this._confBee = null
  }

  async start () {
    if (this._allowed.size === 0) {
      debug('HRPC allowlist is empty: every caller is rejected until allowKey() admits one')
    }

    const seedDht = await this._getOrCreateSeed('seedDht')
    const seedRpc = await this._getOrCreateSeed('seedRpc')

    this._dht = new DHT({
      keyPair: DHT.keyPair(seedDht),
      bootstrap: this.bootstrap,
      ...(this.dhtHost ? { host: this.dhtHost } : {})
    })
    this._rpc = new HyperswarmRPC({ dht: this._dht, seed: seedRpc })

    const firewall = this._buildFirewall()
    this._server = this._rpc.createServer({ firewall })

    this._server.respond('mdk', async (reqBuf, rpc) => {
      try {
        // Re-checked per request: a key revoked after its connection opened
        // must stop working without waiting for the connection to drop.
        const caller = this._callerFor(rpc)
        if (!caller) return serialize({ error: 'ERR_KERNEL_CALLER_NOT_ALLOWED' })
        const envelope = deserialize(reqBuf)
        const result = await this.handleEnvelope(envelope, caller)
        return serialize(result || {})
      } catch (err) {
        debug('request error: %s', err.message)
        return serialize({ error: err.message })
      }
    })

    await this._server.listen()

    const pubKeyHex = this._server.publicKey.toString('hex')
    debug('HRPC listener listening (pubkey: %s...)', pubKeyHex.slice(0, 16))

    return { publicKey: this._server.publicKey }
  }

  async stop () {
    if (this._server) { await this._server.close(); this._server = null }
    if (this._rpc) { await this._rpc.destroy(); this._rpc = null }
    if (this._dht) { await this._dht.destroy(); this._dht = null }
    debug('HRPC listener stopped')
  }

  getRpc () { return this._rpc }
  getDht () { return this._dht }

  getPublicKey () {
    return this._server ? this._server.publicKey : null
  }

  // The key this Kernel dials workers with (the DHT default keypair that
  // @hyperswarm/rpc clients connect from) — what a Worker allowlist names.
  getClientPublicKey () {
    return this._dht ? this._dht.defaultKeyPair.publicKey : null
  }

  /**
   * Admit a caller at runtime: it may connect; its token decides the rest.
   * @param {string|Buffer} key - caller public key
   */
  allowKey (key) {
    const hex = normalizeKey(key)
    this._allowed.add(hex)
    debug('caller allowed: %s...', hex.slice(0, 16))
    return hex
  }

  revokeKey (key) {
    const hex = normalizeKey(key)
    const had = this._allowed.delete(hex)
    if (had) debug('caller revoked: %s...', hex.slice(0, 16))
    return had
  }

  listAllowedKeys () {
    return [...this._allowed]
  }

  isAllowed (key) {
    try {
      return this._allowed.has(normalizeKey(key))
    } catch {
      return false
    }
  }

  _callerFor (rpc) {
    const remote = rpc && rpc.stream && rpc.stream.remotePublicKey
    if (!remote || !this.isAllowed(remote)) return null
    return { publicKey: remote.toString('hex') }
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

  async handleEnvelope (envelope, caller) {
    return routeEnvelope(envelope, {
      dispatcher: this.dispatcher,
      telemetryCollector: this.telemetryCollector,
      registry: this.registry,
      actionManager: this.actionManager,
      rbac: this.rbac,
      identity: this.identity,
      authorizer: this.authorizer
    }, caller)
  }

  // Returns true to reject. Fail closed: an unknown key is rejected even when
  // the allowlist is empty.
  _buildFirewall () {
    return (remotePublicKey) => {
      if (this.isAllowed(remotePublicKey)) return false
      debug('blocked: %s...', remotePublicKey.toString('hex').slice(0, 16))
      return true
    }
  }
}

module.exports = { HRPCListener }
