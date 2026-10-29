'use strict'

const { validateFull: validateEnvelope } = require('../protocol/envelope')
const { ACTIONS } = require('../protocol/actions')

// Approval identity. An app acting for an operator (a verified `actor` token)
// votes as that operator. Otherwise a caller granted `actions: delegate` (an app
// voting for the user it authenticated) names the voter in the payload; any
// other caller votes as its own identity, so one account cannot pose as several
// voters to satisfy reqVotes > 1. In-process calls (no caller) keep the payload
// voter.
function _voterFor (payload, auth) {
  if (!auth) return payload.voter
  if (auth.actor) return auth.actor.sub
  if (payload.voter && auth.authorizer.canDelegate(auth.identity)) return payload.voter
  return auth.identity.sub
}

function _withVoter (payload, auth) {
  return { ...payload, voter: _voterFor(payload, auth) }
}

/**
 * Shared envelope routing for Kernel listeners (HRPC).
 *
 * `caller` is set by a transport that authenticated the peer:
 * `{ publicKey: hex }`. A request from a caller is authorized by
 * `deps.authorizer` (access token in `envelope.auth`, evaluated against
 * spec.rbac), and the token's identity replaces self-asserted identity
 * (requester, non-delegate voter). With an `envelope.actor` token (an app
 * acting for the operator its Gateway route authenticated) both must be
 * allowed, and the operator is the requester and voter, recorded `via` the app. Without a caller (in-process calls) every
 * action is allowed. A caller with no authorizer to check it is refused.
 *
 * @param {object} envelope
 * @param {object} deps
 * @param {import('../modules/command-dispatcher')} deps.dispatcher
 * @param {import('../modules/telemetry-collector')} deps.telemetryCollector
 * @param {import('../modules/worker-registry')} deps.registry
 * @param {import('../modules/action-manager')} deps.actionManager
 * @param {import('@tetherto/mdk-rbac').PolicyStore} [deps.rbac]
 * @param {import('@tetherto/mdk-identity').TokenIssuer} [deps.identity]
 * @param {import('./authorizer').KernelAuthorizer} [deps.authorizer]
 */
async function routeEnvelope (envelope, deps, caller) {
  const validation = validateEnvelope(envelope)
  if (!validation.valid) return { error: validation.error }

  let auth = null
  let requester
  if (caller) {
    if (!deps.authorizer) return { error: 'ERR_KERNEL_NO_AUTHORIZER' }
    const decision = await deps.authorizer.authorize(envelope, caller)
    // Who asked, for the write-command log: the token's subject (else the
    // transport key) and the roles spec.rbac binds to it; with an operator,
    // the operator, via the app that acted for them.
    const callerId = decision.sub || caller.publicKey
    requester = decision.actorSub
      ? { requesterId: decision.actorSub, roles: decision.actorRoles || [], via: { requesterId: callerId, roles: decision.roles || [] } }
      : { requesterId: callerId, roles: decision.roles || [] }
    if (!decision.allowed) {
      // Every command.request attempt is logged, refused ones included.
      if (envelope.action === ACTIONS.COMMAND_REQUEST) await deps.dispatcher.recordAttempt(envelope, requester, { error: decision.error })
      return { error: decision.error }
    }
    if (decision.identity) auth = { identity: decision.identity, actor: decision.actor || null, authorizer: deps.authorizer }
  }

  const { dispatcher, telemetryCollector, registry, actionManager, rbac } = deps
  // The devices an action push resolves to are only known once workers answer:
  // check each then, and again for each vote on the stored action.
  const pushOpts = auth ? { canWrite: (deviceId) => auth.authorizer.canWriteDevice(auth.identity, deviceId, auth.actor) } : undefined

  if (envelope.action.startsWith('auth.') || envelope.action.startsWith('identity.')) {
    return _routeIdentity(envelope, deps.identity, caller)
  }

  switch (envelope.action) {
    case ACTIONS.COMMAND_REQUEST:
      return dispatcher.dispatch(envelope, requester)
    case ACTIONS.COMMAND_STATUS:
      return dispatcher.getStatus(envelope.payload && envelope.payload.commandId)
    case ACTIONS.COMMAND_CANCEL:
      return dispatcher.cancel(envelope.payload && envelope.payload.commandId)
    case ACTIONS.COMMAND_LOG:
      return dispatcher.getLog(envelope.payload)
    case ACTIONS.TELEMETRY_PULL:
      return telemetryCollector.pull(
        envelope.deviceId,
        envelope.payload && envelope.payload.query
      )
    case ACTIONS.STATE_PULL:
      return telemetryCollector.pullState(envelope.deviceId)
    case ACTIONS.WORKER_LIST:
      return { workers: registry.listWorkers() }
    case ACTIONS.DEVICE_CAPABILITIES:
      return { capabilities: registry.getCapabilities(envelope.deviceId) }
    case ACTIONS.WORKER_TERMINATE: {
      const { workerId } = envelope.payload || {}
      if (!workerId) return { error: 'ERR_WORKER_ID_REQUIRED' }
      await registry.terminate(workerId)
      return { status: 'TERMINATED', workerId }
    }
    case ACTIONS.ACTION_PUSH:
      return actionManager.pushAction(_withVoter(envelope.payload, auth), pushOpts)
    case ACTIONS.ACTION_PUSH_BATCH:
      return actionManager.pushActionsBatch(_withVoter(envelope.payload, auth), pushOpts)
    case ACTIONS.ACTION_GET:
      return actionManager.getAction(envelope.payload)
    case ACTIONS.ACTION_GET_BATCH:
      return actionManager.getActionsBatch(envelope.payload)
    case ACTIONS.ACTION_QUERY:
      return actionManager.queryActions(envelope.payload)
    case ACTIONS.ACTION_VOTE:
      return actionManager.voteAction(_withVoter(envelope.payload, auth), pushOpts)
    case ACTIONS.ACTION_CANCEL_BATCH:
      return actionManager.cancelActionsBatch(_withVoter(envelope.payload, auth))
    case ACTIONS.RBAC_GET:
      if (!rbac) return { error: 'ERR_KERNEL_NO_RBAC' }
      // With the policy, every subject's token version: a Gateway or MCP server
      // in another process polls this, and refuses tokens the issuer would.
      return { record: rbac.info(), ...(deps.identity ? { tokenVersions: deps.identity.tokenVersions() } : {}) }
    case ACTIONS.RBAC_APPLY: {
      if (!rbac) return { error: 'ERR_KERNEL_NO_RBAC' }
      try {
        const { changed, record } = await rbac.apply(envelope.payload.rbac, {
          source: 'apply',
          ...(auth ? { by: (auth.actor || auth.identity).sub } : {}),
          ...(auth && auth.actor ? { via: auth.identity.sub } : {})
        })
        return { changed, version: record.version, appliedAt: record.appliedAt, ...(changed ? { previous: record.previous } : {}) }
      } catch (err) {
        // A refused policy leaves the one in force untouched; hand back every problem.
        return { error: err.message, ...(err.errors ? { errors: err.errors } : {}) }
      }
    }
    default:
      return { error: `ERR_UNKNOWN_ACTION: ${envelope.action}` }
  }
}

// The token issuer's actions. Its errors are part of the reply (`{ error }`),
// like a refused policy; nothing a caller sent (a password) is echoed back.
async function _routeIdentity (envelope, identity, caller) {
  if (!identity) return { error: 'ERR_KERNEL_NO_IDENTITY' }
  const p = envelope.payload || {}
  const callerKey = caller ? caller.publicKey : undefined
  try {
    switch (envelope.action) {
      case ACTIONS.AUTH_LOGIN:
        return await identity.login({ username: p.username, password: p.password })
      case ACTIONS.AUTH_REFRESH:
        return await identity.refresh({ refreshToken: p.refreshToken, cnf: callerKey })
      case ACTIONS.AUTH_TOKEN:
        // A service account's tokens are bound to the HRPC caller that signed in,
        // unless it asks for bearer tokens to hand to another channel (an agent's HTTP client).
        return await identity.token({ assertion: p.assertion, cnf: p.bind === false ? undefined : callerKey })
      case ACTIONS.AUTH_LOGOUT:
        return await identity.logout({ refreshToken: p.refreshToken })
      case ACTIONS.AUTH_JWKS:
        return identity.jwks()
      case ACTIONS.IDENTITY_USER_LIST:
        return { users: await identity.listUsers() }
      case ACTIONS.IDENTITY_USER_UPSERT:
        return await identity.upsertUser({ name: p.name, email: p.email, groups: p.groups, password: p.password, disabled: p.disabled })
      case ACTIONS.IDENTITY_USER_DELETE:
        return { deleted: await identity.deleteUser(p.name) }
      case ACTIONS.IDENTITY_SA_LIST:
        return { serviceAccounts: await identity.listServiceAccounts() }
      case ACTIONS.IDENTITY_SA_UPSERT:
        return await identity.upsertServiceAccount({ name: p.name, publicKey: p.publicKey })
      case ACTIONS.IDENTITY_SA_DELETE:
        return { deleted: await identity.deleteServiceAccount(p.name) }
      case ACTIONS.IDENTITY_KEYS_ROTATE:
        return await identity.rotateSigningKey()
      default:
        return { error: `ERR_UNKNOWN_ACTION: ${envelope.action}` }
    }
  } catch (err) {
    return { error: err.message }
  }
}

module.exports = { routeEnvelope }
