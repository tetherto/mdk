'use strict'

const Sensor = require('../../../tpls/tpl-lib-sensor/lib/sensor')
const { FUNCTION_CODES, PROTOCOL } = require('svc-facs-modbus/lib/constants')
const { promiseTimeout } = require('@bitfinex/lib-js-util-promise')

class SenecaSensor extends Sensor {
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

  _prepErrors (data) {
    const errors = []

    if (data === 850.0) {
      errors.push({
        name: 'sensor_error'
      })
    }

    this._handleErrorUpdates(errors)

    return {
      isErrored: this._errorLog.length > 0,
      errors: this._errorLog
    }
  }

  async _prepSnap (readFromCache = false) {
    const data = readFromCache ? this.cache : await this._getTempValue()

    const { isErrored, errors } = this._prepErrors(data)

    return {
      stats: {
        status: isErrored ? 'error' : 'ok',
        errors: isErrored ? errors : undefined,
        temp_c: data
      },
      config: {}
    }
  }

  async _getTempValue () {
    const value = await promiseTimeout(this.client.read(FUNCTION_CODES.READ_HOLDING_REGISTERS, this.opts.register), this.opts.timeout)
    this.updateLastSeen()
    if (!value) throw new Error('ERR_NO_VALUE')
    this.cache = value.readUInt16BE(0) / 10
    return this.cache
  }
}

module.exports = SenecaSensor
