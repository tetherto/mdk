'use strict'

const BaseTransport = require('./base.transport')

class MqttTransport extends BaseTransport {
  listen (host, port) {
    const mqtt = this._require('mqtt')
    this.client = mqtt.connect(`mqtt://${host}:${port}`)
    this._cleanup = this.handlers.emitter(this.ctx, this.client, this.state)
    this.client.on('end', () => this._runCleanup())
    return this
  }

  _runCleanup () {
    if (typeof this._cleanup === 'function') this._cleanup()
    this._cleanup = null
  }

  close () {
    // force-end: a client stuck in a reconnect loop (broker gone) never
    // flushes, so a graceful end() can leave its retry timer holding the
    // event loop open. Cleanup runs here too — 'end' may never fire then.
    if (this.client) this.client.end(true)
    this._runCleanup()
  }

  get listening () {
    return !!(this.client && this.client.connected)
  }
}

module.exports = MqttTransport
