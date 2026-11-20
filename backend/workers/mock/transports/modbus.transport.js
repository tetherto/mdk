'use strict'

const BaseTransport = require('./base.transport')

class ModbusTransport extends BaseTransport {
  listen (host, port) {
    const modbus = this._require('modbus-stream')
    const { bind } = this.handlers
    this.server = modbus.tcp.server({ debug: null }, (connection) => bind(connection)).listen(port, host)
    this._trackConnections(this.server)
    return this.server
  }
}

module.exports = ModbusTransport
