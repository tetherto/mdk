'use strict'

const { generateUserHashrate, randomNumber } = require('../initial_states/utils')

function checkError (req, res) {
  if (req.ctx.error) {
    res.code(500).send({ error: 'Internal server error' })
    return true
  }
  return false
}

function generateEarnpayData (blocks, startTime, endTime) {
  const earnings = blocks
    .filter(block => {
      const blockTime = block.ts * 1000 // Convert Unix timestamp to milliseconds
      return blockTime >= startTime && blockTime <= endTime
    })
    .map(block => ({
      block_hash: block.block_hash,
      ts: block.ts,
      shares_in_window: Math.floor(block.accepted_shares * 0.001), // User's share
      fees_collected_satoshis: Math.floor(block.total_reward_sats * 0.02), // 2% fee
      satoshis_net_earned: Math.floor(block.total_reward_sats * 0.98 * 0.001) // 98% after fee, user's portion
    }))

  const payouts = []
  let totalUnpaid = 0
  earnings.forEach(earning => {
    totalUnpaid += earning.satoshis_net_earned
    // Create payout every 100M sats (1 BTC)
    if (totalUnpaid >= 100000000) {
      payouts.push({
        ts: earning.ts,
        on_chain_txid: randomNumber().toString(16).substring(2).padEnd(64, '0'),
        total_satoshis_net_paid: totalUnpaid,
        is_generation_txn: randomNumber() > 0.5
      })
      totalUnpaid = 0
    }
  })

  return { earnings, payouts }
}

function generateMonthlyEarnings (targetMonth) {
  const earnings = []
  const [year, monthNum] = targetMonth.split('-').map(Number)
  const startDate = new Date(year, monthNum - 1, 1)
  const endDate = new Date(year, monthNum, 0)

  // Generate 5-10 blocks for the month
  const blockCount = 5 + Math.floor(randomNumber() * 5)
  for (let i = 0; i < blockCount; i++) {
    const blockTime = new Date(startDate.getTime() + randomNumber() * (endDate - startDate))
    const grossReward = 625000000 + Math.floor(randomNumber() * 50000000) // 6.25 BTC + fees

    earnings.push({
      TimeUTC: blockTime.toISOString(),
      Blockheight: 800000 + i,
      GrossUserRwd: Math.floor(grossReward * 0.001), // User's portion
      GrossUserXctnRwd: Math.floor(grossReward * 0.1 * 0.001), // Transaction fee portion
      NetUserRwd: Math.floor(grossReward * 0.98 * 0.001), // After 2% pool fee
      UserHashSinceLastRwd: Math.floor(randomNumber() * 1e18),
      PoolHashSinceLastRwd: Math.floor(randomNumber() * 1e21),
      UserHashesInShareLog: Math.floor(randomNumber() * 1e18),
      PoolHashesInShareLog: Math.floor(randomNumber() * 1e21)
    })
  }

  return earnings
}

module.exports = function (fastify) {
  function sendResult (res, data) {
    res.send({ result: data })
  }

  fastify.get('/v1/ping', (req, res) => {
    res.send('PONG')
  })

  fastify.get('/v1/blocks', (req, res) => {
    try {
      if (checkError(req, res)) return

      sendResult(res, { blocks: req.state.blocks.slice(0, 10) })
    } catch (e) {
      res.code(500).send({ error: e.message })
    }
  })

  fastify.get('/v1/latest_block', (req, res) => {
    try {
      if (checkError(req, res)) return

      sendResult(res, req.state.blocks[0] || {})
    } catch (e) {
      res.code(500).send({ error: e.message })
    }
  })

  fastify.get('/v1/user_hashrate/:username', (req, res) => {
    try {
      if (checkError(req, res)) return

      const { username } = req.params
      sendResult(res, generateUserHashrate(username))
    } catch (e) {
      res.code(500).send({ error: e.message })
    }
  })

  fastify.get('/v1/user_hashrate_full/:username', (req, res) => {
    try {
      if (checkError(req, res)) return

      const { username } = req.params
      const { generateMockWorkers } = require('../initial_states/utils')
      sendResult(res, generateMockWorkers(username))
    } catch (e) {
      res.code(500).send({ error: e.message })
    }
  })

  fastify.get('/v1/earnpay/:username/:start', (req, res) => {
    try {
      if (checkError(req, res)) return

      const { start } = req.params
      const now = Date.now()
      const startTime = isNaN(start) ? new Date(start).getTime() : parseInt(start) * 1000
      const endTime = now

      const { earnings, payouts } = generateEarnpayData(req.state.blocks, startTime, endTime)
      sendResult(res, { earnings, payouts })
    } catch (e) {
      res.code(500).send({ error: e.message })
    }
  })

  fastify.get('/v1/earnpay/:username/:start/:end', (req, res) => {
    try {
      if (checkError(req, res)) return

      const { start, end } = req.params
      const startTime = isNaN(start) ? new Date(start).getTime() : parseInt(start) * 1000
      const endTime = isNaN(end) ? new Date(end).getTime() : parseInt(end) * 1000

      const { earnings, payouts } = generateEarnpayData(req.state.blocks, startTime, endTime)
      sendResult(res, { earnings, payouts })
    } catch (e) {
      res.code(500).send({ error: e.message })
    }
  })

  fastify.get('/v1/monthly_earnings_report/:username/:month', (req, res) => {
    try {
      if (checkError(req, res)) return

      const { month } = req.params
      const earnings = generateMonthlyEarnings(month)
      sendResult(res, { report: earnings })
    } catch (e) {
      res.code(500).send({ error: e.message })
    }
  })
}
