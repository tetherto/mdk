'use strict'

const test = require('brittle')
const F2MinerpoolApi = require('../../lib/f2.minerpool.api')

test('_request rate-limit sleep applies outside test env', async (t) => {
  const prev = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'
  try {
    const api = new F2MinerpoolApi({ post: async () => ({ body: { ok: 1 } }) }, 's')
    const started = Date.now()
    const res = await api._request('/x', {})
    t.ok(Date.now() - started >= 1000)
    t.is(res.ok, 1)
  } finally {
    process.env.NODE_ENV = prev
  }
})
