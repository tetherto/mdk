'use strict'

const MinerMock = require('../../../mock/miner.mock')
const TcpTransport = require('../../../mock/transports/tcp.transport')
const { promiseSleep } = require('@bitfinex/lib-js-util-promise')
const { decryptCommand, encryptResponse } = require('./utils')
const md5 = require('../lib/utils/md5')

const DEFAULT_KEY = 'x5JSSQzqF0lEACIGSL0Ld1'
const SALT = '5QAHiKMb'

class WhatsminerMock extends MinerMock {
  static dir = __dirname
  static TYPES = ['m63', 'm56s', 'm53s', 'm30sp', 'm30spp']
  static defaultPort = 4028
  static extraCliOptions = {
    serial: { type: 'string', default: 'HHM38S98302B24K40073' },
    password: { type: 'string', default: 'admin' },
    minerpoolMockPort: { type: 'number', default: 8000 },
    minerpoolMockHost: { type: 'string', default: '127.0.0.1' }
  }

  constructor (ctx = {}) {
    super(ctx)
    if (this.ctx.password == null) this.ctx.password = 'admin'
    this.ctx.validTokens = new Set()
    this.ctx.encryptionKey = WhatsminerMock._encryptionKey(this.ctx.password)
  }

  static _encryptionKey (password) {
    if (!password) return DEFAULT_KEY
    const key = md5.crypt(password, SALT)
    const arr = key.split('$')
    return arr[arr.length - 1]
  }

  createTransport () {
    return new TcpTransport(this, { onData: this._onData.bind(this), onClose: this._stateCleanup })
  }

  _validateToken (cmd) {
    if (!cmd.token) return false
    if (this.ctx.password) return true
    return this.ctx.validTokens.has(cmd.token)
  }

  async _onData (socket, chunk) {
    const delay = this.ctx.delay
    let req
    try {
      req = JSON.parse(chunk.toString())
    } catch (e) {
      return this._sendError(socket, 23, 'json cmd err', true, delay)
    }

    const isEncrypted = req.enc === 1
    let cmd = req

    if (isEncrypted) {
      try {
        cmd = decryptCommand(req, this.ctx.encryptionKey)
      } catch (e) {
        return this._sendError(socket, 23, 'json cmd err', true, delay)
      }
      if (!cmd) return this._sendError(socket, 135, 'check token err', true, delay)
      if (!this._validateToken(cmd)) return this._sendError(socket, 135, 'check token err', true, delay)
      if (cmd.token) this.ctx.validTokens.add(cmd.token)
    }

    const command = cmd.cmd || cmd.command || null
    const fn = this._resolveCmd(command)
    if (!fn) return this._sendError(socket, 14, 'invalid cmd', isEncrypted, delay)

    try {
      const res = fn(this.ctx, this.state, cmd)
      if (res === null) {
        socket.end()
        return
      }
      await this._send(socket, res, isEncrypted, delay)
    } catch (e) {
      await this._sendError(socket, 14, 'invalid cmd', isEncrypted, delay)
    }
  }

  async _send (socket, data, isEncrypted, delay) {
    if (delay) await promiseSleep(delay)
    socket.write(isEncrypted ? encryptResponse(data, this.ctx.encryptionKey) : JSON.stringify(data))
    socket.destroy()
  }

  async _sendError (socket, code, msg, isEncrypted, delay) {
    const resp = { STATUS: 'E', When: +new Date(), Code: code, Msg: msg, Description: '' }
    if (delay) await promiseSleep(delay)
    // device double-encodes encrypted error frames
    socket.write(isEncrypted
      ? JSON.stringify(encryptResponse(resp, this.ctx.encryptionKey))
      : JSON.stringify(resp))
    socket.destroy()
  }
}

module.exports = WhatsminerMock.expose(module)
