'use strict'

const async = require('async')
const { STAT_RTD } = require('../utils/constants')
const utilsStore = require('hp-svc-facs-store/utils')
const gLibStats = require('miningos-lib-stats')

class StatsService {
  constructor ({
    getThings,
    loadLib,
    getSpecTags,
    getBeeTimeLog,
    releaseBeeTimeLog,
    processThingAlerts,
    getThingBaseType,
    conf,
    debugError,
    debugThingError
  }) {
    this.getThings = getThings
    this.loadLib = loadLib
    this.getSpecTags = getSpecTags
    this.getBeeTimeLog = getBeeTimeLog
    this.releaseBeeTimeLog = releaseBeeTimeLog
    this.processThingAlerts = processThingAlerts
    this.getThingBaseType = getThingBaseType
    this.conf = conf
    this.debugError = debugError
    this.debugThingError = debugThingError
    this._buildingStats = {}
    this._collectingRtd = false
  }

  async buildStats (sk, fireTime) {
    if (sk === STAT_RTD) {
      return await this.saveRealTimeData()
    }

    const lLibStats = this.loadLib('stats')

    if (!lLibStats) {
      return
    }

    const lkr = `_buildingStats_${sk}`

    if (this._buildingStats[lkr]) {
      return
    }

    this._buildingStats[lkr] = true

    try {
      await this.buildStatsForKey(sk, fireTime)
    } finally {
      this._buildingStats[lkr] = false
    }
  }

  async saveRealTimeData () {
    if (this._collectingRtd) return
    this._collectingRtd = true

    const things = this.getThings()
    const thgsRtd = {}
    const thingConf = this.conf.thing

    async.eachLimit(
      things,
      thingConf.thingRtdConcurrency || 500,
      async (thg) => {
        thgsRtd[thg.id] = thg
        if (!thg.ctrl) return
        try {
          const rtd = await thg.ctrl.getRealtimeData()
          if (!rtd) return

          thgsRtd[thg.id] = {
            ...thg,
            last: { snap: rtd, alerts: this.processThingAlerts(thg) }
          }
        } catch (e) {
          this.debugThingError(thg, e)
        }
      },
      async () => {
        this._collectingRtd = false
        if (!Object.keys(thgsRtd).length) return

        try {
          const aggrData = this.aggrStats(Object.keys(thgsRtd), {}, thgsRtd)
          const log = await this.getBeeTimeLog(
            `${STAT_RTD}-t-${this.getThingBaseType()}`,
            0,
            true
          )
          await log.put(STAT_RTD, Buffer.from(JSON.stringify(aggrData)))
          await this.releaseBeeTimeLog(log)
        } catch (e) {
          this.debugError('ERR_SAVING_RTD', e)
        }
      }
    )
  }

  aggrStats (thgIds, opts = {}, thgs = null) {
    const acc = {}
    const lLibStats = this.loadLib('stats')
    if (!lLibStats) return acc

    const specs = lLibStats.specs
    const things = thgs ?? this.getThings()

    this.getSpecTags().forEach(stype => {
      if (!specs[stype]) {
        return
      }

      const state = {}
      state.ops = specs[stype].ops

      for (const thgId of thgIds) {
        const thg = things[thgId]
        if (!thg) continue
        const last = thg.last || {}
        const info = thg.info || {}
        gLibStats.applyStats(
          state,
          acc,
          { last, info },
          { id: thg.id, tags: thg.tags, info, opts: thg.opts, type: thg.type }
        )
      }

      gLibStats.tallyStats(state, acc)
    })

    return acc
  }

  async buildStatsForKey (logKey, fireTime) {
    const now = Math.floor(fireTime.getTime() / 1000) * 1000

    const tagSpecs = {}
    const things = this.getThings()
    const thgIdsAll = Object.keys(things)
    const lLibStats = this.loadLib('stats')
    if (!lLibStats) return

    const skipTagPfxs = lLibStats.conf.skipTagPrefixes || []

    thgIdsAll.forEach(thgId => {
      const thg = things[thgId]

      thg.tags.forEach(tag => {
        if (skipTagPfxs.find(p => tag.startsWith(p))) {
          return
        }

        if (!tagSpecs[tag]) {
          tagSpecs[tag] = { thgIds: [] }
        }

        const tagSpec = tagSpecs[tag]
        tagSpec.thgIds.push(thgId)
      })
    })

    const tags = Object.keys(tagSpecs)

    for (const tag of tags) {
      const tagSpec = tagSpecs[tag]

      const acc = this.aggrStats(tagSpec.thgIds)
      const log = await this.getBeeTimeLog(`${logKey}-${tag}`, 0, true)

      try {
        await log.put(
          utilsStore.convIntToBin(now),
          Buffer.from(JSON.stringify({
            ts: now,
            ...acc
          }))
        )
      } catch (e) {
        this.debugError(null, e)
      }

      await this.releaseBeeTimeLog(log)
    }
  }
}

module.exports = StatsService
