'use strict'

const crypto = require('crypto')

// Compact JWS with EdDSA (Ed25519) only, on node:crypto. Verification is
// strict and fails closed: the algorithm is fixed (no `alg` negotiation, so no
// `none` and no HMAC-with-a-public-key confusion), the key is chosen by the
// caller rather than trusted from the header, and `exp` is required.

const ALG = 'EdDSA'
const MAX_TOKEN_LENGTH = 8192
const DEFAULT_CLOCK_SKEW_SEC = 30

const b64url = (buf) => Buffer.from(buf).toString('base64url')
const B64URL = /^[A-Za-z0-9_-]+$/

function _fail (code, detail) {
  const err = new Error(detail ? `${code}: ${detail}` : code)
  err.code = code
  return err
}

function _json (segment, what) {
  if (!B64URL.test(segment)) throw _fail('ERR_IDENTITY_TOKEN_MALFORMED', `${what} is not base64url`)
  let value
  try {
    value = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'))
  } catch {
    throw _fail('ERR_IDENTITY_TOKEN_MALFORMED', `${what} is not JSON`)
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw _fail('ERR_IDENTITY_TOKEN_MALFORMED', `${what} is not an object`)
  return value
}

/**
 * Sign `claims` with an Ed25519 private key.
 * @param {object} claims
 * @param {crypto.KeyObject} privateKey
 * @param {{ kid?: string, typ?: string }} [header]
 */
function signJwt (claims, privateKey, { kid, typ = 'JWT' } = {}) {
  const head = b64url(JSON.stringify({ alg: ALG, typ, ...(kid ? { kid } : {}) }))
  const body = b64url(JSON.stringify(claims))
  const sig = crypto.sign(null, Buffer.from(`${head}.${body}`), privateKey)
  return `${head}.${body}.${b64url(sig)}`
}

/**
 * Split and parse a token without checking its signature. For routing only
 * (which key to verify with); never trust what it returns.
 * @returns {{ header: object, claims: object, signingInput: Buffer, signature: Buffer }}
 */
function decodeJwt (token) {
  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    throw _fail('ERR_IDENTITY_TOKEN_MALFORMED', 'not a token')
  }
  const parts = token.split('.')
  if (parts.length !== 3 || !B64URL.test(parts[2])) throw _fail('ERR_IDENTITY_TOKEN_MALFORMED', 'expected three segments')
  const header = _json(parts[0], 'header')
  const claims = _json(parts[1], 'payload')
  if (header.alg !== ALG) throw _fail('ERR_IDENTITY_TOKEN_ALG', `only ${ALG} is accepted`)
  return { header, claims, signingInput: Buffer.from(`${parts[0]}.${parts[1]}`), signature: Buffer.from(parts[2], 'base64url') }
}

const _includes = (aud, want) => (Array.isArray(aud) ? aud.includes(want) : aud === want)

/**
 * Verify a token and return its claims.
 *
 * @param {string} token
 * @param {object} opts
 * @param {(header: object, claims: object) => crypto.KeyObject|null} opts.keyFor
 *   - the public key to verify with; null rejects the token
 * @param {string} [opts.issuer] - required `iss`
 * @param {string} [opts.audience] - required in `aud`
 * @param {string} [opts.typ] - required header `typ`
 * @param {number} [opts.maxLifetimeSec] - reject tokens whose exp - iat exceeds this
 * @param {number} [opts.clockSkewSec=30]
 * @param {() => number} [opts.now=Date.now]
 * @returns {object} claims
 */
function verifyJwt (token, opts) {
  const { header, claims, signingInput, signature } = decodeJwt(token)
  if (opts.typ && header.typ !== opts.typ) throw _fail('ERR_IDENTITY_TOKEN_TYPE', `expected typ ${opts.typ}`)

  const key = opts.keyFor(header, claims)
  if (!key) throw _fail('ERR_IDENTITY_TOKEN_KEY_UNKNOWN', header.kid ? `kid ${header.kid}` : undefined)
  let ok = false
  try {
    ok = crypto.verify(null, signingInput, key, signature)
  } catch {
    ok = false
  }
  if (!ok) throw _fail('ERR_IDENTITY_TOKEN_SIGNATURE')

  const now = Math.floor((opts.now || Date.now)() / 1000)
  const skew = opts.clockSkewSec ?? DEFAULT_CLOCK_SKEW_SEC
  if (!Number.isInteger(claims.exp)) throw _fail('ERR_IDENTITY_TOKEN_CLAIMS', 'exp is required')
  if (claims.exp + skew <= now) throw _fail('ERR_IDENTITY_TOKEN_EXPIRED')
  if (claims.nbf !== undefined && (!Number.isInteger(claims.nbf) || claims.nbf - skew > now)) throw _fail('ERR_IDENTITY_TOKEN_NOT_YET_VALID')
  if (claims.iat !== undefined && (!Number.isInteger(claims.iat) || claims.iat - skew > now)) throw _fail('ERR_IDENTITY_TOKEN_CLAIMS', 'iat is in the future')
  if (opts.maxLifetimeSec !== undefined) {
    if (!Number.isInteger(claims.iat)) throw _fail('ERR_IDENTITY_TOKEN_CLAIMS', 'iat is required')
    if (claims.exp - claims.iat > opts.maxLifetimeSec) throw _fail('ERR_IDENTITY_TOKEN_CLAIMS', `lifetime over ${opts.maxLifetimeSec}s`)
  }
  if (opts.issuer !== undefined && claims.iss !== opts.issuer) throw _fail('ERR_IDENTITY_TOKEN_ISSUER')
  if (opts.audience !== undefined && !_includes(claims.aud, opts.audience)) throw _fail('ERR_IDENTITY_TOKEN_AUDIENCE')
  return claims
}

module.exports = { signJwt, decodeJwt, verifyJwt, ALG, MAX_TOKEN_LENGTH }
