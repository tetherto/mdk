'use strict'

const AntspaceImmersion = require('../antspace.immersion.js')
const AnstspaceManager = require('../antspace.manager.js')

class AnstspaceManagerImmersion extends AnstspaceManager {
  getThingType () {
    return super.getThingType() + '-immersion'
  }

  async connectThing (thg) {
    if (!thg.opts.address || !thg.opts.port) {
      return 0
    }

    const container = new AntspaceImmersion({
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

module.exports = AnstspaceManagerImmersion
