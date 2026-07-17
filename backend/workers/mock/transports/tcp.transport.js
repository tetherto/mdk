'use strict'

const net = require('net')
const BaseTransport = require('./base.transport')

class TcpTransport extends BaseTransport {
  listen (host, port) {
    const onData = this.handlers.onData
    this.server = new net.Server()
    this.server.on('connection', (socket) => {
      socket.on('error', () => socket.destroy())
      socket.on('data', (chunk) => onData(socket, chunk))
    })
    if (typeof this.handlers.onClose === 'function') this.server.on('close', this.handlers.onClose)
    this.server.listen(port, host)
    return this
  }
}

module.exports = TcpTransport
