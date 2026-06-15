'use strict'

const net = require('net')
const debug = require('debug')('mdk:client:ipc')

/**
 * IPCClient
 *
 * Persistent Unix-socket connection to the ORK IPC gateway.
 * The gateway processes requests sequentially per connection and writes
 * one response line per request line — exploited here via a FIFO queue.
 */
class IPCClient {
  constructor (sockPath) {
    this._path = sockPath
    this._socket = null
    this._buffer = ''
    this._queue = []
    this._connected = false
  }

  connect () {
    return new Promise((resolve, reject) => {
      const socket = net.connect(this._path, () => {
        this._connected = true
        debug('connected to %s', this._path)
        resolve()
      })

      socket.on('data', (chunk) => this._onData(chunk))

      socket.on('error', (err) => {
        debug('socket error: %s', err.message)
        const entry = this._queue.shift()
        if (entry) entry.reject(err)
        else if (!this._connected) reject(err)
      })

      socket.on('close', () => {
        this._connected = false
        const err = new Error('ERR_IPC_DISCONNECTED')
        while (this._queue.length) this._queue.shift().reject(err)
        debug('disconnected from %s', this._path)
      })

      this._socket = socket
    })
  }

  close () {
    if (this._socket) {
      this._socket.end()
      this._socket = null
    }
    this._connected = false
  }

  request (envelope) {
    if (!this._connected || !this._socket) {
      return Promise.reject(new Error('ERR_IPC_NOT_CONNECTED'))
    }

    return new Promise((resolve, reject) => {
      this._queue.push({ resolve, reject })
      this._socket.write(JSON.stringify(envelope) + '\n')
    })
  }

  _onData (chunk) {
    this._buffer += chunk.toString()
    let idx
    while ((idx = this._buffer.indexOf('\n')) !== -1) {
      const line = this._buffer.slice(0, idx).trim()
      this._buffer = this._buffer.slice(idx + 1)
      if (!line) continue

      const entry = this._queue.shift()
      if (!entry) continue

      try {
        entry.resolve(JSON.parse(line))
      } catch (e) {
        entry.reject(e)
      }
    }
  }
}

module.exports = { IPCClient }
