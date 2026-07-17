'use strict'

const fs = require('fs')
const path = require('path')
const BaseMock = require('./base.mock')

class MinerMock extends BaseMock {
  _resolveCmd (command, { typeFirst = false } = {}) {
    const base = path.join(this.constructor.dir, 'cmds')
    const generic = path.join(base, String(command))
    const withType = path.join(base, String(this.ctx.type), String(command))
    const order = typeFirst ? [withType, generic] : [generic, withType]
    const found = order.find((p) => fs.existsSync(p + '.js'))
    return found ? require(found) : null
  }
}

module.exports = MinerMock
