'use strict'

// HTTP hardening for the gateway: which callers reach an `auth: true` route,
// which Host headers are served, and the Fastify-level limits. Every option is
// read from the worker ctx first (what startGateway passes) and then from the
// gateway's common.json, so both programmatic and file-configured gateways get
// the same switches. Defaults are the safe side of each.

const DEFAULT_BODY_LIMIT = 1048576 // 1 MiB, Fastify's own default made explicit
const DEFAULT_RATE_LIMIT = {
  max: 300,
  timeWindow: '1 minute',
  // An ERR_* error, so errorResponse forwards the code instead of masking and
  // logging every 429 as an unexpected failure.
  errorResponseBuilder: (request, context) => Object.assign(new Error('ERR_RATE_LIMITED'), { statusCode: context.statusCode })
}
// Helmet's defaults, minus upgrade-insecure-requests: a UI served from
// staticRootPath over plain http on a LAN address would otherwise have every
// asset rewritten to an https URL nothing answers.
const DEFAULT_HELMET = {
  contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } }
}
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]']
const WILDCARD_BIND = new Set(['0.0.0.0', '::', '[::]'])

// The permission an identity must carry for `?overwriteCache=true` to skip a
// cached response. Only an identity the authVerifier returned can carry it.
const OVERWRITE_CACHE_PERM = 'cache:overwrite'

function _pick (name, conf, ctx) {
  if (ctx && ctx[name] !== undefined) return ctx[name]
  if (conf && conf[name] !== undefined) return conf[name]
  return undefined
}

// Off unless set. Anything Fastify accepts passes through (a hop count, an
// address list); only the CLI's 'true'/'false' strings are turned into booleans.
function _trustProxy (value) {
  if (value === undefined || value === null || value === 'false') return false
  if (value === 'true') return true
  return value
}

// There is no built-in verifier: the loopback one that made every local caller
// the operator ('local') was a bypass of spec.rbac. A Gateway with an authority
// (see authority.js) checks every route against spec.rbac; one without may take
// an integrator's own verifier function for `auth: true` routes.

function resolveSecurityOptions (conf = {}, ctx = {}) {
  // A function from ctx. A name (the removed 'loopback') is refused, loudly, so a
  // config that relied on it does not quietly lose its auth.
  const authVerifier = ctx.authVerifier ?? conf.authVerifier
  if (typeof authVerifier === 'string') {
    throw new Error(`ERR_GATEWAY_AUTH_VERIFIER_INVALID: there are no built-in verifiers ("${authVerifier}" was removed); spec.rbac governs every route of a Gateway started with a Kernel or a gatewayCredential`)
  }
  if (authVerifier != null && typeof authVerifier !== 'function') {
    throw new Error('ERR_GATEWAY_AUTH_VERIFIER_INVALID: authVerifier must be a function')
  }

  // worker.js CLI flags (--allowed-hosts a,b --body-limit 2097152
  // --trust-proxy true) arrive as strings.
  let allowedHosts = _pick('allowedHosts', conf, ctx)
  if (typeof allowedHosts === 'string') allowedHosts = allowedHosts.split(',').map(h => h.trim()).filter(Boolean)
  if (allowedHosts !== undefined && !Array.isArray(allowedHosts)) {
    throw new Error('ERR_GATEWAY_ALLOWED_HOSTS_INVALID: allowedHosts must be an array of host names')
  }

  // buildHostAllowlist turns the Host check off for '*'.
  const hostCheckActive = !(allowedHosts || []).includes('*')

  let bodyLimit = _pick('bodyLimit', conf, ctx) ?? DEFAULT_BODY_LIMIT
  if (typeof bodyLimit === 'string' && /^\d+$/.test(bodyLimit)) bodyLimit = Number(bodyLimit)
  if (!Number.isInteger(bodyLimit) || bodyLimit <= 0) {
    throw new Error('ERR_GATEWAY_BODY_LIMIT_INVALID: bodyLimit must be a positive integer (bytes)')
  }

  const rateLimit = _pick('rateLimit', conf, ctx)
  const helmet = _pick('helmet', conf, ctx)

  return {
    authVerifier: authVerifier || null,
    allowedHosts: allowedHosts || [],
    hostCheckActive,
    trustProxy: _trustProxy(_pick('trustProxy', conf, ctx)),
    bodyLimit,
    // false switches a layer off; an object is merged over the defaults.
    rateLimit: rateLimit === false ? false : { ...DEFAULT_RATE_LIMIT, ...(rateLimit || {}) },
    helmet: helmet === false ? false : { ...DEFAULT_HELMET, ...(helmet || {}) }
  }
}

// Splits a Host header (or an allowlist entry) into a lower-cased hostname and
// an optional port, keeping IPv6 literals bracketed: "[::1]:3000" → ["[::1]", "3000"].
function _splitHost (value) {
  const v = String(value).trim().toLowerCase()
  const m = v.startsWith('[') ? v.match(/^(\[[^\]]*\])(?::(\d+))?$/) : v.match(/^([^:]+)(?::(\d+))?$/)
  if (!m) return null
  return { hostname: m[1], port: m[2] || null }
}

// The Host values this gateway answers to. Loopback on the bound port is always
// in, plus the bound address itself when it is a specific one, plus whatever the
// operator lists. An entry with a port matches only that port; one without
// matches the host on any port (a reverse proxy usually drops :443). '*' turns
// the check off.
function buildHostAllowlist (configured, { port, host } = {}) {
  if (configured.includes('*')) return null

  const entries = LOOPBACK_HOSTS.map(h => `${h}:${port}`)
  if (host && !WILDCARD_BIND.has(host)) {
    entries.push(`${host.includes(':') && !host.startsWith('[') ? `[${host}]` : host}:${port}`)
  }
  entries.push(...configured)

  const list = []
  for (const entry of entries) {
    const parsed = _splitHost(entry)
    if (!parsed) throw new Error(`ERR_GATEWAY_ALLOWED_HOSTS_INVALID: "${entry}"`)
    list.push(parsed)
  }
  return list
}

function isHostAllowed (allowlist, hostHeader) {
  if (allowlist === null) return true
  if (!hostHeader) return false
  const got = _splitHost(hostHeader)
  if (!got) return false
  return allowlist.some(e => e.hostname === got.hostname && (e.port === null || e.port === got.port))
}

// onRequest hook: a request whose Host is not this gateway's is refused before
// routing, which is what stops a DNS-rebound page from reading a localhost
// gateway. request.host honours X-Forwarded-Host only when trustProxy is on.
function createHostCheck (allowlist) {
  return async function hostCheck (request) {
    if (!isHostAllowed(allowlist, request.host)) {
      throw Object.assign(new Error('ERR_GATEWAY_HOST_NOT_ALLOWED'), { statusCode: 403 })
    }
  }
}

function _unauthorized () {
  return Object.assign(new Error('ERR_AUTH_UNAUTHORIZED'), { statusCode: 401 })
}

// Route-level preParsing hook for an `auth: true` route. With no verifier the route is
// closed (401); with one, its truthy return is the caller's identity and becomes
// req._info for the controller. A verifier may throw its own 4xx ERR_* (403 for
// a missing permission, say); anything else it throws fails closed as a 401.
function createAuthHook (authVerifier, routeInfo) {
  return async function authHook (request) {
    if (!authVerifier) throw _unauthorized()

    let identity
    try {
      identity = await authVerifier(request, routeInfo)
    } catch (err) {
      const status = err?.statusCode
      if (Number.isInteger(status) && status >= 400 && status < 500 && /^ERR_/.test(err.message)) throw err
      request.log?.error(err)
      throw _unauthorized()
    }

    if (!identity) throw _unauthorized()
    request._info = typeof identity === 'object' ? identity : {}
    request._authenticated = true
  }
}

function canOverwriteCache (request) {
  if (request._authenticated !== true) return false
  const perms = request._info?.perms
  return Array.isArray(perms) && perms.includes(OVERWRITE_CACHE_PERM)
}

module.exports = {
  DEFAULT_BODY_LIMIT,
  DEFAULT_RATE_LIMIT,
  DEFAULT_HELMET,
  OVERWRITE_CACHE_PERM,
  resolveSecurityOptions,
  buildHostAllowlist,
  isHostAllowed,
  createHostCheck,
  createAuthHook,
  canOverwriteCache
}
