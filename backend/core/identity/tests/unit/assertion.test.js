'use strict'

const test = require('brittle')
const { ServiceAccountTokenSource, generateCredential, publicKeyOfPrivate } = require('../../index')
const { issuer } = require('./helpers')

async function setup (t) {
  const { iss, now } = await issuer(t)
  const cred = generateCredential()
  await iss.upsertServiceAccount({ name: 'app:ops-center', publicKey: cred.publicKey })
  const calls = []
  const request = async (action, payload) => {
    calls.push(action)
    try {
      if (action === 'auth.token') return await iss.token(payload)
      if (action === 'auth.refresh') return await iss.refresh(payload)
    } catch (err) {
      return { error: err.message }
    }
  }
  const source = new ServiceAccountTokenSource({ name: 'app:ops-center', privateKey: cred.privateKeyPem, request, now })
  return { iss, now, cred, calls, source }
}

test('signs in once, reuses the token, and refreshes before expiry', async (t) => {
  const { iss, now, calls, source } = await setup(t)
  const a = await source.getToken()
  t.is(iss.verify(a).sub, 'app:ops-center')
  t.is(await source.getToken(), a)
  now.advance(541)
  const b = await source.getToken()
  t.not(b, a)
  t.alike(calls, ['auth.token', 'auth.refresh'])
})

test('concurrent callers share one sign-in', async (t) => {
  const { calls, source } = await setup(t)
  const [a, b] = await Promise.all([source.getToken(), source.getToken()])
  t.is(a, b)
  t.alike(calls, ['auth.token'])
})

test('a revoked session falls back to a new assertion', async (t) => {
  const { iss, now, calls, source, cred } = await setup(t)
  await source.getToken()
  await iss.deleteServiceAccount('app:ops-center')
  await iss.upsertServiceAccount({ name: 'app:ops-center', publicKey: cred.publicKey })
  now.advance(600)
  t.ok(await source.getToken())
  t.alike(calls, ['auth.token', 'auth.refresh', 'auth.token'])
  source.reset()
  await source.getToken()
  t.is(calls.at(-1), 'auth.token')
})

test('a refusal surfaces with its code', async (t) => {
  const source = new ServiceAccountTokenSource({ name: 'x', privateKey: generateCredential().privateKeyPem, request: async () => ({ error: 'ERR_IDENTITY_ASSERTION_INVALID: unknown service account' }) })
  await t.exception(source.getToken(), /ERR_IDENTITY_ASSERTION_INVALID/)
  const silent = new ServiceAccountTokenSource({ name: 'x', privateKey: generateCredential().privateKeyPem, request: async () => null })
  await t.exception(silent.getToken(), /ERR_IDENTITY_NO_REPLY/)
  t.exception(() => new ServiceAccountTokenSource({ name: 'x' }), /ERR_IDENTITY_REQUEST_REQUIRED/)
})

test('credentials: the public key derives from the private one', (t) => {
  const cred = generateCredential()
  t.is(publicKeyOfPrivate(cred.privateKeyPem), cred.publicKey)
  t.ok(/^[0-9a-f]{64}$/.test(cred.publicKey))
})

test('gatewayTokenRequest: sign-in and refresh over HTTP; refusals come back as { error }', async (t) => {
  const { gatewayTokenRequest } = require('../../index')
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push([url, JSON.parse(init.body)])
    if (url.endsWith('/auth/token')) return new Response(JSON.stringify({ accessToken: 'a' }), { status: 200 })
    return new Response(JSON.stringify({ message: 'ERR_IDENTITY_REFRESH_REVOKED' }), { status: 401 })
  }
  const request = gatewayTokenRequest('http://gw:3847/', fetchImpl)
  t.alike(await request('auth.token', { assertion: 'x' }), { accessToken: 'a' })
  t.alike(await request('auth.refresh', { refreshToken: 'r' }), { error: 'ERR_IDENTITY_REFRESH_REVOKED' })
  t.alike(await request('auth.login', {}), { error: 'ERR_IDENTITY_ACTION_UNSUPPORTED: auth.login' })
  t.alike(calls.map((c) => c[0]), ['http://gw:3847/auth/token', 'http://gw:3847/auth/refresh'])
  const noJson = gatewayTokenRequest('http://gw', async () => new Response('down', { status: 502 }))
  t.alike(await noJson('auth.token', {}), { error: 'ERR_IDENTITY_HTTP_502' })
})
