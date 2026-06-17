'use strict'

const MinerManager = require('../../base/lib/miner.manager.js')
const Whatsminer = require('./whatsminer.js')
const TcpFacility = require('@tetherto/svc-facs-tcp')

const DEFAULT_PORT = 4028
const { DEFAULT_NOMINAL_EFFICIENCY_WTHS } = require('./utils/constants.js')

class WhatsminerManager extends MinerManager {
  async init () {
    // The transport facility must exist before super.init(), which calls
    // setupThings() to reconnect persisted things on restart — connectThing()
    // needs tcp_0.getRPC. Creating it afterwards loses every device on reload.
    this.tcp_0 = new TcpFacility(this, {}, {})
    await super.init()
    this._addWhitelistedActions([
      ['setPowerPct', 1]
    ])
  }

  getThingType () {
    return super.getThingType() + '-wm'
  }

  getThingTags () {
    return ['whatsminer']
  }

  getSpecTags () {
    return ['miner']
  }

  getMinerDefaultPort () {
    return super.getMinerDefaultPort() || DEFAULT_PORT
  }

  getNominalEficiencyWThs () {
    return super.getNominalEficiencyWThs(DEFAULT_NOMINAL_EFFICIENCY_WTHS)
  }

  async collectThingSnap (thg) {
    return thg.ctrl.getSnap()
  }

  async connectThing (thg) {
    if (!thg.opts.address || !thg.opts.port || !thg.opts.password) {
      return 0
    }

    const miner = new Whatsminer({
      ...thg.opts,
      socketer: {
        readStrategy: TcpFacility.TCP_READ_STRATEGY.ON_END,
        rpc: (opts) => {
          return this.tcp_0.getRPC(opts)
        }
      },
      conf: this.conf.thing.miner || {},
      id: thg.id,
      nominalEfficiencyWThs: this.getNominalEficiencyWThs(),
      type: thg.type
    })

    miner.on('error', e => {
      this.debugThingError(thg, e)
    })

    thg.ctrl = miner

    return 1
  }
}

module.exports = WhatsminerManager
