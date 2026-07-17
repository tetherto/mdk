'use strict'

const BaseMock = require('./base.mock')
const ModbusTransport = require('./transports/modbus.transport')

class PowerMeterMock extends BaseMock {
  static defaultPort = 5020

  createTransport () {
    return new ModbusTransport(this, { bind: this._loaded.bind })
  }
}

module.exports = PowerMeterMock
