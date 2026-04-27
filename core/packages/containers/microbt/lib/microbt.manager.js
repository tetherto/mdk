'use strict'

const ContainerManager = require('../../../tpls/tpl-lib-container/lib/container.manager.js')
const Container = require('./container.js')
const ModbusFacility = require('svc-facs-modbus')

class MicroBTManager extends ContainerManager {
  async init () {
    await super.init()

    this.modbus_0 = new ModbusFacility(this, {}, {})

    this.miningosThgWriteCalls_0.whitelistActions([
      ['setCoolingFanThreshold', 1]
    ])
  }

  getThingType () {
    return super.getThingType() + '-mbt'
  }

  getThingTags () {
    return ['microbt']
  }

  getSpecTags () {
    return ['container']
  }

  async collectThingSnap (thg) {
    return thg.ctrl.getSnap()
  }

  selectThingInfo (thg) {
    return {
      address: thg.opts?.address,
      port: thg.opts?.port
    }
  }

  async _connectThing (thg, type) {
    if (!thg.opts.address || !thg.opts.port || !thg.opts.username || !thg.opts.password) {
      return 0
    }

    const container = new Container({
      ...thg.opts,
      getClient: this.modbus_0.getClient.bind(this.modbus_0),
      type,
      conf: this.conf.thing.container || {}
    })

    container.init()

    container.on('error', e => {
      this.debugThingError(thg, e)
    })

    thg.ctrl = container

    return 1
  }
}

module.exports = MicroBTManager
