'use strict'

const { compileGlob } = require('./glob')
const { KERNEL_RESOURCES, GATEWAY_VERBS, ALL_VERBS, isKernelResource } = require('./vocabulary')

// Strict validation of spec.rbac. Every problem is collected and reported at
// once, with its path in mdk.yaml, so an operator fixes the file in one pass.
// A policy that fails validation is never loaded: the caller refuses to boot
// (or keeps the last good version on a live apply).

const ENFORCEMENT = Object.freeze(['deny'])
const SUBJECT_KINDS = Object.freeze(['User', 'Group', 'ServiceAccount'])
const ROLE_NAME = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/
const KERNEL_RESOURCE_NAMES = Object.keys(KERNEL_RESOURCES)

const isMapping = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

function _unknownKeys (obj, allowed, at, errors) {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) errors.push(`${at}.${key}: unknown field`)
  }
}

// A pattern is a non-empty, whitespace-free string with no empty path segment.
function _patternError (p) {
  if (typeof p !== 'string' || p.length === 0) return 'must be a non-empty string'
  if (/\s/.test(p)) return 'must not contain whitespace'
  if (p.startsWith('/') || p.endsWith('/') || p.includes('//')) return 'must not have an empty path segment'
  return null
}

function _patterns (value, at, errors) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${at}: must be a non-empty array`)
    return []
  }
  const ok = []
  value.forEach((p, i) => {
    const err = _patternError(p)
    if (err) errors.push(`${at}[${i}]: ${err}`)
    else ok.push(p)
  })
  return ok
}

// The verbs a resource pattern can ever be requested with: the verbs of each
// Kernel resource it matches, plus the Gateway verbs unless it names exactly a
// Kernel resource.
function _verbsReachable (pattern) {
  const match = compileGlob(pattern)
  const verbs = new Set()
  for (const r of KERNEL_RESOURCE_NAMES) if (match(r)) KERNEL_RESOURCES[r].forEach((v) => verbs.add(v))
  if (!isKernelResource(pattern)) GATEWAY_VERBS.forEach((v) => verbs.add(v))
  return verbs
}

function _rule (rule, at, errors) {
  if (!isMapping(rule)) {
    errors.push(`${at}: must be { resources, verbs, resourceNames? }`)
    return null
  }
  _unknownKeys(rule, ['resources', 'verbs', 'resourceNames'], at, errors)
  const resources = _patterns(rule.resources, `${at}.resources`, errors)

  let verbs = []
  if (!Array.isArray(rule.verbs) || rule.verbs.length === 0) {
    errors.push(`${at}.verbs: must be a non-empty array`)
  } else {
    const reachable = new Set()
    resources.forEach((r) => _verbsReachable(r).forEach((v) => reachable.add(v)))
    rule.verbs.forEach((v, i) => {
      if (v === '*') return
      if (!ALL_VERBS.includes(v)) errors.push(`${at}.verbs[${i}]: unknown verb ${JSON.stringify(v)} (known: ${ALL_VERBS.join(', ')}, *)`)
      else if (resources.length && !reachable.has(v)) errors.push(`${at}.verbs[${i}]: verb "${v}" applies to none of this rule's resources (${resources.join(', ')})`)
    })
    verbs = rule.verbs
  }

  let resourceNames
  if (rule.resourceNames !== undefined) resourceNames = _patterns(rule.resourceNames, `${at}.resourceNames`, errors)

  return { resources, verbs, ...(resourceNames ? { resourceNames } : {}) }
}

function _subject (subject, at, errors) {
  if (!isMapping(subject)) {
    errors.push(`${at}: must be { kind, name }`)
    return null
  }
  _unknownKeys(subject, ['kind', 'name'], at, errors)
  if (!SUBJECT_KINDS.includes(subject.kind)) errors.push(`${at}.kind: must be one of ${SUBJECT_KINDS.join(', ')}`)
  if (typeof subject.name !== 'string' || subject.name.trim() === '' || subject.name.includes('*')) {
    errors.push(`${at}.name: must be a non-empty name without wildcards`)
  }
  return { kind: subject.kind, name: subject.name }
}

/**
 * Validate spec.rbac and return a normalized copy.
 * Throws ERR_RBAC_POLICY_INVALID listing every problem (also on `err.errors`).
 * `undefined`/`null` is a valid, empty policy: it denies everything.
 *
 * @param {object} [rbac] - spec.rbac from mdk.yaml
 * @param {string} [at='spec.rbac'] - path prefix used in error messages
 * @returns {{ enforcement: 'deny', roles: object[], bindings: object[] }}
 */
function validatePolicy (rbac, at = 'spec.rbac') {
  if (rbac === undefined || rbac === null) return { enforcement: 'deny', roles: [], bindings: [] }

  const errors = []
  if (!isMapping(rbac)) _fail([`${at}: must be a mapping`])
  _unknownKeys(rbac, ['enforcement', 'roles', 'bindings'], at, errors)

  if (rbac.enforcement !== undefined && !ENFORCEMENT.includes(rbac.enforcement)) {
    errors.push(`${at}.enforcement: must be "deny" (got ${JSON.stringify(rbac.enforcement)})`)
  }

  const roles = []
  const roleNames = new Set()
  if (rbac.roles !== undefined && !Array.isArray(rbac.roles)) errors.push(`${at}.roles: must be an array`)
  for (const [i, role] of (Array.isArray(rbac.roles) ? rbac.roles : []).entries()) {
    const rat = `${at}.roles[${i}]`
    if (!isMapping(role)) {
      errors.push(`${rat}: must be { name, rules }`)
      continue
    }
    _unknownKeys(role, ['name', 'rules'], rat, errors)
    if (typeof role.name !== 'string' || !ROLE_NAME.test(role.name)) errors.push(`${rat}.name: must match ${ROLE_NAME}`)
    else if (roleNames.has(role.name)) errors.push(`${rat}.name: duplicate role "${role.name}"`)
    else roleNames.add(role.name)

    let rules = []
    if (!Array.isArray(role.rules) || role.rules.length === 0) errors.push(`${rat}.rules: must be a non-empty array`)
    else rules = role.rules.map((r, j) => _rule(r, `${rat}.rules[${j}]`, errors)).filter(Boolean)
    roles.push({ name: role.name, rules })
  }

  const bindings = []
  if (rbac.bindings !== undefined && !Array.isArray(rbac.bindings)) errors.push(`${at}.bindings: must be an array`)
  for (const [i, binding] of (Array.isArray(rbac.bindings) ? rbac.bindings : []).entries()) {
    const bat = `${at}.bindings[${i}]`
    if (!isMapping(binding)) {
      errors.push(`${bat}: must be { role, subjects }`)
      continue
    }
    _unknownKeys(binding, ['role', 'subjects'], bat, errors)
    if (typeof binding.role !== 'string' || !roleNames.has(binding.role)) errors.push(`${bat}.role: no role named ${JSON.stringify(binding.role)}`)

    let subjects = []
    if (!Array.isArray(binding.subjects) || binding.subjects.length === 0) errors.push(`${bat}.subjects: must be a non-empty array`)
    else subjects = binding.subjects.map((s, j) => _subject(s, `${bat}.subjects[${j}]`, errors)).filter(Boolean)
    bindings.push({ role: binding.role, subjects })
  }

  if (errors.length) _fail(errors)
  return { enforcement: 'deny', roles, bindings }
}

function _fail (errors) {
  const err = new Error(`ERR_RBAC_POLICY_INVALID: ${errors.length} problem(s)\n  - ${errors.join('\n  - ')}`)
  err.errors = errors
  throw err
}

module.exports = { validatePolicy, SUBJECT_KINDS }
