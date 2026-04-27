'use strict'

const MinerManager = require('../../../tpls/tpl-lib-miner/lib/miner.manager.js')
const Antminer = require('./antminer.js')

const DEFAULT_PORT = 80
const { DEFAULT_NOMINAL_EFFICIENCY_WTHS } = require('./utils/constants.js')

class AntminerManager extends MinerManager {
  getThingType () {
    return super.getThingType() + '-am'
  }

  getThingTags () {
    return ['antminer']
  }

  getSpecTags () {
    return ['miner']
  }

  getMinerDefaultPort () {
    return this.conf?.thing?.minerDefaultPort || DEFAULT_PORT
  }

  getNominalEficiencyWThs () {
    return super.getNominalEficiencyWThs(DEFAULT_NOMINAL_EFFICIENCY_WTHS)
  }

  async collectThingSnap (thg) {
    return thg.ctrl.getSnap()
  }

  async _connectThing (thg, type) {
    if (!thg.opts.address || !thg.opts.port || !thg.opts.username || !thg.opts.password) {
      return 0
    }

    const miner = new Antminer({
      ...thg.opts,
      conf: this.conf.thing.miner || {},
      id: thg.id,
      type,
      nominalEfficiencyWThs: this.getNominalEficiencyWThs()
    })

    await miner._setupClient()

    miner.on('error', e => {
      this.debugThingError(thg, e)
    })

    thg.ctrl = miner

    return 1
  }
}

module.exports = AntminerManager
