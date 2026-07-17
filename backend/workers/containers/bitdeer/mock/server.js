'use strict'

const fs = require('fs')
const path = require('path')
const ContainerMock = require('../../../mock/container.mock')
const MqttTransport = require('../../../mock/transports/mqtt.transport')

class BitdeerMock extends ContainerMock {
  static dir = __dirname
  static TYPES = ['d40_m56', 'd40_m30', 'd40_a1346', 'd40_s19xp']
  static defaultPort = 10883
  static extraCliOptions = {
    id: { type: 'string', default: 'C024_D40', description: 'container id (MQTT topic prefix)' }
  }

  constructor (ctx = {}) {
    super(ctx)
    const [type, ...cap] = String(this.ctx.type || '').split('+')
    this.ctx.type = type
    this.ctx.cap = cap
  }

  _loadState () {
    this._loaded = require('./d40/initialState')(this.ctx)
    this.state = this._loaded.state !== undefined ? this._loaded.state : this._loaded
    this._stateCleanup = typeof this._loaded.cleanup === 'function' ? this._loaded.cleanup : null
  }

  createTransport () {
    return new MqttTransport(this, { emitter: this._resolveEmitter() })
  }

  _resolveEmitter () {
    const d40 = path.join(this.constructor.dir, 'd40')
    const order = [path.join(d40, this.ctx.type.toLowerCase()), path.join(d40, 'default')]
    const found = order.find((p) => fs.existsSync(p + '.js'))
    if (!found) throw new Error('ERR_MODEL_NOTFOUND')
    return require(found)
  }
}

module.exports = BitdeerMock.expose(module)
