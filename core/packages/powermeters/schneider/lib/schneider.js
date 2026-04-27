'use strict'

const PowerMeter = require('../../../tpls/tpl-lib-powermeter/lib/powermeter')
const { PROTOCOL } = require('svc-facs-modbus/lib/constants')

class SchneiderPowerMeter extends PowerMeter {
  constructor ({ getClient = null, ...opts }) {
    super(opts)
    if (!getClient) throw new Error('ERR_NO_CLIENT')
    this.client = getClient({
      address: this.opts.address,
      port: this.opts.port,
      unitId: this.opts.unitId,
      protocol: PROTOCOL.TCP,
      timeout: this.opts.timeout
    })
  }

  close () {
    this.client.end()
  }

  async _readValues () {
    throw new Error('ERR_READ_VALUES_NO_IMPL')
  }

  async _prepSnap (readFromCache = false) {
    const snap = readFromCache ? this.cache : await this._readValues()

    return {
      success: true,
      ...snap
    }
  }
}

module.exports = SchneiderPowerMeter
