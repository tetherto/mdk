'use strict'

const ContainerManager = require('../../../tpls/tpl-lib-container/lib/container.manager')
const HttpFacility = require('@bitfinex/bfx-facs-http')

class AnstspaceManager extends ContainerManager {
  async init () {
    await super.init()

    this.http_0 = new HttpFacility(this, {}, {})

    this.mdkThgWriteCalls_0.whitelistActions([
      ['resetCoolingSystem', 2],
      ['setLiquidSupplyTemperature', 2]
    ])
  }

  getThingType () {
    return super.getThingType() + '-as'
  }

  selectThingInfo (thg) {
    return {
      address: thg.opts?.address,
      port: thg.opts?.port
    }
  }

  getThingTags () {
    return ['antspace']
  }

  getSpecTags () {
    return ['container']
  }

  async collectThingSnap (thg) {
    return thg.ctrl.getSnap()
  }

  async connectThing (thg) {
    throw new Error('ERR_NO_IMPL')
  }
}

module.exports = AnstspaceManager
