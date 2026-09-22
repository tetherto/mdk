'use strict'

const { createHmac, timingSafeEqual } = require('node:crypto')
const keys = require('../lib/test-keys')

const PREFIX = '/pool/v1'
const TIME_ROUTE = `${PREFIX}/time`
const SIGNATURE_WINDOW_S = 30
const MAX_PAGE_SIZE = 100
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const HEX_SHA256 = /^[a-f0-9]{64}$/

const success = data => ({ code: 'success', message: '', data })
const failure = (reply, status) => reply.code(status).send({ code: 'error' })

/**
 * Minimal EMCD Pool API v1 mock.
 *
 * Options:
 *   accounts          `{ [subaccountId]: state }`; `''` is the master account
 *   clockOffsetMs     skew of the mock's clock, to exercise client clock sync
 *   balanceStatus     200 (default) serves `/balance`; 403 models a key
 *                     without master:read:balance; 404 models a deployment
 *                     without the endpoint
 */
module.exports = async (app, { accounts, clockOffsetMs = 0, balanceStatus = 200 }) => {
  const now = () => Date.now() + clockOffsetMs
  const stateFor = request => accounts[request.headers['x-subaccount-id'] || '']

  app.addHook('preHandler', async (request, reply) => {
    if (request.routeOptions.url === TIME_ROUTE) {
      return
    }

    const account = request.headers['x-subaccount-id'] || ''
    if (!isAuthentic(request.headers, account, now())) {
      return reply.code(401).send({ code: 'error', message: 'Authentication failed' })
    }
    if (!Object.hasOwn(accounts, account)) {
      return failure(reply, 403)
    }
    if (request.query.coin !== 'btc') {
      return failure(reply, 400)
    }
  })

  app.get(TIME_ROUTE, async () => ({ epoch: now() / 1000 }))

  app.get(`${PREFIX}/hashrate`, async request => success(stateFor(request).hashrate))

  app.get(`${PREFIX}/hashrate/workers`, async request => success({ items: stateFor(request).workers }))

  app.get(`${PREFIX}/balance`, async (request, reply) => {
    if (balanceStatus !== 200) {
      return failure(reply, balanceStatus)
    }
    return success(stateFor(request).balance)
  })

  app.get(`${PREFIX}/earnings`, async (request, reply) => {
    const query = parseLedgerQuery(request.query)
    if (!query) {
      return failure(reply, 400)
    }

    const rows = stateFor(request).earnings.filter(row => isWithin(row.date, query))
    // The real API groups by day *after* paginating the underlying ledger.
    const items = groupByDate(paginate(rows, query))
    return success({ items, page: query.page, pageSize: query.pageSize, totalSize: rows.length })
  })

  app.get(`${PREFIX}/payouts`, async (request, reply) => {
    const query = parseLedgerQuery(request.query)
    if (!query) {
      return failure(reply, 400)
    }

    const rows = stateFor(request).payouts.filter(row => isWithin(row.time.slice(0, 10), query))
    const items = paginate(rows, query)
    return success({ items, page: query.page, pageSize: query.pageSize, totalSize: rows.length })
  })
}

function isAuthentic (headers, account, nowMs) {
  const apiKey = headers['x-api-key']
  const timestamp = headers['x-timestamp'] || ''
  const signature = headers['x-signature'] || ''

  if (apiKey !== keys.apiKey) {
    return false
  }
  if (!/^\d+$/.test(timestamp)) {
    return false
  }
  if (Math.abs(Number(timestamp) - nowMs / 1000) > SIGNATURE_WINDOW_S) {
    return false
  }
  if (!HEX_SHA256.test(signature)) {
    return false
  }

  // Recomputed here on purpose, independently of the client's `sign()`.
  const expected = createHmac('sha256', keys.apiSecret)
    .update(keys.apiKey + timestamp + account)
    .digest('hex')
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
}

function parseLedgerQuery ({ fromTime, toTime, page = 1, pageSize = MAX_PAGE_SIZE }) {
  const query = { fromTime, toTime, page: Number(page), pageSize: Number(pageSize) }

  const validPage = Number.isInteger(query.page) && query.page >= 1
  const validPageSize = Number.isInteger(query.pageSize) && query.pageSize >= 1 && query.pageSize <= MAX_PAGE_SIZE
  const validRange = ISO_DATE.test(fromTime) && ISO_DATE.test(toTime) && fromTime <= toTime

  return validPage && validPageSize && validRange ? query : null
}

function isWithin (date, { fromTime, toTime }) {
  return date >= fromTime && date <= toTime
}

function paginate (rows, { page, pageSize }) {
  return rows.slice((page - 1) * pageSize, page * pageSize)
}

function groupByDate (rows) {
  const totals = new Map()
  for (const { date, totalAmount } of rows) {
    totals.set(date, (totals.get(date) || 0) + totalAmount)
  }
  return Array.from(totals, ([date, totalAmount]) => ({ date, totalAmount }))
}
