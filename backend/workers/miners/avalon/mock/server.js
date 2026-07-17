'use strict'

const MinerMock = require('../../../mock/miner.mock')
const TcpTransport = require('../../../mock/transports/tcp.transport')
const { promiseSleep } = require('@bitfinex/lib-js-util-promise')

class AvalonMock extends MinerMock {
  static dir = __dirname
  static TYPES = ['a1346']
  static defaultPort = 4028
  static extraCliOptions = {
    serial: { type: 'string', default: '0000000000000000' },
    minerpoolMockPort: { type: 'number', default: 8000 },
    minerpoolMockHost: { type: 'string', default: '127.0.0.1' }
  }

  createTransport () {
    return new TcpTransport(this, { onData: this._onData.bind(this), onClose: this._stateCleanup })
  }

  async _onData (socket, chunk) {
    const req = chunk.toString()
    const command = req.includes('ascset') ? 'ascset_' + req.split(',')[1] : req
    try {
      const fn = this._resolveCmd(command, { typeFirst: true })
      if (!fn) throw new Error('ERR_CMD_NOTFOUND')
      const res = fn(this.ctx, this.state, req)
      if (this.ctx.delay) await promiseSleep(this.ctx.delay)
      socket.write(res)
    } catch (e) {
      // device sends no reply on an unknown/garbled command
    } finally {
      socket.end()
    }
  }
}

module.exports = AvalonMock.expose(module)
