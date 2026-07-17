'use strict'

const utilsStore = require('@tetherto/hp-svc-facs-store/utils')
const gLibUtilBase = require('@bitfinex/lib-js-util-base')
const { getLogsCountForTimeRange, getLogMaxHeight, aggregateLogs, applyFilters, projection } = require('../utils')

/**
 * Reads time logs written by LogsService: tailLog(key, tag) walks rotated
 * bees until the requested range/limit is filled; getHistoricalLogs serves
 * the `alerts` / `info` history logs, resolving device metadata through the
 * injected getDeviceInfo(deviceId).
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

  _transformAlerts (res, req) {
    const flattenedAlerts = res.flatMap(log => Object.values(log)).slice(0, req.limit)
    return flattenedAlerts.map(alert => {
      const { thingId, ...rest } = alert
      return { ...rest, thing: this._pickDevice(thingId) }
    })
  }

  _transformInfoHistory (res, req) {
    const flattenedHistory = res.flat(1).slice(0, req.limit)
    const historyWithCurrentInfo = flattenedHistory.map(change => {
      const { id, ...rest } = change
      return { ...rest, thing: this._pickDevice(id) }
    })

    return gLibUtilBase.isEmpty(req.fields) ? historyWithCurrentInfo : projection(historyWithCurrentInfo, req.fields)
  }

  async getHistoricalLogs (req) {
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
    return limit || (start || end ? undefined : 100)
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
    const offset = req.offset || 0

    if (!req.tag) {
      throw new Error('ERR_LOG_TAG_INVALID')
    }

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
