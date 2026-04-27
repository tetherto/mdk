'use strict'

const Thing = require('../../../tpls/tpl-lib-thing/lib/thing')
const { sumPoolsShares } = require('./utils')

class Miner extends Thing {
  constructor (opts = {}) {
    super('miner', opts)

    this.deviceDataCache = {}
    this.cachedShares = { accepted: 0, rejected: 0, stale: 0 }
  }

  // Miner data fetching methods
  async getPools () {
    throw new Error('Not implemented')
  }

  // Miner write action validator
  validateWriteAction (...params) {
    const [action, ...args] = params

    if (action === 'setLED') {
      const [enabled] = args
      if (typeof enabled !== 'boolean') {
        throw new Error('ERR_SET_LED_ENABLED_INVALID')
      }
    }

    return 1
  }

  checkSamePools (newPools, oldPools) {
    if (newPools.length !== oldPools.length) {
      return false
    }

    for (const pool of newPools) {
      const oldPool = oldPools.find(p => p.url === pool.url)

      if (oldPool === undefined) {
        return false
      }

      if (pool.worker_name !== oldPool.username) {
        return false
      }
    }

    return true
  }

  // Miner control methods
  preProcessPoolData (pools, appendId = true) {
    if (!Array.isArray(pools)) throw new Error('ERR_INVALID_ARG_TYPE')

    if (appendId) {
      pools = pools.map((pool) => ({
        ...pool,
        worker_name: `${pool.worker_name}.${this.opts.id}`
      }))
    }

    if (pools.length < 3) {
      for (let i = pools.length; i < 3; i++) {
        pools.push({
          url: '',
          worker_name: '',
          worker_password: ''
        })
      }
    }

    return pools
  }

  _prepPools (pools, appendId, oldPools) {
    pools = this.preProcessPoolData(pools, appendId)

    if (oldPools) {
      if (this.checkSamePools(pools, oldPools)) {
        return false
      }
    }

    return pools
  }

  async setupPools () {
    try {
      await this.setPools(this.conf.pools, true)
      return { success: true }
    } catch (e) {
      return { success: false, error_msg: e.message }
    }
  }

  async powerOn () {
    throw new Error('Not implemented')
  }

  async powerOff () {
    throw new Error('Not implemented')
  }

  async reboot () {
    throw new Error('Not implemented')
  }

  async setPools (pools) {
    throw new Error('Not implemented')
  }

  async setFanSpeed (speed) {
    throw new Error('Not implemented')
  }

  async setPowerMode (mode) {
    throw new Error('Not implemented')
  }

  async updateFirmware (firmwareFile) {
    throw new Error('Not implemented')
  }

  async fetchDeviceData (fn, cacheTime = 5000) {
    const lastFetched = this.deviceDataCache[fn.name]?.lastFetch
    if (!lastFetched || lastFetched < (Date.now() - cacheTime)) {
      const data = await fn.call(this)
      this.deviceDataCache[fn.name] = { data, lastFetch: Date.now() }
    }

    return this.deviceDataCache[fn.name].data
  }

  _getStatus (errors, stats) {
    // no-op
  }

  _isSuspended (stats) {
    // no-op
  }

  _calcPowerW (stats) {
    // no-op
  }

  _calcAvgTemp (stats) {
    // no-op
  }

  _getPowerMode (stats) {
    // no-op
  }

  _calcEfficiency (stats, summary) {
    // no-op
  }

  _calcHashrates (stats) {
    // no-op
  }

  _calcNewShares (pools) {
    // sometimes randomly device returns empty or no pools, skip such cases
    if (!Array.isArray(pools) || !pools.length) {
      return { accepted: 0, rejected: 0, stale: 0 }
    }

    const currentShares = {
      accepted: sumPoolsShares(pools, 'accepted'),
      rejected: sumPoolsShares(pools, 'rejected'),
      stale: sumPoolsShares(pools, 'stale')
    }

    // calculate newly added shares since the last snap
    const newShares = {
      accepted: currentShares.accepted >= this.cachedShares.accepted ? currentShares.accepted - this.cachedShares.accepted : currentShares.accepted,
      rejected: currentShares.rejected >= this.cachedShares.rejected ? currentShares.rejected - this.cachedShares.rejected : currentShares.rejected,
      stale: currentShares.stale >= this.cachedShares.stale ? currentShares.stale - this.cachedShares.stale : currentShares.stale
    }

    // cache current shares
    this.cachedShares = { ...currentShares }

    return newShares
  }
}

module.exports = Miner
