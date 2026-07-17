'use strict'

const { BaseMock, TcpTransport } = require('../../../../backend/workers/mock')

// A standalone "vendor" miner simulator: newline-delimited JSON over TCP.
// This is the device-side API the Worker Plugin translates against — it knows
// nothing about MDK.
class SimMinerMock extends BaseMock {
  static defaultPort = 15100
  static useControlAgent = false
  static dir = __dirname

  createTransport () {
    return new TcpTransport(this, { onData: (socket, chunk) => this._onData(socket, chunk) })
  }

  _onData (socket, chunk) {
    socket._buf = (socket._buf || '') + chunk.toString()
    let nl
    while ((nl = socket._buf.indexOf('\n')) !== -1) {
      const line = socket._buf.slice(0, nl)
      socket._buf = socket._buf.slice(nl + 1)
      if (!line.trim()) continue
      socket.write(JSON.stringify(this._exec(JSON.parse(line))) + '\n')
    }
  }

  _exec (msg) {
    switch (msg.cmd) {
      case 'stats':
        return {
          ok: true,
          stats: {
            serial: this.state.serial,
            hashrateThs: this.state.hashrateThs,
            powerW: this.state.powerW,
            powerLimitW: this.state.powerLimitW,
            uptimeS: Math.floor((Date.now() - this.state.bootTime) / 1000)
          }
        }
      case 'set_power_limit':
        this.state.powerLimitW = msg.watts
        return { ok: true, powerLimitW: msg.watts }
      case 'reboot':
        this.state.bootTime = Date.now()
        return { ok: true }
      default:
        return { ok: false, error: `ERR_UNKNOWN_CMD: ${msg.cmd}` }
    }
  }
}

module.exports = SimMinerMock
