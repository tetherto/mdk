'use strict'

const SensorManger = require('../../../tpls/tpl-lib-sensor/lib/sensor.manager')
const SenecaSensor = require('./seneca.sensor')
const ModbusFacility = require('svc-facs-modbus')

class SenecaSensorManger extends SensorManger {
  async init () {
    await super.init()
    this.modbus_0 = new ModbusFacility(this, {}, {})
  }

  getThingType () {
    return super.getThingType() + '-temp-seneca'
  }

  getThingTags () {
    return ['temp', 'seneca']
  }

  getSpecTags () {
    return ['sensor']
  }

  async collectThingSnap (thg) {
    return thg.ctrl.getSnap()
  }

  selectThingInfo (thg) {
    return {
      address: thg.opts?.address,
      port: thg.opts?.port,
      unitId: thg.opts?.unitId
    }
  }

  async connectThing (thg) {
    if (!thg.opts.address || !thg.opts.port || thg.opts.unitId === undefined || thg.opts.register === undefined) {
      return 0
    }

    const sensor = new SenecaSensor({
      ...thg.opts,
      getClient: this.modbus_0.getClient.bind(this.modbus_0),
      conf: this.conf.thing.sensor || {}
    })

    sensor.on('error', async e => {
      this.debugThingError(thg, e)
      await this.disconnectThing(thg)
    })

    thg.ctrl = sensor

    return 1
  }
}

module.exports = SenecaSensorManger
