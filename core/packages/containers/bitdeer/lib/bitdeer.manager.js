'use strict'

const ContainerManager = require('../../../tpls/tpl-lib-container/lib/container.manager')
const Bitdeer = require('./bitdeer')
const MQTTFacility = require('svc-facs-mqtt')
const { DEFAULT_MQTT_PORT } = require('./utils/constants')

class BitdeerManager extends ContainerManager {
  async init () {
    await super.init()

    this.mqtt_m0 = new MQTTFacility(this,
      { port: this.ctx.mqttPort || DEFAULT_MQTT_PORT },
      { ns: 'm0' })
    await this.mqtt_m0.startServer()

    this.mdkThgWriteCalls_0.whitelistActions([
      ['setTankEnabled', 1],
      ['setAirExhaustEnabled', 1],
      ['resetAlarm', 1],
      ['setTemperatureSettings', 2]
    ])
  }

  getThingType () {
    return super.getThingType() + '-bd'
  }

  selectThingInfo (thg) {
    return {
      containerId: thg.opts?.containerId
    }
  }

  getThingTags () {
    return ['bitdeer']
  }

  getSpecTags () {
    return ['container']
  }

  async collectThingSnap (thg) {
    return thg.ctrl.getSnap()
  }

  _validateRegisterThing (data) {
    super._validateRegisterThing(data)
    if (!data.opts) {
      throw new Error('ERR_THING_VALIDATE_OPTS_INVALID')
    }
  }

  async _connectThing (thg, model) {
    if (!thg.opts.containerId || !this.mqtt_m0.aedes) {
      return 0
    }

    const container = new Bitdeer({
      ...thg.opts,
      type: model,
      server: this.mqtt_m0.aedes,
      conf: this.conf.thing.container || {}
    })

    container.on('error', e => {
      this.debugThingError(thg, e)
    })

    thg.ctrl = container

    return 1
  }
}

module.exports = BitdeerManager
