'use strict'

const utilsStore = require('@tetherto/hp-svc-facs-store/utils')
const gLibUtilBase = require('@bitfinex/lib-js-util-base')
const { getLogsCountForTimeRange, getLogMaxHeight, aggregateLogs, applyFilters, projection } = require('../utils')

// Hard ceiling on rows a single read may return; conf.logMaxLimit lowers or
// raises it per worker.
const DEFAULT_MAX_LOG_LIMIT = 10000
const LOG_KEY_RE = /^[A-Za-z0-9_-]{1,64}$/
const LOG_TAG_RE = /^[A-Za-z0-9_.:-]{1,160}$/
// Per-device snapshot log written by SnapsService (`thing-5m-<deviceId>`).
const DEVICE_LOG_KEY = 'thing-5m'

/**
 * Reads time logs written by LogsService: tailLog(key, tag) walks rotated
 * bees until the requested range/limit is filled; getHistoricalLogs serves
 * the `alerts` / `info` history logs, resolving device metadata through the
 * injected getDeviceInfo(deviceId).
 *
 * Every caller-supplied paging value is validated: `offset` is an integer in
 * 0..logMaxHeight, `limit` an integer capped at conf.logMaxLimit (default
 * 10000), `start`/`end` finite timestamps. tailLog only opens the per-device
 * snapshot log (`thing-5m`, tag = the device id) and `stat-*` aggregate
 * logs, plus any key listed in conf.tailLogKeys; when the request is scoped
 * to a device (thingId) the tag must belong to that device, and
 * getHistoricalLogs returns that device's alerts and info changes only.
 */
class LogHistoryService {
  constructor ({ logs, getDeviceInfo, statTimeframes, conf, tailLogHook = async () => {} }) {
    if (!logs) throw new Error('ERR_LOG_HISTORY_LOGS_REQUIRED')
    this.logs = logs
    this.getDeviceInfo = getDeviceInfo || (() => undefined)
    this.statTimeframes = statTimeframes || []
    this.conf = conf || {}
    this.tailLogHook = tailLogHook
  }

  _maxLimit () {
    const n = this.conf.logMaxLimit
    return Number.isInteger(n) && n > 0 ? n : DEFAULT_MAX_LOG_LIMIT
  }

  // Normalises the paging fields of a caller request; throws ERR_LOG_* on
  // anything outside the accepted shape.
  _sanitizeRange (req) {
    const out = { ...req }
    const maxHeight = getLogMaxHeight(this.conf.logKeepCount)
    if (req.offset !== undefined && req.offset !== null) {
      const offset = Number(req.offset)
      if (!Number.isInteger(offset) || offset < 0 || offset > maxHeight) throw new Error('ERR_LOG_OFFSET_INVALID')
      out.offset = offset
    }
    if (req.limit !== undefined && req.limit !== null) {
      const limit = Number(req.limit)
      if (!Number.isInteger(limit) || limit < 0) throw new Error('ERR_LOG_LIMIT_INVALID')
      out.limit = Math.min(limit, this._maxLimit())
    }
    for (const k of ['start', 'end']) {
      if (req[k] === undefined || req[k] === null) continue
      const v = Number(req[k])
      if (!Number.isFinite(v) || v < 0) throw new Error(`ERR_LOG_${k.toUpperCase()}_INVALID`)
      out[k] = v
    }
    return out
  }

  async _getLogs (req, logKey, errorMsg, transformFn) {
    const offset = req.offset || 0
    const log = await this.logs.getBeeTimeLog(logKey, offset)

    if (!log) {
      throw new Error(errorMsg)
    }

    const res = await this._parseHistLog(log, {
      reverse: true,
      limit: req.limit,
      start: req.start,
      end: req.end
    })

    if (!Array.isArray(res)) {
      throw new Error('ERR_HIST_LOG_NOTFOUND')
    }

    await this.logs.releaseBeeTimeLog(log)
    return transformFn(res, req)
  }

  _pickDevice (deviceId) {
    const dev = this.getDeviceInfo(deviceId)
    return gLibUtilBase.pick(dev, ['id', 'info', 'tags', 'type', 'code'])
  }

  // A device-scoped request (thingId) sees that device's entries only; the
  // filter runs before the limit so the page is that device's, not the Worker's.
  _transformAlerts (res, req) {
    const alerts = res.flatMap(log => Object.values(log))
    const flattenedAlerts = (req.thingId ? alerts.filter(alert => alert.thingId === req.thingId) : alerts).slice(0, req.limit)
    return flattenedAlerts.map(alert => {
      const { thingId, ...rest } = alert
      return { ...rest, thing: this._pickDevice(thingId) }
    })
  }

  _transformInfoHistory (res, req) {
    const changes = res.flat(1)
    const flattenedHistory = (req.thingId ? changes.filter(change => change.id === req.thingId) : changes).slice(0, req.limit)
    const historyWithCurrentInfo = flattenedHistory.map(change => {
      const { id, ...rest } = change
      return { ...rest, thing: this._pickDevice(id) }
    })

    return gLibUtilBase.isEmpty(req.fields) ? historyWithCurrentInfo : projection(historyWithCurrentInfo, req.fields)
  }

  async getHistoricalLogs (req) {
    req = this._sanitizeRange(req)
    const logType = req.logType
    if (!logType) {
      throw new Error('ERR_INFO_HISTORY_LOG_TYPE_INVALID')
    }
    if (logType === 'alerts') {
      return this._getLogs(
        req,
        'thing-alerts',
        'ERR_LOG_NOTFOUND',
        (res, r) => this._transformAlerts(res, r)
      )
    }
    if (logType === 'info') {
      const logs = await this._getLogs(
        req,
        'thing-history-log',
        'ERR_INFO_HISTORY_LOG_NOTFOUND',
        (res, r) => this._transformInfoHistory(res, r)
      )
      return applyFilters(
        logs,
        { ...req, offset: req.offset ?? 0, limit: req.limit ?? 100 },
        true
      )
    }
  }

  async _getLogResponse (req, offset) {
    const log = await this.logs.getBeeTimeLog(`${req.key}-${req.tag}`, offset)

    if (!log) {
      throw new Error('ERR_LOG_NOTFOUND')
    }

    const res = await this._parseHistLog(log, {
      reverse: true,
      limit: req.limit,
      start: req.start,
      end: req.end
    })
    await this.logs.releaseBeeTimeLog(log)
    return res
  }

  _getDefaultTaillogLimit (req) {
    const { limit, start, end } = req
    // A pure time-range read still stops at the hard ceiling.
    return limit || (start || end ? this._maxLimit() : 100)
  }

  // Which logs a tailLog request may open. Keys and tags are interpolated
  // into a bee name, so they are charset-restricted first; then the key must
  // be the per-device snapshot log or a stat log, and a device-scoped request
  // (thingId) may only read that device's own logs.
  _checkTailLogScope (req) {
    const { key, tag, thingId } = req
    if (typeof key !== 'string' || !LOG_KEY_RE.test(key)) throw new Error('ERR_LOG_KEY_INVALID')
    if (typeof tag !== 'string' || !LOG_TAG_RE.test(tag)) throw new Error('ERR_LOG_TAG_INVALID')

    const extraKeys = Array.isArray(this.conf.tailLogKeys) ? this.conf.tailLogKeys : []
    const isDeviceLog = key === DEVICE_LOG_KEY
    if (!isDeviceLog && !key.startsWith('stat-') && !extraKeys.includes(key)) {
      throw new Error('ERR_LOG_KEY_INVALID')
    }

    if (isDeviceLog) {
      // tag === thingId here when the request is device-scoped (tailLog
      // derives it); otherwise it must still name a provisioned device.
      if (!this.getDeviceInfo(tag)) throw new Error('ERR_LOG_TAG_FORBIDDEN')
      return
    }

    if (thingId) {
      const dev = this.getDeviceInfo(thingId)
      const tags = (dev && Array.isArray(dev.tags)) ? dev.tags : []
      if (!tags.includes(tag)) throw new Error('ERR_LOG_TAG_FORBIDDEN')
    }
  }

  async _getTailLogWithOffset (req, offset) {
    const { start, end, key } = req
    const limit = this._getDefaultTaillogLimit(req)
    const numberOfLogsInRange = getLogsCountForTimeRange(
      start,
      end,
      key,
      this.statTimeframes
    )
    const logMaxHeight = getLogMaxHeight(this.conf.logKeepCount)

    if (!numberOfLogsInRange && !limit) return await this._getLogResponse(req, offset)

    const remaining =
      numberOfLogsInRange && limit
        ? Math.min(numberOfLogsInRange, limit)
        : numberOfLogsInRange || limit

    let allLogs = []
    if (offset >= logMaxHeight) return await this._getLogResponse(req, offset)
    while (allLogs.length < remaining && offset <= logMaxHeight) {
      try {
        const logs = await this._getLogResponse(req, offset++)
        if (!Array.isArray(logs)) break

        allLogs = allLogs.concat(logs).slice(0, remaining)
      } catch (error) {
        if (allLogs.length === 0) throw error
        break
      }
    }

    return allLogs
  }

  async tailLog (req) {
    if (!req.key) {
      throw new Error('ERR_LOG_KEY_NOTFOUND')
    }

    // The per-device snapshot log is addressed by the device, never by a
    // caller-chosen tag.
    if (req.key === DEVICE_LOG_KEY && req.thingId) {
      req = { ...req, tag: req.thingId }
    }

    if (!req.tag) {
      throw new Error('ERR_LOG_TAG_INVALID')
    }

    this._checkTailLogScope(req)
    req = this._sanitizeRange(req)
    const offset = req.offset || 0

    const res = await this._getTailLogWithOffset(req, offset)

    await this.tailLogHook(res, req)

    if (req.groupRange) {
      const aggregated = aggregateLogs(res, req.groupRange, req.shouldCalculateAvg)

      if (!gLibUtilBase.isEmpty(req.fields)) {
        return projection(aggregated, req.fields)
      }
      return aggregated
    }

    if (!gLibUtilBase.isEmpty(req.fields)) {
      return projection(res, req.fields)
    }

    return res
  }

  async _parseHistLog (log, req) {
    const query = {}

    if (req.start) {
      query.gte = utilsStore.convIntToBin(req.start)
    }

    if (req.end) {
      query.lte = utilsStore.convIntToBin(req.end)
    }

    if (req.limit) {
      query.limit = req.limit
    }

    if (req.reverse) {
      query.reverse = true
    }

    if (req.startExcl) {
      query.gt = utilsStore.convIntToBin(req.startExcl)
    }

    if (req.endExcl) {
      query.lt = utilsStore.convIntToBin(req.endExcl)
    }

    const stream = log.createReadStream(query)

    const res = []

    for await (const chunk of stream) {
      res.push(JSON.parse(chunk.value.toString()))
    }

    return res
  }
}

module.exports = LogHistoryService
