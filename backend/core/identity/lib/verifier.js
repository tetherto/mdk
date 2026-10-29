'use strict'

const { verifyJwt } = require('./jwt')
const { publicKeyFromJwk } = require('./keys')

// Verifies MDK access tokens against the issuer's JWKS. The Kernel uses it on
// its own keys; the Gateway and MCP server get the JWKS over HRPC (`auth.jwks`)
// and verify locally.

function _fail (code) {
  const err = new Error(code)
  err.code = code
  return err
}

/**
 * @param {object} opts
 * @param {{ keys: object[] } | (() => { keys: object[] })} opts.jwks
 * @param {string} [opts.issuer='mdk']
 * @param {string} [opts.audience='mdk']
 * @param {number} [opts.clockSkewSec]
 * @param {() => number} [opts.now]
 */
function createVerifier ({ jwks, issuer = 'mdk', audience = 'mdk', clockSkewSec, now } = {}) {
  if (!jwks) throw new Error('ERR_IDENTITY_JWKS_REQUIRED')
  const cache = new Map()

  function keyFor (header) {
    const set = typeof jwks === 'function' ? jwks() : jwks
    const jwk = (set && Array.isArray(set.keys) ? set.keys : []).find((k) => k.kid === header.kid)
    if (!jwk) return null
    if (!cache.has(jwk.kid)) cache.set(jwk.kid, publicKeyFromJwk(jwk))
    return cache.get(jwk.kid)
  }

  /**
   * Verify an access token. A token bound to a transport key (`cnf.hrpc`) is
   * only accepted from that key: pass the caller's key as `cnf`.
   * @param {string} token
   * @param {{ cnf?: string }} [opts]
   * @returns {object} claims
   */
  function verify (token, { cnf } = {}) {
    const claims = verifyJwt(token, { keyFor, issuer, audience, clockSkewSec, now })
    if (claims.kind !== 'user' && claims.kind !== 'serviceaccount') throw _fail('ERR_IDENTITY_TOKEN_CLAIMS')
    if (typeof claims.sub !== 'string' || !claims.sub) throw _fail('ERR_IDENTITY_TOKEN_CLAIMS')
    const bound = claims.cnf && claims.cnf.hrpc
    if (bound && bound !== (typeof cnf === 'string' ? cnf.toLowerCase() : null)) throw _fail('ERR_IDENTITY_TOKEN_BINDING')
    return claims
  }

  return { verify }
}

/** The identity @tetherto/mdk-rbac evaluates, from verified claims. */
function identityFromClaims (claims) {
  return {
    kind: claims.kind,
    sub: claims.sub,
    ...(typeof claims.email === 'string' ? { email: claims.email } : {}),
    ...(Array.isArray(claims.groups) ? { groups: claims.groups.filter((g) => typeof g === 'string') } : {})
  }
}

module.exports = { createVerifier, identityFromClaims }
