'use strict'

/**
 * @tetherto/mdk-rbac — the policy library behind every way into an MDK stack.
 *
 *   const { compilePolicy } = require('@tetherto/mdk-rbac')
 *   const rbac = compilePolicy(stack.spec.rbac)            // throws on an invalid policy
 *   rbac.evaluate(claims, { resource: 'ops-center/miners', verb: 'list' })
 *   rbac.evaluate(claims, kernelRequest('command.request', 'miner/antminer/antminer-a/AM-001'))
 *
 * Default deny: no matching rule, no bound role, or no policy at all is a refusal.
 */

const { compilePolicy, IDENTITY_KIND, IDENTITY_KINDS, DENY_IDENTITY, DENY_REQUEST, DENY_NO_RULE } = require('./lib/policy')
const { validatePolicy, SUBJECT_KINDS } = require('./lib/validate')
const { appGrant, validateAppPermissions, serviceAccountFor, roleNameFor, permissionsDigest } = require('./lib/app-grant')
const { PolicyStore } = require('./lib/store')
const { routeAccess, routeRequest, routeAccessError, METHOD_VERBS } = require('./lib/routes')
const vocabulary = require('./lib/vocabulary')

module.exports = {
  compilePolicy,
  validatePolicy,
  PolicyStore,
  routeAccess,
  routeRequest,
  routeAccessError,
  METHOD_VERBS,
  appGrant,
  validateAppPermissions,
  serviceAccountFor,
  roleNameFor,
  permissionsDigest,
  IDENTITY_KIND,
  IDENTITY_KINDS,
  SUBJECT_KINDS,
  DENY_IDENTITY,
  DENY_REQUEST,
  DENY_NO_RULE,
  ...vocabulary
}
