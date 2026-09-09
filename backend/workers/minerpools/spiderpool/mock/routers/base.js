'use strict'

const { generateAndAddToStateRandomPayments, generateAndCacheHashrateChart, addNewWorker } = require('../initial_states/utils')
const { getSubaccountName, getAvailableCoin } = require('../lib')

module.exports = function (fastify) {
  const parseDataJson = (req) => {
    try {
      return JSON.parse(req.body.dataJson || '{}')
    } catch (e) {
      return null
    }
  }

  const validateData = (data, req, res) => {
    if (!data || !data.coin || !getAvailableCoin(data.coin)) {
      res.send({ code: 'PARAM_ERROR', msg: 'params error: coin=""', data: null })
      return false
    }
    if (
      !req.ctx.usernames.includes(data.subaccount) &&
      !getSubaccountName(data.subaccount)
    ) {
      res.send({
        code: 'PERMISSION_DENIED',
        msg: `permission denied: subaccount="${data.subaccount}"`,
        data: null
      })
      return false
    }
    return true
  }

  // The live API is inconsistent: /v2/subaccount/* answers code "SUCCESS" while
  // the newer /v2/sp/* namespace answers code 200. Mirror that here so the
  // client's success handling is tested against what SpiderPool really sends.
  const ok = (data) => ({ code: 'SUCCESS', msg: '', data })
  const okSp = (data) => ({ code: 200, msg: '', data })

  fastify.post('/v2/subaccount/getSubaccountProfitInfo', (req, res) => {
    try {
      const data = parseDataJson(req)
      if (!validateData(data, req, res)) return
      res.send(ok(req.state.profit_info))
    } catch (e) {
      res.send({ code: 'SYSTEM_ERROR', msg: e.message, data: null })
    }
  })

  fastify.post('/v2/sp/hashrate/subaccount/fullHashRate', (req, res) => {
    try {
      const data = parseDataJson(req)
      if (!validateData(data, req, res)) return
      res.send(okSp({ subaccount: data.subaccount, ...req.state.full_hashrate }))
    } catch (e) {
      res.send({ code: 'SYSTEM_ERROR', msg: e.message, data: null })
    }
  })

  fastify.post('/v2/sp/hashrate/subaccount/timeRangeHashRateChart', (req, res) => {
    try {
      const data = parseDataJson(req)
      if (!validateData(data, req, res)) return

      if (!data.startTimestamp || !data.endTimestamp) {
        return res.send({
          code: 'PARAM_ERROR',
          msg: 'params error: startTimestamp and endTimestamp are required',
          data: null
        })
      }

      const chart = generateAndCacheHashrateChart(
        data.subaccount,
        data.startTimestamp,
        data.endTimestamp,
        req.state
      )
      res.send(okSp(chart))
    } catch (e) {
      res.send({ code: 'SYSTEM_ERROR', msg: e.message, data: null })
    }
  })

  fastify.post('/v2/sp/hashrate/worker/list', (req, res) => {
    try {
      const data = parseDataJson(req)
      if (!validateData(data, req, res)) return

      const pageNum = data.pageNum || 1
      const pageSize = data.pageSize || 10
      const all = req.state.workers_list
      const records = all.slice((pageNum - 1) * pageSize, pageNum * pageSize)

      res.send(okSp({
        total: all.length,
        pageNum,
        pageSize,
        pages: Math.max(Math.ceil(all.length / pageSize), 1),
        records
      }))
    } catch (e) {
      res.send({ code: 'SYSTEM_ERROR', msg: e.message, data: null })
    }
  })

  fastify.post('/v2/subaccount/getSubaccountPaymentRecord', (req, res) => {
    try {
      const data = parseDataJson(req)
      if (!validateData(data, req, res)) return

      const end = data.endTimestamp || Date.now()
      // cap the default window so an omitted startTimestamp (doc default 0)
      // doesn't make the mock generate decades of daily records
      const start = data.startTimestamp || (end - 30 * 24 * 60 * 60 * 1000)
      generateAndAddToStateRandomPayments(start, end, req.state)

      const inRange = Object.values(req.state.payment_records).filter(
        p => p.paymentDate >= start && p.paymentDate <= end
      )
      const pageNumber = data.pageNumber || 1
      const pageSize = data.pageSize || 10
      const list = inRange.slice((pageNumber - 1) * pageSize, pageNumber * pageSize)

      res.send(ok({ list, total: inRange.length }))
    } catch (e) {
      res.send({ code: 'SYSTEM_ERROR', msg: e.message, data: null })
    }
  })

  fastify.post('/mock/minerpool/worker', (req, res) => {
    try {
      addNewWorker(req.state.workers_list, 'spider-test', req.body)
      res.send({ success: true, error: '' })
    } catch (e) {
      res.send({ success: false, error: e.message })
    }
  })
}
