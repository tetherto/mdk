'use strict'

/**
 * A stand-in KernelAuthorizer for router tests: `allow(action)` decides, the
 * identity is `{ kind: 'serviceaccount', sub }` bound to `roles`, and
 * `delegate` grants `actions: delegate`. An envelope with an `actor` token
 * acts for the user named by the token itself, bound to `actorRoles`.
 * `calls` records what was asked.
 */
function fakeAuthorizer ({ allow = () => true, sub = 'app:test', roles = ['test'], actorRoles = ['operator'], delegate = false, canWrite = () => true } = {}) {
  const calls = []
  return {
    calls,
    async authorize (envelope, caller) {
      calls.push({ action: envelope.action, caller: caller && caller.publicKey })
      if (envelope.action.startsWith('auth.')) return { allowed: true, reason: 'sign-in' }
      const actor = envelope.actor ? { kind: 'user', sub: envelope.actor } : null
      const acting = actor ? { actorSub: actor.sub, actorRoles } : {}
      if (!allow(envelope.action)) return { allowed: false, sub, roles, ...acting, error: `ERR_KERNEL_ACTION_FORBIDDEN: ${sub} may not ${envelope.action}` }
      return { allowed: true, sub, roles, ...acting, identity: { kind: 'serviceaccount', sub }, ...(actor ? { actor } : {}) }
    },
    canDelegate: () => delegate,
    canWriteDevice: (_identity, deviceId, actor) => canWrite(deviceId, actor)
  }
}

module.exports = { fakeAuthorizer }
