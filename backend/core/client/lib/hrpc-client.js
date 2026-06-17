'use strict'

const debug = require('debug')('mdk:client:hrpc')
const HyperswarmRPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const { serialize, deserialize } = require('../../ork/lib/protocol/envelope')

/**
 * HRPCClient
 *
 * MDK transport over the ORK HRPC gateway (the RPC gateway). Each request is an
 * independent @hyperswarm/rpc call to the gateway's 'mdk' responder, so — unlike
 * the newline-delimited IPC transport — no FIFO queue is needed: concurrent
 * requests are multiplexed by the RPC layer.
 *
 * `key` is the ORK gateway public key (hex string or Buffer) obtained from
 * `ork.getPublicKey()`. A `dht`/`rpc` may be injected (tests) to share an
 * existing transport; otherwise this client owns and tears down its own.
 */
class HRPCClient {
  constructor (opts) {
    if (!opts || !opts.key) throw new Error('ERR_MDK_CLIENT_HRPC_KEY_REQUIRED')

    this._key = Buffer.isBuffer(opts.key) ? opts.key : Buffer.from(opts.key, 'hex')
    this._seed = opts.seed || null
    this._bootstrap = opts.bootstrap || null
    this._dht = opts.dht || null
    this._rpc = opts.rpc || null
    this._ownsTransport = !opts.rpc
    this._connected = false
  }

  connect () {
    if (!this._rpc) {
      const dhtOpts = {}
      if (this._seed) dhtOpts.keyPair = DHT.keyPair(this._seed)
      if (this._bootstrap) dhtOpts.bootstrap = this._bootstrap
      this._dht = new DHT(dhtOpts)
      this._rpc = new HyperswarmRPC({ dht: this._dht })
    }
    this._connected = true
    debug('connected to ork %s...', this._key.toString('hex').slice(0, 16))
    return Promise.resolve()
  }

  async close () {
    this._connected = false
    if (!this._ownsTransport) return
    if (this._rpc) { await this._rpc.destroy(); this._rpc = null }
    if (this._dht) { await this._dht.destroy(); this._dht = null }
    debug('closed')
  }

  async request (envelope) {
    if (!this._connected || !this._rpc) throw new Error('ERR_HRPC_NOT_CONNECTED')
    const resBuf = await this._rpc.request(this._key, 'mdk', serialize(envelope))
    return deserialize(resBuf)
  }
}

module.exports = { HRPCClient }
