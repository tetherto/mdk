'use strict'

const { BTC_SATS } = require('../../constants')
const { getStartOfDay } = require('../../utils')

function validateStartEnd (req) {
  const start = Number(req.query.start)
  const end = Number(req.query.end)

  if (!start || !end) {
    throw new Error('ERR_MISSING_START_END')
  }

  if (start >= end) {
    throw new Error('ERR_INVALID_DATE_RANGE')
  }

  return { start, end }
}

function normalizeTimestampMs (ts) {
  if (!ts) return 0
  return ts < 1e12 ? ts * 1000 : ts
}

function processTransactions (results, opts) {
  const trackFees = opts && opts.trackFees
  const daily = {}
  for (const res of results) {
    if (!res || res.error) continue
    const data = Array.isArray(res) ? res : (res.data || res.result || [])
    if (!Array.isArray(data)) continue
    for (const tx of data) {
      if (!tx) continue
      const txList = tx.data || tx.transactions || tx
      if (!Array.isArray(txList)) continue
      for (const t of txList) {
        if (!t) continue
        const rawTs = t.ts || t.created_at || t.timestamp || t.time
        const ts = getStartOfDay(normalizeTimestampMs(rawTs))
        if (!ts) continue
        const day = daily[ts] ??= trackFees
          ? { revenueBTC: 0, feesBTC: 0 }
          : { revenueBTC: 0 }
        if (t.satoshis_net_earned) {
          day.revenueBTC += Math.abs(t.satoshis_net_earned) / BTC_SATS
          if (trackFees) {
            day.feesBTC += (t.fees_colected_satoshis || 0) / BTC_SATS
          }
        } else {
          day.revenueBTC += Math.abs(t.changed_balance || t.amount || t.value || 0)
          if (trackFees) {
            day.feesBTC += (t.mining_extra?.tx_fee || 0)
          }
        }
      }
    }
  }
  return daily
}

function extractCurrentPrice (results) {
  for (const res of results) {
    if (!res || res.error) continue

    // Flat entry format: [{currentPrice: N}, {priceUSD: N}, {price: N}]
    const data = Array.isArray(res) ? res : [res]
    for (const entry of data) {
      if (!entry) continue
      if (entry.currentPrice) return entry.currentPrice
      if (entry.priceUSD) return entry.priceUSD
      if (entry.price) return entry.price

      // Nested EBITDA format: {data: N} or {data: {USD: N}} or {result: ...}
      const nested = entry.data || entry.result
      if (nested) {
        if (typeof nested === 'number') return nested
        if (typeof nested === 'object') {
          if (nested.USD) return nested.USD
          if (nested.price) return nested.price
          if (nested.current_price) return nested.current_price
        }
      }
    }
  }
  return 0
}

function processBlockData (results) {
  const daily = {}
  for (const res of results) {
    if (!res || res.error) continue
    const data = Array.isArray(res) ? res : (res.data || res.result || [])
    if (!Array.isArray(data)) continue
    for (const entry of data) {
      if (!entry) continue
      const rawTs = entry.ts || entry.timestamp || entry.time
      const items = rawTs ? [entry] : (entry.data || entry.blocks || entry)
      if (Array.isArray(items)) {
        for (const item of items) {
          if (!item) continue
          const itemTs = item.ts || item.timestamp || item.time
          const ts = getStartOfDay(normalizeTimestampMs(itemTs))
          if (!ts) continue
          if (!daily[ts]) daily[ts] = { blockReward: 0, blockTotalFees: 0, blockSize: 0 }
          daily[ts].blockReward += (item.blockReward || item.block_reward || item.subsidy || 0)
          daily[ts].blockTotalFees += (item.blockTotalFees || item.block_total_fees || item.totalFees || item.total_fees || 0)
          daily[ts].blockSize += (item.blockSize || item.block_size || item.size || 0)
        }
      } else if (typeof items === 'object') {
        for (const [key, val] of Object.entries(items)) {
          const ts = getStartOfDay(Number(key))
          if (!ts) continue
          if (!daily[ts]) daily[ts] = { blockReward: 0, blockTotalFees: 0, blockSize: 0 }
          if (typeof val === 'object') {
            daily[ts].blockReward += (val.blockReward || val.block_reward || val.subsidy || 0)
            daily[ts].blockTotalFees += (val.blockTotalFees || val.block_total_fees || val.totalFees || val.total_fees || 0)
            daily[ts].blockSize += (val.blockSize || val.block_size || val.size || 0)
          }
        }
      }
    }
  }
  return daily
}

module.exports = {
  validateStartEnd,
  normalizeTimestampMs,
  processTransactions,
  extractCurrentPrice,
  processBlockData
}
