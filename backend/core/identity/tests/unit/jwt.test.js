'use strict'

const test = require('brittle')
const crypto = require('crypto')
const { signJwt, decodeJwt, verifyJwt } = require('../../index')

const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
const other = crypto.generateKeyPairSync('ed25519')
const NOW = 1_800_000_000
const now = () => NOW * 1000
const opts = { keyFor: () => publicKey, issuer: 'mdk', audience: 'mdk', now }
const claims = (extra = {}) => ({ iss: 'mdk', aud: 'mdk', sub: 's', iat: NOW, exp: NOW + 600, ...extra })
const code = (fn) => { try { fn() } catch (err) { return err.code } return null }

test('round trip', (t) => {
  const token = signJwt(claims(), privateKey, { kid: 'k1' })
  t.is(decodeJwt(token).header.kid, 'k1')
  t.is(verifyJwt(token, opts).sub, 's')
  t.is(verifyJwt(signJwt(claims({ aud: ['x', 'mdk'] }), privateKey), opts).sub, 's', 'aud may be a list')
})

test('rejects other algorithms, including none', (t) => {
  const body = Buffer.from(JSON.stringify(claims())).toString('base64url')
  for (const alg of ['none', 'HS256', 'RS256', 'ES256']) {
    const head = Buffer.from(JSON.stringify({ alg, typ: 'JWT' })).toString('base64url')
    t.is(code(() => verifyJwt(`${head}.${body}.AAAA`, opts)), 'ERR_IDENTITY_TOKEN_ALG', alg)
  }
  const head = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')
  t.is(code(() => verifyJwt(`${head}.${body}.`, opts)), 'ERR_IDENTITY_TOKEN_MALFORMED', 'empty signature')
})

test('rejects a wrong key, a tampered payload and an unknown key', (t) => {
  const token = signJwt(claims(), other.privateKey)
  t.is(code(() => verifyJwt(token, opts)), 'ERR_IDENTITY_TOKEN_SIGNATURE')
  const [h, , s] = signJwt(claims(), privateKey).split('.')
  const forged = Buffer.from(JSON.stringify(claims({ sub: 'admin' }))).toString('base64url')
  t.is(code(() => verifyJwt(`${h}.${forged}.${s}`, opts)), 'ERR_IDENTITY_TOKEN_SIGNATURE')
  t.is(code(() => verifyJwt(signJwt(claims(), privateKey), { ...opts, keyFor: () => null })), 'ERR_IDENTITY_TOKEN_KEY_UNKNOWN')
})

test('checks time, issuer, audience, type and lifetime', (t) => {
  const v = (c, o = {}) => code(() => verifyJwt(signJwt(c, privateKey), { ...opts, ...o }))
  t.is(v(claims({ exp: undefined })), 'ERR_IDENTITY_TOKEN_CLAIMS')
  t.is(v(claims({ exp: NOW - 31 })), 'ERR_IDENTITY_TOKEN_EXPIRED')
  t.is(v(claims({ exp: NOW - 10 })), null, 'within clock skew')
  t.is(v(claims({ nbf: NOW + 60 })), 'ERR_IDENTITY_TOKEN_NOT_YET_VALID')
  t.is(v(claims({ iat: NOW + 60 })), 'ERR_IDENTITY_TOKEN_CLAIMS')
  t.is(v(claims({ iss: 'evil' })), 'ERR_IDENTITY_TOKEN_ISSUER')
  t.is(v(claims({ aud: 'other' })), 'ERR_IDENTITY_TOKEN_AUDIENCE')
  t.is(v(claims(), { typ: 'at+jwt' }), 'ERR_IDENTITY_TOKEN_TYPE')
  t.is(v(claims({ exp: NOW + 3600 }), { maxLifetimeSec: 300 }), 'ERR_IDENTITY_TOKEN_CLAIMS')
  t.is(v(claims({ iat: undefined }), { maxLifetimeSec: 300 }), 'ERR_IDENTITY_TOKEN_CLAIMS')
})

test('rejects malformed tokens', (t) => {
  for (const bad of [undefined, '', 'a.b', 'a.b.c.d', '!!.e30.AA', 'e30.e30.AA', `${'a'.repeat(9000)}`, 'bnVsbA.e30.AA']) {
    t.ok(String(code(() => decodeJwt(bad))).startsWith('ERR_IDENTITY_TOKEN_'), JSON.stringify(bad && bad.slice(0, 20)))
  }
})
