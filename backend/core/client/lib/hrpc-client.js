'use strict'

const debug = require('debug')('mdk:client:hrpc')
const HyperswarmRPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const { serialize, deserialize, validate } = require('@tetherto/mdk-kernel/protocol/envelope')
const { MESSAGE_TYPES } = require('@tetherto/mdk-kernel/protocol/actions')

// Default per-request timeout. protomux-rpc has none, so without it an
// unresponsive peer would hang the caller (and pin its DHT connection) forever.
const DEFAULT_TIMEOUT_MS = 30000

/**
 * HRPCClient
 *
 * MDK transport over the Kernel HRPC listener (the RPC listener). Each request is an
 * independent @hyperswarm/rpc call to the listener's 'mdk' responder, so no FIFO
 * queue is needed: concurrent requests are multiplexed by the RPC layer.
 *
 * `key` is the Kernel listener public key (hex string or Buffer) obtained from
 * `kernel.getPublicKey()`. `keyPair` (or a function returning one), or `seed`,
 * pins the DHT identity this client dials with, so the Kernel allowlist can
 * name it. A `dht`/`rpc` may be injected to share an existing transport
 * (worker clients reuse their parent's); otherwise this client owns and tears
 * down its own.
 *
 * `timeout` (ms, default 30000) bounds every request; request(env, { timeout })
 * overrides it per call. A timed-out request rejects with ERR_MDK_REQUEST_TIMEOUT.
 *
 * `envelope: true` marks a peer that answers with MDK Protocol envelopes (a
 * Worker). Its replies are checked with the protocol's validate() and a reply
 * that is not a well-formed response envelope rejects with
 * ERR_MDK_RESPONSE_INVALID. The Kernel listener answers with bare result
 * values, so a Kernel client only rejects replies that are not valid JSON.
 */
class HRPCClient {
  constructor (opts) {
    if (!opts || !opts.key) throw new Error('ERR_MDK_CLIENT_HRPC_KEY_REQUIRED')

    this._key = Buffer.isBuffer(opts.key) ? opts.key : Buffer.from(opts.key, 'hex')
    this._seed = opts.seed || null
    this._keyPair = opts.keyPair || null
    this._bootstrap = opts.bootstrap || null
    this._dhtHost = opts.dhtHost || null
    this._dht = opts.dht || null
    this._rpc = opts.rpc || null
    this._ownsTransport = !opts.rpc
    this._connected = false
    this._timeout = opts.timeout === undefined ? DEFAULT_TIMEOUT_MS : opts.timeout
    if (!_isTimeout(this._timeout)) throw new Error('ERR_MDK_CLIENT_TIMEOUT_INVALID')
    this._envelope = opts.envelope === true
  }

  // Transport opts for a client to another peer (a Worker) that should dial
  // with this client's identity: the live rpc when connected (one DHT node,
  // one keypair), else the same keyPair/seed/bootstrap/dhtHost to build an equal one.
  childOpts () {
    const base = { timeout: this._timeout }
    if (this._connected && this._rpc) return { ...base, rpc: this._rpc, dht: this._dht }
    return {
      ...base,
      ...(this._keyPair ? { keyPair: this._keyPair } : {}),
      ...(this._seed ? { seed: this._seed } : {}),
      ...(this._bootstrap ? { bootstrap: this._bootstrap } : {}),
      ...(this._dhtHost ? { dhtHost: this._dhtHost } : {})
    }
  }

  async connect () {
    if (!this._rpc) {
      const dhtOpts = {}
      const keyPair = typeof this._keyPair === 'function' ? await this._keyPair() : this._keyPair
      if (keyPair) dhtOpts.keyPair = keyPair
      else if (this._seed) dhtOpts.keyPair = DHT.keyPair(this._seed)
      if (this._bootstrap) dhtOpts.bootstrap = this._bootstrap
      if (this._dhtHost) dhtOpts.host = this._dhtHost
      this._dht = new DHT(dhtOpts)
      this._rpc = new HyperswarmRPC({ dht: this._dht })
    }
    this._connected = true
    debug('connected to kernel %s...', this._key.toString('hex').slice(0, 16))
  }

  async close () {
    this._connected = false
    if (!this._ownsTransport) return
    if (this._rpc) { await this._rpc.destroy(); this._rpc = null }
    if (this._dht) { await this._dht.destroy(); this._dht = null }
    debug('closed')
  }

  async request (envelope, { timeout } = {}) {
    if (!this._connected || !this._rpc) throw new Error('ERR_HRPC_NOT_CONNECTED')
    const ms = timeout === undefined ? this._timeout : timeout
    if (!_isTimeout(ms)) throw new Error('ERR_MDK_CLIENT_TIMEOUT_INVALID')

    // The timeout is passed to the RPC layer and also raced here, so the
    // bound holds while the connection itself is still being established.
    let timer
    const expired = new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(_timeoutError()), ms)
    })
    let resBuf
    try {
      resBuf = await Promise.race([this._rpc.request(this._key, 'mdk', serialize(envelope), { timeout: ms }), expired])
    } catch (err) {
      if (err && err.code === 'TIMEOUT_EXCEEDED') throw _timeoutError(err)
      throw err
    } finally {
      clearTimeout(timer)
    }

    let res
    try {
      res = deserialize(resBuf)
    } catch (err) {
      throw _invalid('ERR_RESPONSE_NOT_JSON')
    }
    return this._envelope ? _checkEnvelope(res) : res
  }
}

function _checkEnvelope (res) {
  // A Worker that fails before dispatch answers with a bare { error } instead
  // of an envelope; surface its code, never an arbitrary message.
  if (res && typeof res === 'object' && !Array.isArray(res) && Object.keys(res).length === 1 && typeof res.error === 'string') {
    if (/^ERR_[A-Z0-9_]+/.test(res.error)) {
      const err = new Error(res.error)
      err.code = res.error.split(':')[0]
      throw err
    }
    throw _invalid('ERR_RESPONSE_ERROR')
  }
  const v = validate(res)
  if (!v.valid) throw _invalid(v.error)
  if (res.type !== MESSAGE_TYPES.RESPONSE) throw _invalid('ERR_ENVELOPE_TYPE_INVALID')
  return res
}

function _invalid (reason) {
  const err = new Error(`ERR_MDK_RESPONSE_INVALID: ${reason}`)
  err.code = 'ERR_MDK_RESPONSE_INVALID'
  return err
}

function _timeoutError (cause) {
  const err = new Error('ERR_MDK_REQUEST_TIMEOUT', cause ? { cause } : undefined)
  err.code = 'ERR_MDK_REQUEST_TIMEOUT'
  return err
}

function _isTimeout (ms) {
  return typeof ms === 'number' && Number.isFinite(ms) && ms > 0
}

module.exports = { HRPCClient, DEFAULT_TIMEOUT_MS }
