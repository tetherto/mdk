'use strict'

const pool = require('../pool')
const { getTimeRanges } = require('../../lib/utils')
const { TRANSACTION_TYPES } = require('../../lib/utils/constants')

// Earnings rows straight from the pool for the requested range, one API call
// per account whatever the span, so a reporting app never waits for a daily
// collector to backfill.
//
// Without a range (a poll sweep), only the rows that arrived since the last
// sweep, so the stored series holds each row once instead of a growing copy of
// the day per point. The cursor is in memory (a V2 device has no store): the
// first sweep after a start re-reads the current UTC day, so a consumer that
// spans restarts dedupes on the pool's row `id`. Starting at "now" instead
// would drop the rows earned while the Worker was down.
let sweptTo = null

const utcMidnight = (ms) => ms - (ms % 86400000)

function range (params) {
  if (params.start == null && params.end == null) {
    const end = Date.now()
    return { start: sweptTo != null ? sweptTo : utcMidnight(end), end, sweep: true }
  }
  if (params.start == null) throw new Error('ERR_START_INVALID')
  if (params.end == null) throw new Error('ERR_END_INVALID')
  const start = Number(params.start)
  const end = Number(params.end)
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) throw new Error('ERR_RANGE_INVALID')
  return { start, end, sweep: false }
}

// The range's total revenue (BTC) spread evenly over its hours, one row per
// hour: the same figures the Ocean plugin's aggrHourly carries, as the array
// this channel is declared to return.
function aggregateHourly (rows, { start, end }) {
  const total = rows.reduce((sum, row) => sum + (row.changed_balance || 0), 0)
  const ranges = getTimeRanges(start, end)
  if (!ranges.length) return []
  const revenue = total / ranges.length
  return ranges.map(({ end }) => ({ ts: end, revenue }))
}

module.exports = async (params = {}) => {
  const { start, end, sweep } = range(params)
  const rows = await pool.call(async () => {
    let all = []
    for (const username of pool.accounts) {
      const txs = await pool.api.getTransactions(start, end, TRANSACTION_TYPES.REVENUE, username)
      all = all.concat(txs.map((tx) => ({ username, ts: tx.created_at * 1000, ...tx })))
    }
    return all.sort((a, b) => a.ts - b.ts)
  })
  // A row created inside the window but stamped at its very end would be
  // re-read next sweep; the pool stamps revenue rows at their settle time, so
  // the next sweep starts where this one ended.
  if (sweep) sweptTo = end
  return params.aggrHourly ? aggregateHourly(rows, { start, end }) : rows
}
