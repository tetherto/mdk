'use strict'

const EventEmitter = require('events')
const debug = require('debug')('mdk:kernel:authz')
const { KERNEL_ACTIONS, PUBLIC_KERNEL_ACTIONS, deviceName, workerName } = require('@tetherto/mdk-rbac')
const { identityFromClaims } = require('@tetherto/mdk-identity')

/**
 * Authorization for every HRPC request the Kernel serves.
 *
 *   1. Sign-in actions (auth.*) pass: the issuer authenticates them itself.
 *   2. Every other action needs an access token in `envelope.auth`, issued by
 *      this Kernel and, when bound, bound to the caller's transport key.
 *   3. With `envelope.actor`, the operator's access token (an app acting for the
 *      user its Gateway route authenticated) must be a current user token from
 *      this issuer, bound to no transport key.
 *   4. The token's identity, and the operator's, is evaluated against the
 *      spec.rbac in force; both must be allowed. Each is evaluated as the
 *      action's resource and verb (KERNEL_ACTIONS) for each instance it touches:
 *      a device as family/brand/worker/device, a worker as family/brand/worker.
 *      A command scoped to a worker or rack is checked for every device the
 *      worker owns; a command referenced by id is checked against its target.
 *
 * Anything that cannot be resolved (an unknown device, a worker not ready yet)
 * is evaluated without an instance name, so a rule scoped by resourceNames
 * never matches it. Every decision is emitted as a 'decision' event.
 */
class KernelAuthorizer extends EventEmitter {
  /**
   * @param {object} deps
   * @param {import('@tetherto/mdk-identity').TokenIssuer} deps.identity
   * @param {import('@tetherto/mdk-rbac').PolicyStore} deps.rbac
   * @param {object} deps.registry - WorkerRegistry: resolveWorkerForDevice, nameParts, devicesOf
   *   (a registry without them resolves no names, so only unscoped rules match)
   * @param {object} [deps.stateMachine] - CommandStateMachine: getState, for command.status / command.cancel
   */
  constructor ({ identity, rbac, registry, stateMachine }) {
    super()
    this.identity = identity
    this.rbac = rbac
    this.registry = registry
    this.stateMachine = stateMachine || null
  }

  _deviceName (deviceId) {
    if (!deviceId) return undefined
    const resolved = this.registry.resolveWorkerForDevice?.(deviceId)
    const parts = resolved && this.registry.nameParts?.(resolved.workerId)
    if (!parts) return undefined
    try {
      return deviceName({ ...parts, device: deviceId })
    } catch {
      return undefined // an id that cannot be a name segment: unscoped rules only
    }
  }

  _workerName (workerId) {
    const parts = workerId && this.registry.nameParts?.(workerId)
    return parts ? workerName(parts) : undefined
  }

  /** Every device a worker owns, by name; [undefined] when it owns none or is unknown. */
  _workerDevices (workerId) {
    const names = (this.registry.devicesOf?.(workerId) || []).map((d) => this._deviceName(d))
    return names.length ? names : [undefined]
  }

  async _names (spec, envelope) {
    const p = envelope.payload || {}
    switch (spec.name) {
      case 'device':
        if (envelope.action === 'command.request' && (p.scope === 'worker' || p.scope === 'rack')) return this._workerDevices(p.workerId)
        return [this._deviceName(envelope.deviceId)]
      case 'command': {
        const state = this.stateMachine && p.commandId ? await this.stateMachine.getState(p.commandId) : null
        if (!state) return [undefined]
        return state.scope === 'worker' || state.scope === 'rack' ? this._workerDevices(state.workerId) : [this._deviceName(state.deviceId)]
      }
      case 'worker':
        return [this._workerName(p.workerId)]
      default:
        return [undefined]
    }
  }

  _decide (identity, envelope, result, actor) {
    const policy = this.rbac.current()
    const decision = {
      action: envelope.action,
      kind: identity && identity.kind,
      sub: identity && identity.sub,
      // The roles spec.rbac binds to the caller, for the write-command log.
      ...(identity ? { roles: policy.rolesFor(identity) } : {}),
      // The operator the caller acts for, once their token verified.
      ...(actor ? { actorSub: actor.sub, actorRoles: policy.rolesFor(actor) } : {}),
      ...result
    }
    debug('%s %s%s %s %s', decision.allowed ? 'allow' : 'deny', decision.actorSub ? `${decision.actorSub} via ` : '', decision.sub || '-', decision.action, decision.reason)
    this.emit('decision', decision)
    return decision
  }

  // The first instance `identity` may not act on, as a refusal; null when it may act on all.
  _refusal (policy, identity, spec, names) {
    for (const resourceName of names) {
      const request = { resource: spec.resource, verb: spec.verb, ...(resourceName ? { resourceName } : {}) }
      const d = policy.evaluate(identity, request)
      if (!d.allowed) {
        return {
          reason: d.reason,
          policyVersion: d.policyVersion,
          resource: spec.resource,
          ...(resourceName ? { resourceName } : {}),
          target: resourceName ? `${spec.resource} ${resourceName}` : spec.resource
        }
      }
    }
    return null
  }

  // The operator a caller acts for: a user's access token from this issuer,
  // current, and bound to no transport key (a service account's token, or one
  // bound to another caller, never stands in for an operator).
  _actor (token) {
    const claims = this.identity.verify(token)
    if (claims.kind !== 'user' || claims.cnf) throw Object.assign(new Error('not a user token'), { code: 'ERR_IDENTITY_TOKEN_CLAIMS' })
    return identityFromClaims(claims)
  }

  /**
   * With `envelope.actor` (an app acting for the operator its Gateway route
   * authenticated), the operator is verified and evaluated too: the action is
   * allowed only when spec.rbac allows both the caller and the operator.
   *
   * @param {object} envelope - a validated request envelope
   * @param {{ publicKey: string }} caller - the HRPC caller
   * @returns {Promise<{ allowed: boolean, identity?: object, actor?: object, reason: string, error?: string }>}
   */
  async authorize (envelope, caller) {
    if (PUBLIC_KERNEL_ACTIONS.includes(envelope.action)) return this._decide(null, envelope, { allowed: true, reason: 'sign-in' })

    if (!envelope.auth) {
      return this._decide(null, envelope, { allowed: false, reason: 'no-token', error: `ERR_KERNEL_TOKEN_REQUIRED: ${envelope.action} needs an access token` })
    }
    let claims
    try {
      claims = this.identity.verify(envelope.auth, { cnf: caller && caller.publicKey })
    } catch (err) {
      return this._decide(null, envelope, { allowed: false, reason: 'bad-token', error: `ERR_KERNEL_TOKEN_INVALID: ${err.code || err.message}` })
    }
    const identity = identityFromClaims(claims)

    let actor = null
    if (envelope.actor) {
      try {
        actor = this._actor(envelope.actor)
      } catch (err) {
        return this._decide(identity, envelope, { allowed: false, reason: 'bad-actor', error: `ERR_KERNEL_ACTOR_INVALID: ${err.code || err.message}` })
      }
    }

    const spec = KERNEL_ACTIONS[envelope.action]
    if (!spec) return this._decide(identity, envelope, { allowed: false, reason: 'unmapped', error: `ERR_KERNEL_ACTION_FORBIDDEN: ${envelope.action}` }, actor)

    const policy = this.rbac.current()
    const names = await this._names(spec, envelope)
    const refused = this._refusal(policy, identity, spec, names)
    if (refused) {
      const { target, ...rest } = refused
      return this._decide(identity, envelope, { allowed: false, ...rest, error: `ERR_KERNEL_ACTION_FORBIDDEN: ${identity.sub} may not ${spec.verb} ${target}` }, actor)
    }
    if (actor) {
      const actorRefused = this._refusal(policy, actor, spec, names)
      if (actorRefused) {
        const { target, ...rest } = actorRefused
        return this._decide(identity, envelope, { allowed: false, ...rest, error: `ERR_KERNEL_ACTION_FORBIDDEN: ${actor.sub} (via ${identity.sub}) may not ${spec.verb} ${target}` }, actor)
      }
    }
    return this._decide(identity, envelope, { allowed: true, reason: 'matched', identity, ...(actor ? { actor } : {}), policyVersion: policy.version, resource: spec.resource }, actor)
  }

  /**
   * Whether `identity` (and the operator it acts for, if any) may write the
   * device: for checking the devices an action push resolves to.
   */
  canWriteDevice (identity, deviceId, actor) {
    const resourceName = this._deviceName(deviceId)
    const request = { resource: 'devices', verb: 'write', ...(resourceName ? { resourceName } : {}) }
    const policy = this.rbac.current()
    return policy.allows(identity, request) && (!actor || policy.allows(actor, request))
  }

  /** Whether `identity` may name another voter (`actions: delegate`). */
  canDelegate (identity) {
    return this.rbac.current().allows(identity, { resource: 'actions', verb: 'delegate' })
  }
}

module.exports = { KernelAuthorizer }
