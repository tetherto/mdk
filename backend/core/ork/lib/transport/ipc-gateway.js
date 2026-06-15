'use strict'

const net = require('net')
const fs = require('fs')
const debug = require('debug')('mdk:ork:ipc')
const { validate: validateEnvelope } = require('../protocol/envelope')
const { ACTIONS } = require('../protocol/actions')

/**
 * IPC Gateway
 *
 * Local same-machine transport via Unix domain socket.
 * Implicitly trusted — no auth (local trust model).
 * Protocol: newline-delimited JSON (one envelope per line, one response per line).
 */
class IPCGateway {
  constructor (opts) {
    this.dispatcher = opts.dispatcher
    this.telemetryCollector = opts.telemetryCollector
    this.registry = opts.registry
    this.path = opts.path || '/tmp/mdk-ork.sock'
    this._server = null
  }

  async start () {
    // Remove stale socket file
    try { fs.unlinkSync(this.path) } catch (e) {}

    return new Promise((resolve, reject) => {
      this._server = net.createServer((socket) => {
        this._handleConnection(socket)
      })

      this._server.on('error', (err) => {
        debug(`IPC server error: ${err.message}`)
        reject(err)
      })

      this._server.listen(this.path, () => {
        debug(`IPC gateway listening (path: ${this.path})`)
        resolve()
      })
    })
  }

  async stop () {
    if (this._server) {
      await new Promise((resolve) => {
        this._server.close(resolve)
      })
      this._server = null
    }
    // Clean up socket file
    try { fs.unlinkSync(this.path) } catch (e) {}
    debug('IPC gateway stopped')
  }

  /**
   * Handle a new socket connection.
   * Reads newline-delimited JSON envelopes, processes each, sends response.
   */
  _handleConnection (socket) {
    let buffer = ''

    socket.on('data', async (chunk) => {
      buffer += chunk.toString()

      let newlineIdx
      while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIdx).trim()
        buffer = buffer.slice(newlineIdx + 1)

        if (!line) continue

        try {
          const envelope = JSON.parse(line)
          const result = await this.handleEnvelope(envelope)
          socket.write(JSON.stringify(result || {}) + '\n')
        } catch (err) {
          debug(`IPC parse/handle error: ${err.message}`)
          socket.write(JSON.stringify({ error: err.message }) + '\n')
        }
      }
    })

    socket.on('error', (err) => {
      debug(`IPC socket error: ${err.message}`)
    })
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
}

module.exports = { IPCGateway }
