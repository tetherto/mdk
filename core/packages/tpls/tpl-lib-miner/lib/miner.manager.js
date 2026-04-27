'use strict'

const ThingManager = require('../../../tpls/tpl-lib-thing/lib/thing.manager')
const { getRandomString } = require('./utils')
const gLibUtilBase = require('lib-js-util-base')
const {
  MAINTENANCE,
  MINER_TAG,
  STAT_30M,
  STAT_SHARES_1M,
  STAT_SHARES_30M,
  STAT_STARTUP_STATUS,
  STAT_5M
} = require('./utils/constants')
const utilsStore = require('hp-svc-facs-store/utils')
const { getArrayUniq } = require('lib-js-util-base')

class MinerManager extends ThingManager {
  async init () {
    await super.init()

    // buildStats to store real-time-data
    this.scheduleAddlStatTfs = [
      ['rtd', '*/30 * * * * *']
    ]

    this._addWhitelistedActions([
      ['reboot', 1], // [action, reqVotes]
      ['setPowerMode', 1],
      ['setLED', 1],
      ['setupPools', 1],
      ['registerThing', 1],
      ['updateThing', 1],
      ['forgetThings', 1]
    ])
  }

  _generateThingId () {
    return getRandomString(15)
  }

  getThingType () {
    return 'miner'
  }

  _getThingBaseType () {
    return 'miner'
  }

  _validateMinerDataChange (data) {
    // find thing with same serial-num or mac or pos
    for (const k in this.mem.things) {
      const t = this.mem.things[k]
      const isSameThing = t.id === data.id
      if (isSameThing) continue
      if (t.info?.serialNum && t.info.serialNum === data.info?.serialNum) {
        throw new Error('ERR_THING_SERIALNUM_EXISTS')
      }
      if (t.info?.macAddress && t.info.macAddress.toLowerCase() === data.info?.macAddress?.toLowerCase()) {
        throw new Error('ERR_THING_MACADDRESS_EXISTS')
      }
      if (t.info?.pos && t.info.pos === data.info?.pos && t.info?.container && t.info.container === data.info?.container) {
        throw new Error('ERR_THING_POS_EXISTS')
      }
      if (!this.conf.thing.allowDuplicateIPs && t.opts?.address && t.opts.address === data.opts?.address) {
        throw new Error('ERR_THING_IP_ADDRESS_EXISTS')
      }
    }
  }

  validateRegisterThing (data) {
    super.validateRegisterThing(data)
    if (!data.opts) {
      throw new Error('ERR_THING_VALIDATE_OPTS_INVALID')
    }
    this._validateMinerDataChange(data)
  }

  _validateUpdateThing (data) {
    if (data.info?.location && !this._isMinerOutsideContainerLocation(data) && !data.info?.container) {
      throw new Error('ERR_THING_VALIDATE_CONTAINER_INVALID')
    }
    this._validateMinerDataChange(data)
  }

  selectThingInfo (thg) {
    return {
      address: thg.opts?.address,
      port: thg.opts?.port
    }
  }

  async getThingConf (query) {
    if (query.requestType === 'poolConfig') return this.conf.thing.miner?.pools
    return super.getThingConf(query)
  }

  _getDefaultStaticMinerIp (thg) {
    // no ops
  }

  _setStaticIpThing (thg, forceSetIp) {
    if (forceSetIp) return 1
    if (!thg.info?.container || !thg.info?.pos) {
      throw new Error('ERR_THG_INFO_INVALID')
    }
    const newAddress = this._getDefaultStaticMinerIp(thg)
    if (thg.info.container !== MAINTENANCE && !newAddress) {
      throw new Error('ERR_THG_DEFAULT_STATIC_IP_INVALID')
    }
    thg.opts.address = newAddress
    return 1
  }

  _releaseStaticIpThing (thg) {
    thg.opts.address = ''
    return 1
  }

  async setIpThing (thg, forceSetIp = false) {
    try {
      if (this.conf.thing.isStaticIpAssignment) {
        this._setStaticIpThing(thg, forceSetIp)
        return
      }
      await this.minigosNet_n0.setIpThing(thg, forceSetIp)
    } catch (e) {
      this.debugThingError(thg, e)
      throw e
    }
  }

  async releaseIpThing (thg) {
    if (this.conf.thing.isStaticIpAssignment) {
      this._releaseStaticIpThing(thg)
      return
    }
    try {
      await this.minigosNet_n0.releaseIpThing(thg)
    } catch (e) {
      this.debugThingError(thg, e)
      if (gLibUtilBase.getErrorMessage(e) !== 'ERR_IP_NOT_FOUND') {
        throw e
      }
    }
  }

  async setIpThingLocApply (thg) {
    await this.setIpThing(thg, true)
    await this.saveThingData(thg)
    await this.reconnectThing(thg)
  }

  getMinerDefaultPort () {
    return this.conf?.thing?.minerDefaultPort
  }

  getNominalEficiencyWThs (defaultNominalEffWThs = {}) {
    const type = this.getThingType()
    return this.conf.thing.miner.nominalEfficiencyWThs?.[type] || defaultNominalEffWThs[type]
  }

  _setUpPortBasedOnMinerType (thg) {
    if (!thg.opts.port && thg.info.container && thg.info.container !== MAINTENANCE) {
      thg.opts.port = this.getMinerDefaultPort()
    }
  }

  _isMinerOutsideContainerLocation (thg) {
    if (thg.info.location && typeof thg.info.location === 'string') {
      const [, siteLocation] = thg.info.location.split('.')
      if (siteLocation !== 'container') return true
    }
    return false
  }

  async registerThingHook0 (thg) {
    if (this._isMinerOutsideContainerLocation(thg)) return
    this._setUpPortBasedOnMinerType(thg)

    if (!thg.opts.address && thg.info.container !== MAINTENANCE) {
      await this.setIpThing(thg, !!thg.opts.forceSetIp)
    }
  }

  async updateThingHook0 (thg, thgPrev) {
    super.updateThingHook0(thg, thgPrev)
    this._setUpPortBasedOnMinerType(thg)

    const isNewPos = thgPrev.info.pos !== thg.info.pos
    const isNewContainer = thgPrev.info.container !== thg.info.container
    const isMinerPosChanged = isNewPos || isNewContainer
    // release current ip, if isStaticIpAssignment and minerPosChanged and not forceSetIp or container changed
    if (
      (this.conf.thing.isStaticIpAssignment && isMinerPosChanged && !thg.opts.forceSetIp) ||
      (isNewContainer && thgPrev.opts.address)
    ) {
      await this.releaseIpThing(thgPrev)
      thg.opts.address = null
    }

    // set ip if thing not in maintenance
    if (!thg.opts.address && thg.info.container !== MAINTENANCE && !this._isMinerOutsideContainerLocation(thg)) {
      await this.setIpThing(thg, !!thg.opts.forceSetIp)
    } else if (thg.info.container === MAINTENANCE || this._isMinerOutsideContainerLocation(thg)) {
      thg.info.subnet = null
    }
  }

  async forgetThingHook0 (thg) {
    if (thg.opts.address) {
      await this.releaseIpThing(thg)
    }
  }

  async disconnectThing (thg) {
    await this.minigosNet_n0.disconnectThing(thg)
  }

  async collectSnapsHook0 () {
    try {
      // store shares data after snaps collection
      await this.saveSharesData()
    } catch (e) {
      this.debugError('ERR_SHARES_SAVE', e)
    }
  }

  async saveSharesData () {
    // group shares by container
    const containerShares = Object.values(this.mem.things).reduce((shares, thg) => {
      if (!shares[thg.info.container]) {
        shares[thg.info.container] = { accepted: 0, rejected: 0, stale: 0 }
      }

      const thgShares = thg.last?.snap?.stats?.all_pools_shares
      if (!thgShares) return shares

      shares[thg.info.container].accepted += thgShares.accepted
      shares[thg.info.container].rejected += thgShares.rejected
      shares[thg.info.container].stale += thgShares.stale
      return shares
    }, {})

    // snap stores newly added shares, save total in new log for each container
    const ts = Date.now()
    for (const container in containerShares) {
      try {
        const shares = containerShares[container]
        const key = `${STAT_SHARES_1M}-container-${container}`
        await this.logs.saveLogData(key, ts, {
          ts,
          pools_accepted_shares_total: shares.accepted,
          pools_rejected_shares_total: shares.rejected,
          pools_stale_shares_total: shares.stale
        }, 0, true)
      } catch (e) {
        this.debugError(`ERR_STAT_1M_SHARES_SAVE ${container}`, e)
      }
    }
  }

  async _saveMiningStartupStatus (fireTime) {
    try {
      const rtdActiveMinersLog = await this.tailLog({
        key: 'stat-rtd',
        type: 'miner',
        tag: MINER_TAG,
        limit: 1,
        start: Date.now() - 600000
      })
      const rtdLog = rtdActiveMinersLog?.[0]
      const totalMiners =
        rtdLog?.offline_or_sleeping_miners_cnt +
        rtdLog?.error_miners_cnt +
        rtdLog?.online_or_minor_error_miners_cnt
      const onlinePct =
        rtdLog?.online_or_minor_error_miners_cnt / totalMiners
      const startupStatus = onlinePct > 0.5 ? 1 : 0
      const ts = Math.floor(fireTime.getTime() / 1000) * 1000
      await this.saveStats(
        `${STAT_STARTUP_STATUS}-${MINER_TAG}`,
        ts,
        { ts, startupStatus }
      )
      return 1
    } catch (error) {
      this.debugError('ERR_BUILD_STATS_STATUP_STATUS_FAILED', error)
      return 0
    }
  }

  async saveStats (logKey, dataKey, data) {
    const log = await this.getBeeTimeLog(logKey, 0, true)
    if (!log) return

    await log.put(
      utilsStore.convIntToBin(dataKey),
      Buffer.from(JSON.stringify(data))
    )
    await this.releaseBeeTimeLog(log)
  }

  async buildStats (sk, fireTime) {
    // using stats scheduler feature to save aggregated shares every 30m
    if (sk === STAT_30M) {
      await this.saveAggrShares(fireTime)
    }

    if (sk === STAT_5M) {
      await this._saveMiningStartupStatus(fireTime)
    }

    super.buildStats(sk, fireTime)
  }

  async saveAggrShares (time) {
    const end = Math.floor(time.getTime() / 1000) * 1000
    const start = end - 30 * 60 * 1000 // 30 min

    // aggregate shares for all containers
    const containers = Object.values(this.mem.things).map(t => t.info.container)
    for (const container of getArrayUniq(containers)) {
      try {
        // get last 30 min shares
        const logs = await this.tailLog({
          key: STAT_SHARES_1M,
          tag: `container-${container}`,
          start,
          end
        })

        // caculate total shares
        const totalShares = logs.reduce((shares, log) => {
          shares.pools_accepted_shares_total += log.pools_accepted_shares_total || 0
          shares.pools_rejected_shares_total += log.pools_rejected_shares_total || 0
          shares.pools_stale_shares_total += log.pools_stale_shares_total || 0
          return shares
        }, { ts: end, pools_accepted_shares_total: 0, pools_rejected_shares_total: 0, pools_stale_shares_total: 0 })

        // save total shares
        const key = `${STAT_SHARES_30M}-container-${container}`
        await this.logs.saveLogData(key, end, { ...totalShares }, 0, true)
      } catch (e) {
        this.debugError(`ERR_STAT_30M_SHARES_SAVE ${container}`, e)
      }
    }
  }
}

module.exports = MinerManager
