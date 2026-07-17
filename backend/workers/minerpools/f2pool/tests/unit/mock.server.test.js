'use strict'

const test = require('brittle')
const { createServer } = require('../../mock/server')

async function startMock (t, opts) {
  const handle = createServer({ port: 0, host: '127.0.0.1', ...opts })
  await handle.ready
  t.teardown(() => handle.app.close())
  return handle
}

function inject (handle, opts) {
  return handle.app.inject({
    method: 'POST',
    ...opts
  })
}

test('usernames array ctx is used as-is', async (t) => {
  const handle = await startMock(t, { usernames: ['alpha', 'beta'] })
  const res = await inject(handle, {
    url: '/v2/assets/balance',
    headers: { 'f2p-api-secret': 'secret-key' },
    payload: { currency: 'bitcoin', mining_user_name: 'beta' }
  })
  t.ok(JSON.parse(res.payload).balance_info)
})

test('missing usernames falls back to default account', async (t) => {
  const handle = await startMock(t, {})
  const res = await inject(handle, {
    url: '/v2/assets/balance',
    headers: { 'f2p-api-secret': 'secret-key' },
    payload: { currency: 'bitcoin', mining_user_name: 'haven7346' }
  })
  t.ok(JSON.parse(res.payload).balance_info)
})

test('auth rejects missing and wrong api secret', async (t) => {
  const handle = await startMock(t, { usernames: 'u1' })
  const noSecret = await inject(handle, {
    url: '/v2/assets/balance',
    payload: { currency: 'bitcoin', mining_user_name: 'u1' }
  })
  t.is(noSecret.statusCode, 401)

  const wrongSecret = await inject(handle, {
    url: '/v2/assets/balance',
    headers: { 'f2p-api-secret': 'nope' },
    payload: { currency: 'bitcoin', mining_user_name: 'u1' }
  })
  t.is(wrongSecret.statusCode, 401)
})
