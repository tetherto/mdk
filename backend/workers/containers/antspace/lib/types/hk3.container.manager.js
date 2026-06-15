'use strict'

const AntspaceHydro = require('../antspace.hydro.js')
const AnstspaceManager = require('../antspace.manager.js')

class AnstspaceManagerHK3 extends AnstspaceManager {
  getThingType () {
    return super.getThingType() + '-hk3'
  }

  async connectThing (thg) {
    if (!thg.opts.address || !thg.opts.port) {
      return 0
    }

    const container = new AntspaceHydro({
      ...thg.opts,
      client: this.http_0,
      conf: this.conf.thing.container || {}
    })

    container.on('error', e => {
      this.debugThingError(thg, e)
    })

    thg.ctrl = container

    return 1
  }
}

module.exports = AnstspaceManagerHK3
