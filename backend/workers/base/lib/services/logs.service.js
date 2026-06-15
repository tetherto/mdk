'use strict'

const { getLogMaxHeight } = require('../utils')
const utilsStore = require('@tetherto/hp-svc-facs-store/utils')

function getLogName (n) {
  return n + '-5'
}

class LogsService {
  constructor ({ store, metaLogs, thingConf, logCache, debug, debugError }) {
    this.store = store
    this.metaLogs = metaLogs
    this.thingConf = thingConf
    this.logCache = logCache
    this.debug = debug
    this.debugError = debugError
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
      this.debugError('ERR_RELEASE_BEE', e)
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
      this.debugError('ERR_GET_BEE_TIME_LOG', error)
      return null
    }

    try {
      await log.ready()
    } catch (e) {
      console.error(e)
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
      this.debugError('LOG_CORRUPTED', e)
    }

    return !validated
  }

  async rotateLogs () {
    const thingConf = this.thingConf

    if (!thingConf.logRotateMaxLength) {
      return []
    }

    const stream = this.metaLogs.createReadStream({})
    const res = []

    for await (const chunk of stream) {
      const meta = JSON.parse(chunk.value.toString())
      const log = await this.getBeeTimeLog(chunk.key, 0)

      if (log) {
        if (log.core.length >= thingConf.logRotateMaxLength) {
          await this.rotateBeeLog(chunk.key)
          res.push([chunk.key, meta, log.core.length])
          this.debug(`ROTATE: log-key=${chunk.key},cur=${meta.cur},len=${log.core.length}`)
        }

        await this.releaseBeeTimeLog(log)
      }
    }

    return res
  }

  async refreshLogsCache () {
    const thingConf = this.thingConf

    if (!thingConf.logKeepCount) {
      return []
    }

    const stream = this.metaLogs.createReadStream({})
    const mem = this.logCache

    const ckeys = Object.keys(mem)

    for await (const ck of ckeys) {
      const entry = mem[ck]
      entry.offset = -1
    }

    for await (const chunk of stream) {
      const meta = JSON.parse(chunk.value.toString())

      const maxHeight = getLogMaxHeight(thingConf.logKeepCount)

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

        this.debug(`REFRESH: log-key=${chunk.key},offset=${i},cur=${meta.cur}, ${dkey}/${log.discoveryKey.toString('hex')}`)
        mem[dkey] = { log, offset: i, desc: chunk.key }
      }
    }

    await this._cleanupLogs(mem)
  }

  async _cleanupLogs (mem) {
    for await (const ck of Object.keys(mem)) {
      const entry = mem[ck]

      if (entry.offset < 0) {
        await this.releaseBeeTimeLog(entry.log)
        this.debug(`REFRESH[RELEASE]: log-key=${entry.desc},offset=${entry.offset},cache-key=${ck}`)
        delete mem[ck]

        try {
          await this.store.unlink(ck)
          break
        } catch (e) {
          this.debugError(`LOG_NOT_FOUND=${ck}`, e)
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
