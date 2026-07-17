'use strict'

const debug = require('debug')('mdk:snaps')
const async = require('async')
const utilsStore = require('@tetherto/hp-svc-facs-store/utils')
const { promiseTimeout } = require('@bitfinex/lib-js-util-promise')

/**
 * Periodic snapshot collection. Owns the in-memory `last` map
 * ({ snap, alerts, err, ts } per device) that StatsService/AlertsService
 * aggregate over, and persists snaps to `thing-5m-<deviceId>` every
 * conf.storeSnapItvMs. The device round-trip is the injected
 * collectSnap(deviceId); a device in maintenance
 * (getDeviceMeta(id).info.container === 'maintenance') is not contacted.
 */
class SnapsService {
  constructor ({ listDeviceIds, getDeviceMeta, collectSnap, processAlerts, saveAlerts, logs, conf }) {
    if (typeof collectSnap !== 'function') throw new Error('ERR_SNAPS_COLLECT_SNAP_REQUIRED')
    if (!logs) throw new Error('ERR_SNAPS_LOGS_REQUIRED')
    this.listDeviceIds = listDeviceIds || (() => [])
    this.getDeviceMeta = getDeviceMeta || ((id) => ({ id }))
    this.collectSnap = collectSnap
    this.processAlerts = processAlerts || (() => null)
    this.saveAlerts = saveAlerts || (async () => {})
    this.logs = logs
    this.conf = conf || {}
    this._last = {}
    this._collecting = {}
    this._timer = null
  }

  getLast (deviceId) {
    return this._last[deviceId]
  }

  listLast () {
    return this.listDeviceIds().map((id) => ({
      ...(this.getDeviceMeta(id) || { id }),
      last: this._last[id] || {}
    }))
  }

  start () {
    if (this._timer) return
    this._timer = setInterval(() => {
      this.collectSnaps().catch((e) => debug('ERR_COLLECT_SNAPS %s', e.message))
    }, this.conf.collectSnapsItvMs || 60000)
    this._timer.unref()
  }

  stop () {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  }

  _getOfflineSnap () {
    return {
      success: false,
      stats: {
        status: 'offline'
      }
    }
  }

  async _storeThingSnap ({ deviceId, thingLastCollectionTs, err, snap }) {
    try {
      const log = await this.logs.getBeeTimeLog(`thing-5m-${deviceId}`, 0, true)
      const kts = utilsStore.convIntToBin(thingLastCollectionTs)

      await log.put(kts, Buffer.from(JSON.stringify({
        ts: thingLastCollectionTs,
        err: err ? err.message : null,
        snap
      })))

      await this.logs.releaseBeeTimeLog(log)
    } catch (e) {
      debug('ERR_SAVE_SNAP %s %s', deviceId, e.message)
    }
  }

  async _collectSnap (deviceId) {
    if (this._collecting[deviceId]?.isCollectingSnap) return

    this._collecting[deviceId] = {
      ...this._collecting[deviceId],
      isCollectingSnap: true
    }
    const thingLastCollectionTs = Date.now()

    if (!this._collecting[deviceId].tsThingCollectSnap) {
      this._collecting[deviceId].tsThingCollectSnap = 0
    }

    const storeSnapItvMs = this.conf.storeSnapItvMs ?? 300000
    const shouldStore =
      thingLastCollectionTs - this._collecting[deviceId].tsThingCollectSnap >= storeSnapItvMs

    const meta = this.getDeviceMeta(deviceId) || { id: deviceId }

    await new Promise((resolve, reject) => {
      async.retry(
        this.conf.collectSnapRetry || 3,
        async () => {
          let snap = null
          let err = null

          if (meta.info?.container === 'maintenance') {
            snap = this._getOfflineSnap()
          } else {
            try {
              snap = await promiseTimeout(
                this.collectSnap(deviceId),
                this.conf.collectSnapTimeoutMs || 120000
              )
            } catch (e) {
              if (e.message === 'ERR_PROMISE_TIMEOUT') {
                snap = this._getOfflineSnap()
              } else {
                err = e
                debug('ERR_COLLECT %s %s', deviceId, e.message)
              }
            }
          }

          const last = this._last[deviceId] || {}
          last.snap = snap

          if (snap) {
            last.alerts = this.processAlerts({ ...meta, last })
          }

          last.err = err ? err.message : null
          last.ts = thingLastCollectionTs
          this._last[deviceId] = last

          if (shouldStore) {
            await this._storeThingSnap({ deviceId, err, snap, thingLastCollectionTs })
          }
        },
        (retryErr) => {
          this._collecting[deviceId] = {
            isCollectingSnap: false,
            thingLastCollectionTs,
            tsThingCollectSnap: shouldStore
              ? thingLastCollectionTs
              : this._collecting[deviceId].tsThingCollectSnap
          }
          if (retryErr) return reject(retryErr)
          resolve()
        }
      )
    })
  }

  async collectSnaps () {
    await new Promise((resolve, reject) => {
      async.eachLimit(
        this.listDeviceIds(),
        this.conf.thingQueryConcurrency || 25,
        async (deviceId) => {
          await this._collectSnap(deviceId)
        },
        (err) => {
          if (err) return reject(err)
          resolve()
        }
      )
    })

    try {
      await this.saveAlerts()
    } catch (err) {
      debug('ERR_SAVE_ALERTS %s', err.message)
    }
  }
}

module.exports = SnapsService
