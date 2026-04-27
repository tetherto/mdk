'use strict'

const utilsStore = require('hp-svc-facs-store/utils')
const gLibUtilBase = require('lib-js-util-base')
const { getLogsCountForTimeRange, getLogMaxHeight, aggregateLogs, applyFilters, projection } = require('../utils')

class LogHistoryService {
  constructor ({ logs, getThings, statTimeframes, thingConf, tailLogHook0 = async () => {} }) {
    this.logs = logs
    this.getThings = getThings
    this.statTimeframes = statTimeframes
    this.thingConf = thingConf
    this.tailLogHook0 = tailLogHook0
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
    return transformFn(res, req, this.getThings())
  }

  _transformAlerts (res, req, things) {
    const flattenedAlerts = res.flatMap(log => Object.values(log)).slice(0, req.limit)
    return flattenedAlerts.map(alert => {
      const { thingId, ...rest } = alert
      const alertThing = things[thingId]
      const thing = gLibUtilBase.pick(alertThing, ['id', 'info', 'tags', 'type', 'code'])
      return { ...rest, thing }
    })
  }

  _transformInfoHistory (res, req, things) {
    const flattenedHistory = res.flat(1).slice(0, req.limit)
    const historyWithCurrentThingInfo = flattenedHistory.map(change => {
      const { id, ...rest } = change
      const historyThing = things[id]
      const thing = gLibUtilBase.pick(historyThing, ['id', 'info', 'tags', 'type', 'code'])
      return { ...rest, thing }
    })

    return gLibUtilBase.isEmpty(req.fields) ? historyWithCurrentThingInfo : projection(historyWithCurrentThingInfo, req.fields)
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
        (res, r, things) => this._transformAlerts(res, r, things)
      )
    }
    if (logType === 'info') {
      const logs = await this._getLogs(
        req,
        'thing-history-log',
        'ERRs_INFO_HISTORY_LOG_NOTFOUND',
        (res, r, things) => this._transformInfoHistory(res, r, things)
      )
      const filteredLogs = applyFilters(
        logs,
        { ...req, offset: req.offset ?? 0, limit: req.limit ?? 100 },
        true
      )
      return filteredLogs
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
    const timeframes = this.statTimeframes
    const { start, end, key } = req
    const limit = this._getDefaultTaillogLimit(req)
    const numberOfLogsInRange = getLogsCountForTimeRange(
      start,
      end,
      key,
      timeframes
    )
    const logMaxHeight = getLogMaxHeight(this.thingConf.logKeepCount)

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

    await this.tailLogHook0(res, req)

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
      const kstart = utilsStore.convIntToBin(req.start)
      query.gte = kstart
    }

    if (req.end) {
      const kend = utilsStore.convIntToBin(req.end)
      query.lte = kend
    }

    if (req.limit) {
      query.limit = req.limit
    }

    if (req.reverse) {
      query.reverse = true
    }

    if (req.startExcl) {
      const kstartExcl = utilsStore.convIntToBin(req.startExcl)
      query.gt = kstartExcl
    }

    if (req.endExcl) {
      const kendExcl = utilsStore.convIntToBin(req.endExcl)
      query.lt = kendExcl
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
