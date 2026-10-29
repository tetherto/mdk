'use strict'

const debug = require('debug')('mdk:gateway:authority')
const { compilePolicy } = require('@tetherto/mdk-rbac')
const { createVerifier, identityFromClaims } = require('@tetherto/mdk-identity')

// What the Gateway asks of the Kernel's token issuer and policy, behind one
// interface, so the request hooks and /auth routes do not care where the
// Kernel runs:
//
//   verify(token)            → identity        (async; throws ERR_IDENTITY_TOKEN_*)
//   evaluate(identity, req)  → RBAC decision    (sync, against the policy in force)
//   login / token / refresh / logout → the issuer's sign-in, as the Kernel answers it
//
// localAuthority uses an in-process KernelManager directly. remoteAuthority
// talks to a Kernel over HRPC as the Gateway's own service account: it
// verifies tokens locally against the issuer's JWKS and follows the policy,
// and every subject's token version, by polling them, so a request rarely
// waits on the Kernel. A policy it has not managed to refresh for maxStaleMs
// allows nothing (fail closed) until a poll succeeds again.

function _code (message) {
  return String(message).split(':')[0]
}

function _fail (message) {
  const err = new Error(message)
  err.code = _code(message)
  return err
}

/** @param {import('@tetherto/mdk-kernel/lib/kernel.manager')} kernel - initialized and started */
function localAuthority (kernel) {
  if (!kernel || !kernel.identity || !kernel.rbac) throw new Error('ERR_GATEWAY_AUTHORITY_KERNEL_INVALID: needs a started KernelManager')
  return {
    kind: 'local',
    async verify (token) {
      // No transport key over HTTP: a token bound to an HRPC caller is refused here.
      return identityFromClaims(kernel.identity.verify(token))
    },
    evaluate (identity, request) {
      return kernel.rbac.current().evaluate(identity, request)
    },
    allowsSome (identity, request) {
      return kernel.rbac.current().allowsSome(identity, request)
    },
    policyVersion () {
      return kernel.rbac.current().version
    },
    login (creds) {
      return kernel.identity.login(creds)
    },
    token ({ assertion }) {
      // Over HTTP there is no transport key to bind to: a bearer token for the agent's HTTP client.
      return kernel.identity.token({ assertion })
    },
    refresh ({ refreshToken }) {
      return kernel.identity.refresh({ refreshToken })
    },
    logout ({ refreshToken }) {
      return kernel.identity.logout({ refreshToken })
    },
    async start () {},
    async close () {}
  }
}

/**
 * @param {object} opts
 * @param {object} opts.client - an @tetherto/mdk-client signed in as the Gateway's
 *   service account, whose policy lets it read the policy (`policy: read`)
 * @param {number} [opts.pollMs=5000] - how often to look for a new policy
 * @param {string} [opts.issuer] / [opts.audience] - the issuer's names (default `mdk`)
 * @param {number} [opts.maxStaleMs=60000] - with no successful poll for this long, deny every request
 */
function remoteAuthority ({ client, pollMs = 5000, maxStaleMs = 60000, issuer, audience, now = Date.now }) {
  let jwks = { keys: [] }
  let jwksFetchedAt = 0
  let policy = compilePolicy(null)
  let versions = null // { '<kind>:<sub>': ver | null } from the last poll; null until one succeeds
  let polledAt = 0
  let lastForced = 0
  let timer = null
  const verifier = createVerifier({ jwks: () => jwks, ...(issuer ? { issuer } : {}), ...(audience ? { audience } : {}) })

  async function refreshJwks () {
    const res = await client.getJwks()
    if (res && Array.isArray(res.keys)) {
      jwks = res
      jwksFetchedAt = Date.now()
    }
  }

  async function refreshPolicy () {
    try {
      const res = await client.getRbac()
      if (!res || typeof res !== 'object' || typeof res.error === 'string') throw new Error((res && res.error) || 'no reply')
      const record = res.record
      if (!record) {
        policy = compilePolicy(null)
      } else if (record.version !== policy.version) {
        policy = compilePolicy(record.policy)
        debug('policy %s', policy.version)
      }
      if (res.tokenVersions && typeof res.tokenVersions === 'object') versions = res.tokenVersions
      polledAt = now()
    } catch (err) {
      // Keep the policy in force for a blip (a Kernel briefly unreachable must
      // not lock the site), but no longer than maxStaleMs: see evaluate().
      debug('policy refresh failed: %s', err.message)
    }
  }

  const stale = () => now() - polledAt > maxStaleMs

  // The issuer's own check, from the last poll: the subject still exists and
  // the token carries its current version. A token for a subject the copy
  // does not know yet (created since the last poll) or with a newer version
  // triggers one poll, at most every second, before it is refused.
  async function current (claims) {
    if (!versions) return
    const key = `${claims.kind}:${claims.sub}`
    const ok = () => Object.hasOwn(versions, key) && (claims.ver ?? null) === versions[key]
    if (ok()) return
    if (now() - lastForced > 1000) {
      lastForced = now()
      await refreshPolicy()
      if (ok()) return
    }
    throw _fail(Object.hasOwn(versions, key)
      ? 'ERR_IDENTITY_TOKEN_REVOKED: issued before the subject changed'
      : 'ERR_IDENTITY_TOKEN_REVOKED: the subject no longer exists')
  }

  async function call (fn) {
    const res = await fn()
    if (res && typeof res.error === 'string') throw _fail(res.error)
    return res
  }

  return {
    kind: 'remote',
    async verify (token) {
      let claims
      try {
        claims = verifier.verify(token)
      } catch (err) {
        // A key the Gateway has not seen yet (rotation): fetch the JWKS once, at most every 10 s.
        if (err.code !== 'ERR_IDENTITY_TOKEN_KEY_UNKNOWN' || Date.now() - jwksFetchedAt < 10000) throw err
        await refreshJwks()
        claims = verifier.verify(token)
      }
      await current(claims)
      return identityFromClaims(claims)
    },
    evaluate (identity, request) {
      if (stale()) return Object.freeze({ allowed: false, reason: 'ERR_RBAC_POLICY_STALE', policyVersion: policy.version })
      return policy.evaluate(identity, request)
    },
    allowsSome (identity, request) {
      return !stale() && policy.allowsSome(identity, request)
    },
    policyVersion () {
      return policy.version
    },
    login ({ username, password }) {
      return call(() => client.login(username, password))
    },
    token ({ assertion }) {
      return call(() => client.serviceAccountToken(assertion, { bind: false }))
    },
    refresh ({ refreshToken }) {
      return call(() => client.refreshToken(refreshToken))
    },
    logout ({ refreshToken }) {
      return call(() => client.logout(refreshToken))
    },
    async start () {
      await Promise.all([refreshJwks().catch((err) => debug('jwks fetch failed: %s', err.message)), refreshPolicy()])
      if (!timer) {
        timer = setInterval(refreshPolicy, pollMs)
        if (timer.unref) timer.unref()
      }
    },
    async close () {
      if (timer) clearInterval(timer)
      timer = null
      await client.close().catch(() => {})
    }
  }
}

module.exports = { localAuthority, remoteAuthority }
