'use strict'

const crypto = require('crypto')
const { compileGlobs } = require('./glob')
const { validatePolicy } = require('./validate')
const { verbsFor } = require('./vocabulary')

// The one evaluator the Gateway, MCP server and Kernel share. It answers a
// single question: does a binding give this identity a role with a rule that
// covers this request? There is no other way to be allowed: no superadmin, no
// bypass claim (fields like `admin` or `perms` on the identity are ignored),
// and anything malformed is denied rather than thrown.

const IDENTITY_KIND = Object.freeze({ USER: 'user', SERVICEACCOUNT: 'serviceaccount' })
const IDENTITY_KINDS = Object.freeze(Object.values(IDENTITY_KIND))

const DENY_IDENTITY = 'ERR_RBAC_IDENTITY_INVALID'
const DENY_REQUEST = 'ERR_RBAC_REQUEST_INVALID'
const DENY_NO_RULE = 'ERR_RBAC_NO_MATCHING_RULE'

function _concrete (value) {
  return typeof value === 'string' && value.length > 0 && !value.includes('*') && !/\s/.test(value) &&
    !value.startsWith('/') && !value.endsWith('/') && !value.includes('//')
}

function _compileRule (rule) {
  const verbAny = rule.verbs.includes('*')
  const verbs = new Set(rule.verbs)
  return {
    resource: compileGlobs(rule.resources),
    verb: (v) => verbAny || verbs.has(v),
    resourceName: rule.resourceNames ? compileGlobs(rule.resourceNames) : null
  }
}

function _rulesMatch (compiled, request) {
  for (let i = 0; i < compiled.length; i++) {
    const r = compiled[i]
    if (!r.resource(request.resource) || !r.verb(request.verb)) continue
    // A rule scoped to instances never covers a request that names none.
    if (r.resourceName && (request.resourceName === undefined || !r.resourceName(request.resourceName))) continue
    return i
  }
  return -1
}

function _push (index, key, role) {
  if (!index.has(key)) index.set(key, new Set())
  index.get(key).add(role)
}

/**
 * Validate spec.rbac and compile it into an evaluator.
 * Throws ERR_RBAC_POLICY_INVALID (see validatePolicy) for an invalid policy.
 *
 * @param {object} [rbac] - spec.rbac from mdk.yaml; absent means deny-all
 * @returns {Readonly<{ version: string, policy: object, evaluate: Function, allows: Function, allowsSome: Function, rolesFor: Function }>}
 */
function compilePolicy (rbac) {
  const policy = validatePolicy(rbac)
  const version = crypto.createHash('sha256').update(JSON.stringify(policy)).digest('hex').slice(0, 16)

  const roles = new Map(policy.roles.map((r) => [r.name, r.rules.map(_compileRule)]))
  const byUser = new Map()
  const byGroup = new Map()
  const byServiceAccount = new Map()
  for (const b of policy.bindings) {
    for (const s of b.subjects) {
      if (s.kind === 'User') _push(byUser, s.name, b.role)
      else if (s.kind === 'Group') _push(byGroup, s.name, b.role)
      else _push(byServiceAccount, s.name, b.role)
    }
  }

  // Bound role names in policy order, so the decision names a stable role.
  function rolesFor (identity) {
    const bound = new Set()
    if (identity.kind === 'serviceaccount') {
      byServiceAccount.get(identity.sub)?.forEach((r) => bound.add(r))
    } else {
      byUser.get(identity.sub)?.forEach((r) => bound.add(r))
      if (typeof identity.email === 'string') byUser.get(identity.email)?.forEach((r) => bound.add(r))
    }
    if (Array.isArray(identity.groups)) {
      for (const g of identity.groups) if (typeof g === 'string') byGroup.get(g)?.forEach((r) => bound.add(r))
    }
    return policy.roles.map((r) => r.name).filter((n) => bound.has(n))
  }

  /**
   * @param {{ kind: 'user'|'serviceaccount', sub: string, email?: string, groups?: string[] }} identity
   *   - the verified JWT claims
   * @param {{ resource: string, verb: string, resourceName?: string }} request
   * @returns {Readonly<{ allowed: boolean, reason: string, role?: string, rule?: number, policyVersion: string }>}
   */
  function evaluate (identity, request) {
    const deny = (reason) => Object.freeze({ allowed: false, reason, policyVersion: version })
    if (!identity || typeof identity !== 'object' || !IDENTITY_KINDS.includes(identity.kind) || !_concreteSubject(identity.sub)) {
      return deny(DENY_IDENTITY)
    }
    if (!request || typeof request !== 'object' || !_concrete(request.resource) ||
        typeof request.verb !== 'string' || !verbsFor(request.resource).includes(request.verb) ||
        (request.resourceName !== undefined && !_concrete(request.resourceName))) {
      return deny(DENY_REQUEST)
    }
    for (const role of rolesFor(identity)) {
      const rule = _rulesMatch(roles.get(role), request)
      if (rule !== -1) return Object.freeze({ allowed: true, reason: 'matched', role, rule, policyVersion: version })
    }
    return deny(DENY_NO_RULE)
  }

  /**
   * Whether some bound rule covers `resource` and `verb` for at least one
   * instance name, ignoring `resourceNames`: to list a tool or route whose
   * instance is only known per call. Not an authorization; evaluate() the call.
   * @param {object} identity
   * @param {{ resource: string, verb: string }} request
   */
  function allowsSome (identity, request) {
    if (evaluate(identity, request).allowed) return true
    if (!identity || !IDENTITY_KINDS.includes(identity.kind) || !_concreteSubject(identity.sub)) return false
    if (!request || !_concrete(request.resource) || typeof request.verb !== 'string') return false
    for (const role of rolesFor(identity)) {
      for (const r of roles.get(role)) if (r.resource(request.resource) && r.verb(request.verb)) return true
    }
    return false
  }

  return Object.freeze({
    version,
    policy,
    evaluate,
    allows: (identity, request) => evaluate(identity, request).allowed,
    allowsSome,
    rolesFor: (identity) => (identity && IDENTITY_KINDS.includes(identity.kind) && _concreteSubject(identity.sub) ? rolesFor(identity) : [])
  })
}

function _concreteSubject (sub) {
  return typeof sub === 'string' && sub.trim() !== '' && !sub.includes('*')
}

module.exports = {
  compilePolicy,
  IDENTITY_KIND,
  IDENTITY_KINDS,
  DENY_IDENTITY,
  DENY_REQUEST,
  DENY_NO_RULE
}
