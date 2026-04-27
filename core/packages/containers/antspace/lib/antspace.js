'use strict'

const Container = require('../../../tpls/tpl-lib-container/lib/container')

class Antspace extends Container {
  constructor ({ client, ...opts }) {
    super(opts)
    this.fetch = client
  }

  async switchCoolingSystem (enabled) {
    const json = await this.fetch.get(`http://${this.opts.address}:${this.opts.port}/cooler`, { qs: { operation: enabled ? 'open' : 'close' }, encoding: 'json' })
    this.updateLastSeen()

    return {
      success: json.body.ok
    }
  }

  async resetCoolingSystem () {
    const json = await this.fetch.get(`http://${this.opts.address}:${this.opts.port}/cooler`, { qs: { operation: 'reset' }, encoding: 'json' })
    this.updateLastSeen()

    return {
      success: json.body.ok
    }
  }

  async setLiquidSupplyTemperature (temperature) {
    const json = await this.fetch.get(`http://${this.opts.address}:${this.opts.port}/cooler`, { qs: { operation: 'setTemp', temp: temperature }, encoding: 'json' })
    this.updateLastSeen()

    return {
      success: json.body.ok
    }
  }

  async getSystemData () {
    const json = await this.fetch.request(`http://${this.opts.address}:${this.opts.port}/cooler`, { qs: { operation: 'coolerState' }, encoding: 'json' })
    this.updateLastSeen()

    return {
      success: json.body.ok,
      data: json.body.params
    }
  }

  async getMinerInfo () {
    const json = await this.fetch.request(`http://${this.opts.address}:${this.opts.port}/cooler`, { qs: { operation: 'minerInfo' }, encoding: 'json' })
    this.updateLastSeen()

    return {
      success: json.body.ok,
      data: json.body.params
    }
  }
}

module.exports = Antspace
