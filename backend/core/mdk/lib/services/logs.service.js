'use strict'

const debug = require('debug')('mdk:logs')
const utilsStore = require('@tetherto/hp-svc-facs-store/utils')
const { getLogMaxHeight } = require('../utils')

function getLogName (n) {
  return n + '-5'
}

/**
 * Bee-backed time logs. One meta entry per log key tracks the current
 * rotation point (`cur`); the physical bee for (key, point) is
 * `<key>-5-<point>`. All values are JSON, keys are binary-encoded ints (ts).
 */
class LogsService {
  constructor ({ store, metaLogs, conf }) {
    if (!store) throw new Error('ERR_LOGS_STORE_REQUIRED')
    if (!metaLogs) throw new Error('ERR_LOGS_META_LOGS_REQUIRED')
    this.store = store
    this.metaLogs = metaLogs
    this.conf = conf || {}
    this._logCache = {}
  }

  async initBeeLogMeta (logKey) {
    const meta = { cur: 0 }

    await this.metaLogs.put(
      logKey,
      Buffer.from(JSON.stringify(meta))
    )

    return meta
  }

  async rotateBeeLog (logKey) {
    const meta = await this.getBeeLogMeta(logKey)

    if (!meta) {
      throw new Error('ERR_BEE_LOG_META_NOTFOUND')
    }

    meta.cur++

    await this.metaLogs.put(
      logKey,
      Buffer.from(JSON.stringify(meta))
    )

    return meta
  }

  async getBeeLogMeta (logKey, init = false) {
    let meta = await this.metaLogs.get(logKey)

    if (meta) {
      meta = JSON.parse(meta.value.toString())
    } else if (init) {
      meta = await this.initBeeLogMeta(logKey)
    }

    return meta
  }

  async releaseBeeTimeLog (log) {
    try {
      await log.close()
    } catch (e) {
      debug('ERR_RELEASE_BEE %s', e.message)
    }
  }

  async getBeeTimeLog (logKey, offset = 0, init = false) {
    const meta = await this.getBeeLogMeta(logKey, init)

    if (!meta) {
      return null
    }

    const point = meta.cur - offset

    if (point < 0) {
      return null
    }

    let log = null

    try {
      log = await this.getBeeForLogKey(logKey, point)

      if (offset === 0 && log && (await this.isLogCorrupted(log))) {
        const updatedMeta = await this.rotateBeeLog(logKey)
        if (!updatedMeta) {
          throw new Error('ERR_BEE_ROTATED_LOG_META_NOTFOUND')
        }
        log = await this.getBeeForLogKey(logKey, updatedMeta.cur)
      }

      if (!log) {
        return null
      }
    } catch (error) {
      debug('ERR_GET_BEE_TIME_LOG %s', error.message)
      return null
    }

    try {
      await log.ready()
    } catch (e) {
      debug('ERR_BEE_READY %s', e.message)
      log = null
    }

    return log
  }

  async getBeeForLogKey (logKey, point) {
    return await this.store.getBee(
      {
        name: `${getLogName(logKey)}-${point}`
      },
      { keyEncoding: 'binary' }
    )
  }

  async isLogCorrupted (log) {
    let validated = true
    try {
      for await (const entry of log.createReadStream({ limit: 1 })) {
        validated = !!entry
      }
    } catch (e) {
      validated = false
      debug('LOG_CORRUPTED %s', e.message)
    }

    return !validated
  }

  async rotateLogs () {
    if (!this.conf.logRotateMaxLength) {
      return []
    }

    const stream = this.metaLogs.createReadStream({})
    const res = []

    for await (const chunk of stream) {
      const meta = JSON.parse(chunk.value.toString())
      const log = await this.getBeeTimeLog(chunk.key, 0)

      if (log) {
        if (log.core.length >= this.conf.logRotateMaxLength) {
          await this.rotateBeeLog(chunk.key)
          res.push([chunk.key, meta, log.core.length])
          debug('ROTATE: log-key=%s,cur=%d,len=%d', chunk.key, meta.cur, log.core.length)
        }

        await this.releaseBeeTimeLog(log)
      }
    }

    return res
  }

  async refreshLogsCache () {
    if (!this.conf.logKeepCount) {
      return []
    }

    const stream = this.metaLogs.createReadStream({})
    const mem = this._logCache

    for (const ck of Object.keys(mem)) {
      mem[ck].offset = -1
    }

    for await (const chunk of stream) {
      const meta = JSON.parse(chunk.value.toString())
      const maxHeight = getLogMaxHeight(this.conf.logKeepCount)

      for (let i = 0; i < maxHeight; i++) {
        const log = await this.getBeeTimeLog(chunk.key, i)

        if (!log) {
          continue
        }

        const dkey = log.core.key.toString('hex')

        if (mem[dkey]) {
          mem[dkey].offset = i
          await this.releaseBeeTimeLog(log)
          continue
        }

        debug('REFRESH: log-key=%s,offset=%d,cur=%d', chunk.key, i, meta.cur)
        mem[dkey] = { log, offset: i, desc: chunk.key }
      }
    }

    await this._cleanupLogs(mem)
  }

  async _cleanupLogs (mem) {
    for (const ck of Object.keys(mem)) {
      const entry = mem[ck]

      if (entry.offset < 0) {
        await this.releaseBeeTimeLog(entry.log)
        debug('REFRESH[RELEASE]: log-key=%s,cache-key=%s', entry.desc, ck)
        delete mem[ck]

        try {
          await this.store.unlink(ck)
          break
        } catch (e) {
          debug('LOG_NOT_FOUND=%s %s', ck, e.message)
        }
      }
    }
  }

  async saveLogData (key, ts, data, offset = 0, init = false) {
    const log = await this.getBeeTimeLog(key, offset, init)
    if (!log) return

    await log.put(utilsStore.convIntToBin(ts), Buffer.from(JSON.stringify(data)))
    await this.releaseBeeTimeLog(log)
  }

  getLogName (n) {
    return getLogName(n)
  }
}

module.exports = LogsService
