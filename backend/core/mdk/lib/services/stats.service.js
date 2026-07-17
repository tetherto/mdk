'use strict'

const debug = require('debug')('mdk:stats')
const async = require('async')
const utilsStore = require('@tetherto/hp-svc-facs-store/utils')
const gLibStats = require('../../../lib-stats')

const STAT_RTD = 'stat-rtd'

/**
 * Aggregation over per-device `last` snapshots. `lib` is the stats spec
 * module ({ specs, conf }) passed in directly. Device state comes from
 * injected accessors:
 *   listDeviceIds()        → [deviceId]
 *   getDeviceMeta(id)      → { id, tags, info, opts, type }
 *   getLast(id)            → { snap, alerts, err, ts } | undefined
 *   getRealtimeData(id)    → latest snap without a device round-trip
 */
class StatsService {
  constructor ({ lib, specTags, baseType, listDeviceIds, getDeviceMeta, getLast, getRealtimeData, processAlerts, logs, conf }) {
    if (!logs) throw new Error('ERR_STATS_LOGS_REQUIRED')
    this.lib = lib || null
    this.specTags = specTags || []
    this.baseType = baseType || 'thing'
    this.listDeviceIds = listDeviceIds || (() => [])
    this.getDeviceMeta = getDeviceMeta || (() => null)
    this.getLast = getLast || (() => undefined)
    this.getRealtimeData = getRealtimeData || null
    this.processAlerts = processAlerts || (() => null)
    this.logs = logs
    this.conf = conf || {}
    this._buildingStats = {}
    this._collectingRtd = false
  }

  async buildStats (sk, fireTime) {
    if (sk === STAT_RTD) {
      return await this.saveRealTimeData()
    }

    if (!this.lib) {
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
    if (!this.getRealtimeData) return
    this._collectingRtd = true

    const thgsRtd = {}

    try {
      await async.eachLimit(
        this.listDeviceIds(),
        this.conf.thingRtdConcurrency || 500,
        async (deviceId) => {
          const meta = this.getDeviceMeta(deviceId)
          if (!meta) return
          thgsRtd[deviceId] = { ...meta, last: this.getLast(deviceId) || {} }
          try {
            const rtd = await this.getRealtimeData(deviceId)
            if (!rtd) return

            const dev = { ...meta, last: this.getLast(deviceId) || {} }
            thgsRtd[deviceId] = {
              ...meta,
              last: { snap: rtd, alerts: this.processAlerts(dev) }
            }
          } catch (e) {
            debug('ERR_RTD %s %s', deviceId, e.message)
          }
        }
      )
    } finally {
      this._collectingRtd = false
    }

    if (!Object.keys(thgsRtd).length) return

    try {
      const aggrData = this.aggrStats(Object.keys(thgsRtd), {}, thgsRtd)
      const log = await this.logs.getBeeTimeLog(
        `${STAT_RTD}-t-${this.baseType}`,
        0,
        true
      )
      await log.put(STAT_RTD, Buffer.from(JSON.stringify(aggrData)))
      await this.logs.releaseBeeTimeLog(log)
    } catch (e) {
      debug('ERR_SAVING_RTD %s', e.message)
    }
  }

  aggrStats (thgIds, opts = {}, thgs = null) {
    const acc = {}
    if (!this.lib) return acc

    const specs = this.lib.specs
    const ids = thgIds || this.listDeviceIds()

    this.specTags.forEach(stype => {
      if (!specs[stype]) {
        return
      }

      const state = {}
      state.ops = specs[stype].ops

      for (const thgId of ids) {
        const thg = thgs ? thgs[thgId] : this._deviceEntry(thgId)
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

  _deviceEntry (deviceId) {
    const meta = this.getDeviceMeta(deviceId)
    if (!meta) return null
    return { ...meta, last: this.getLast(deviceId) || {} }
  }

  async buildStatsForKey (logKey, fireTime) {
    const now = Math.floor(fireTime.getTime() / 1000) * 1000

    const tagSpecs = {}
    const thgIdsAll = this.listDeviceIds()
    if (!this.lib) return

    const skipTagPfxs = this.lib.conf?.skipTagPrefixes || []

    thgIdsAll.forEach(thgId => {
      const meta = this.getDeviceMeta(thgId)
      if (!meta) return

      const tags = meta.tags || []
      tags.forEach(tag => {
        if (skipTagPfxs.find(p => tag.startsWith(p))) {
          return
        }

        if (!tagSpecs[tag]) {
          tagSpecs[tag] = { thgIds: [] }
        }

        tagSpecs[tag].thgIds.push(thgId)
      })
    })

    const tags = Object.keys(tagSpecs)

    for (const tag of tags) {
      const tagSpec = tagSpecs[tag]

      const acc = this.aggrStats(tagSpec.thgIds)
      const log = await this.logs.getBeeTimeLog(`${logKey}-${tag}`, 0, true)

      try {
        await log.put(
          utilsStore.convIntToBin(now),
          Buffer.from(JSON.stringify({
            ts: now,
            ...acc
          }))
        )
      } catch (e) {
        debug('ERR_BUILD_STATS %s %s', tag, e.message)
      }

      await this.logs.releaseBeeTimeLog(log)
    }
  }
}

module.exports = StatsService
module.exports.STAT_RTD = STAT_RTD
