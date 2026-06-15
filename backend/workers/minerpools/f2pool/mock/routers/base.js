'use strict'

const { generateAndAddToStateRandomTxs, generateAndCacheHashrateHistory } = require('../initial_states/utils')
const { getMiningPoolUserName, getAvailableCurrency } = require('../lib')
const { addNewWorker } = require('../initial_states/utils')

module.exports = function (fastify) {
  const validateBody = (req, res) => {
    if (!req.body.currency || !getAvailableCurrency(req.body.currency)) {
      res.send({ code: 5001, msg: 'params error: currency=""' })
    }
    if (
      !req.ctx.usernames.includes(req.body.mining_user_name) &&
      !getMiningPoolUserName(req.body.mining_user_name)
    ) {
      res.send({
        code: 5010,
        msg: `permission denied: permission denied name="${req.body.mining_user_name}"`
      })
    }
  }
  fastify.post('/v2/assets/balance', (req, res) => {
    try {
      validateBody(req, res)
      res.send({
        balance_info: req.state.balance_info
      })
    } catch (e) {
      res.send({ code: 'B001' })
    }
  })

  fastify.post('/v2/hash_rate/info', (req, res) => {
    try {
      validateBody(req, res)
      const response = {
        ...req.state.hashrate_info
      }
      response.info.name = req.body.mining_user_name
      res.send(response)
    } catch (e) {
      res.send({ code: 'B001' })
    }
  })

  fastify.post('/v2/hash_rate/history', (req, res) => {
    try {
      validateBody(req, res)

      if (!req.body.start_time || !req.body.end_time) {
        return res.send({
          code: 5001,
          msg: 'params error: start_time and end_time are required'
        })
      }

      const hashRateList = generateAndCacheHashrateHistory(
        req.body.start_time,
        req.body.end_time,
        req.state
      )

      res.send({
        hash_rate_list: hashRateList
      })
    } catch (e) {
      res.send({ code: 'B001', error: e.message })
    }
  })

  fastify.post('/v2/hash_rate/worker/list', (req, res) => {
    try {
      validateBody(req, res)
      res.send({
        workers: req.state.workers_list
      })
    } catch (e) {
      res.send({ code: 'B001' })
    }
  })

  fastify.post('/mock/minerpool/worker', (req, res) => {
    try {
      addNewWorker(req.state.workers_list, req.body)
      res.send({ success: true, error: '' })
    } catch (e) {
      res.send({ success: false, error: e.message })
    }
  })

  fastify.post('/v2/assets/transactions/list', (req, res) => {
    try {
      validateBody(req, res)
      const state = req.state
      generateAndAddToStateRandomTxs(
        req.body.start_time,
        req.body.end_time,
        state
      )
      const transactionsInRange = Object.values(state.transactions_list).filter(
        transaction =>
          transaction.created_at >= req.body.start_time &&
          transaction.created_at <= req.body.end_time
      )
      res.send({
        transactions: transactionsInRange
      })
    } catch (e) {
      res.send({ error: e })
    }
  })
}
