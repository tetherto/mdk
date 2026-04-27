'use strict'

const PowerMeter = require('../../../tpls/tpl-lib-powermeter/lib/powermeter')
const { PROTOCOL } = require('svc-facs-modbus/lib/constants')

class ABBPowerMeter extends PowerMeter {
  constructor ({ getClient = null, ...opts }) {
    super(opts)
    if (!getClient) throw new Error('ERR_NO_CLIENT')

    this.client = getClient({ address: this.opts.address, port: this.opts.port, unitId: this.opts.unitId, protocol: PROTOCOL.TCP, timeout: this.opts.timeout })
  }

  close () {
    this.client.end()
  }

  async _readValues () {
    // no-op
  }

  async readValues () {
    try {
      const data = await this._readValues()
      this.cache = data
      this.cacheTime = 0
      return data
    } catch (e) {
      if (this.cacheTime >= this.conf.cacheLimit) {
        throw e
      }

      this.cacheTime++
      return this.cache
    }
  }
}

module.exports = ABBPowerMeter
