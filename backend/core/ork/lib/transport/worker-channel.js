'use strict'

const debug = require('debug')('mdk:ork:channel')
const { serialize, deserialize } = require('../protocol/envelope')

/**
 * Worker Channel
 *
 * Outbound HRPC client used by ORK to send MDK Protocol envelopes to workers.
 * Workers are RPC servers that respond to method 'mdk'.
 *
 * Two usage modes:
 * 1. HRPC mode: connect() creates an RPC channel via @hyperswarm/rpc.request()
 * 2. In-process mode: channel has a direct request() method (used in tests/demo)
 */
class WorkerChannel {
  constructor (opts) {
    this.timeout = opts.timeout || 30000
    this._rpc = opts.rpc || null // shared @hyperswarm/rpc instance (set by HRPCGateway)
  }

  /**
   * Set the shared RPC instance (called by ORK after HRPC gateway starts)
   */
  setRpc (rpc) {
    this._rpc = rpc
  }

  /**
   * Send an envelope to a worker and await response
   * @param {object} channel - Worker channel (from connect() or in-process mock)
   * @param {object} envelope - MDK Protocol envelope
   * @param {object} [opts] - { timeout }
   * @returns {object} Response envelope
   */
  async send (channel, envelope, opts) {
    const timeout = (opts && opts.timeout) || this.timeout
    if (!channel) throw new Error('ERR_CHANNEL_NOT_CONNECTED')
    return this._sendWithTimeout(channel, envelope, timeout)
  }

  async _sendWithTimeout (channel, envelope, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('ERR_CHANNEL_TIMEOUT')), timeout)

      const doSend = async () => {
        try {
          let response
          if (channel._hrpcKey && this._rpc) {
            // HRPC mode: send via @hyperswarm/rpc
            const reqBuf = serialize(envelope)
            const resBuf = await this._rpc.request(channel._hrpcKey, 'mdk', reqBuf)
            response = deserialize(resBuf)
          } else if (typeof channel.request === 'function') {
            // In-process mode: direct call (used in tests/demo)
            response = await channel.request(envelope)
          } else {
            throw new Error('ERR_CHANNEL_NO_SEND_METHOD')
          }
          clearTimeout(timer)
          resolve(response)
        } catch (err) {
          clearTimeout(timer)
          reject(err)
        }
      }

      doSend()
    })
  }

  /**
   * Create a channel to a worker via its public key.
   * The channel is a lightweight wrapper — actual HRPC connection is pooled by @hyperswarm/rpc.
   * @param {object} opts
   * @param {string} opts.rpcKey - Worker's public key (hex string)
   * @returns {object} Channel with _hrpcKey for send() to use
   */
  connect (opts) {
    if (!opts.rpcKey) throw new Error('ERR_CHANNEL_RPC_KEY_REQUIRED')

    const publicKey = Buffer.isBuffer(opts.rpcKey)
      ? opts.rpcKey
      : Buffer.from(opts.rpcKey, 'hex')

    debug(`channel created for worker: ${publicKey.toString('hex').slice(0, 16)}...`)

    return {
      _hrpcKey: publicKey,
      // Convenience: allow channel.request() in-process too
      request: async (envelope) => {
        if (!this._rpc) throw new Error('ERR_RPC_NOT_INITIALIZED')
        const reqBuf = serialize(envelope)
        const resBuf = await this._rpc.request(publicKey, 'mdk', reqBuf)
        return deserialize(resBuf)
      },
      close: async () => {
        // @hyperswarm/rpc pools connections — no per-channel cleanup needed
      }
    }
  }

  async disconnect (channel) {
    if (channel && typeof channel.close === 'function') {
      await channel.close()
    }
  }
}

module.exports = { WorkerChannel }
