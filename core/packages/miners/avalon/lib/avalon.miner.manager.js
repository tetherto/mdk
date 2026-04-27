'use strict'

const TcpFacility = require('svc-facs-tcp')
const MinerManager = require('../../../tpls/tpl-lib-miner/lib/miner.manager.js')
const AvalonMiner = require('./avalon.miner.js')

const DEFAULT_PORT = 4028
const { DEFAULT_NOMINAL_EFFICIENCY_WTHS } = require('./utils/constants')

class AvalonMinerManager extends MinerManager {
  async init () {
    await super.init()
    this.tcp_0 = new TcpFacility(this, {}, {})
  }

  getThingType () {
    return super.getThingType() + '-av'
  }

  getThingTags () {
    return ['avalon']
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

    const miner = new AvalonMiner({
      ...thg.opts,
      socketer: {
        readStrategy: TcpFacility.TCP_READ_STRATEGY.ON_END,
        rpc: (opts) => {
          return this.tcp_0.getRPC(opts)
        }
      },
      conf: this.conf.thing.miner || {},
      id: thg.id,
      nominalEfficiencyWThs: this.getNominalEficiencyWThs()
    })

    miner.on('error', (e) => {
      this.debugDeviceError(thg, e)
    })

    thg.ctrl = miner

    return 1
  }
}

module.exports = AvalonMinerManager
