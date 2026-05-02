'use strict'

const async = require('async')
const { promiseTimeout } = require('@bitfinex/lib-js-util-promise')
const utilsStore = require('@tetherto/hp-svc-facs-store/utils')

class SnapsService {
  constructor ({
    getThings,
    getCollectingThingSnap,
    getBeeTimeLog,
    releaseBeeTimeLog,
    collectThingSnap,
    processThingAlerts,
    connectThing,
    saveAlerts,
    collectSnapsHook0,
    thingConf,
    debugError,
    debugThingError
  }) {
    this.getThings = getThings
    this.getCollectingThingSnap = getCollectingThingSnap
    this.getBeeTimeLog = getBeeTimeLog
    this.releaseBeeTimeLog = releaseBeeTimeLog
    this.collectThingSnap = collectThingSnap
    this.processThingAlerts = processThingAlerts
    this.connectThing = connectThing
    this.saveAlerts = saveAlerts
    this.collectSnapsHook0 = collectSnapsHook0
    this.thingConf = thingConf
    this.debugError = debugError
    this.debugThingError = debugThingError
  }

  _getOfflineSnap () {
    return {
      success: false,
      stats: {
        status: 'offline'
      }
    }
  }

  async _storeThingSnap ({ thg, thingLastCollectionTs, err, snap }) {
    try {
      const log = await this.getBeeTimeLog(`thing-5m-${thg.id}`, 0, true)
      const kts = utilsStore.convIntToBin(thingLastCollectionTs)

      await log.put(kts, Buffer.from(JSON.stringify({
        ts: thingLastCollectionTs,
        err: err ? err.message : null,
        snap
      })))

      await this.releaseBeeTimeLog(log)
    } catch (e) {
      this.debugError('ERR_SAVE_SNAP', e)
    }
  }

  async _collectSnap (thg) {
    const collectingThingSnap = this.getCollectingThingSnap()
    const thingConf = this.thingConf

    if (collectingThingSnap[thg.id]?.isCollectingSnap) return

    collectingThingSnap[thg.id] = {
      isCollectingSnap: true
    }
    const thingLastCollectionTs = Date.now()

    if (!collectingThingSnap[thg.id].tsThingCollectSnap) {
      collectingThingSnap[thg.id].tsThingCollectSnap = 0
    }

    const shouldStore =
      thingLastCollectionTs -
        collectingThingSnap[thg.id].tsThingCollectSnap >
      thingConf.storeSnapItvMs

    await new Promise((resolve, reject) => {
      async.retry(
        thingConf.collectSnapRetry || 3,
        async () => {
          let snap = null
          let err = null

          if (!thg.ctrl) {
            try {
              await this.connectThing(thg)
            } catch (e) {
              this.debugError('ERR_CONNECT_THING', e)
            }
          }

          if (thg.info?.container === 'maintenance') {
            snap = this._getOfflineSnap()
          } else if (thg.ctrl) {
            try {
              snap = await promiseTimeout(
                this.collectThingSnap(thg),
                thingConf.collectSnapTimeoutMs
              )
            } catch (e) {
              if (e.message === 'ERR_PROMISE_TIMEOUT') {
                snap = this._getOfflineSnap()
              } else {
                err = e
                this.debugThingError(thg, e)
              }
            }
          } else {
            err = new Error('ERR_THING_CONNECTION_FAILURE')
          }

          thg.last.snap = snap

          if (thg.last?.snap) {
            thg.last.alerts = this.processThingAlerts(thg)
          }

          thg.last.err = err ? err.message : null
          thg.last.ts = thingLastCollectionTs

          if (shouldStore) {
            await this._storeThingSnap({ err, snap, thg, thingLastCollectionTs })
          }
        },
        (retryErr) => {
          collectingThingSnap[thg.id] = {
            isCollectingSnap: false,
            thingLastCollectionTs,
            ...(shouldStore ? { tsThingCollectSnap: thingLastCollectionTs } : {})
          }
          if (retryErr) return reject(retryErr)
          resolve()
        }
      )
    })
  }

  async collectSnaps () {
    const thingConf = this.thingConf
    const things = this.getThings()
    const concurrency = thingConf.thingQueryConcurrency

    await new Promise((resolve, reject) => {
      async.eachLimit(
        things,
        concurrency,
        async (thg) => {
          await this._collectSnap(thg)
        },
        (err) => {
          if (err) return reject(err)
          resolve()
        }
      )
    })

    await this.collectSnapsHook0()

    try {
      await this.saveAlerts()
    } catch (err) {
      this.debugError('ERR_SAVE_ALERTS', err)
    }
  }
}

module.exports = SnapsService
