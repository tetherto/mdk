'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { TokenIssuer, generateCredential, createAssertion } = require('@tetherto/mdk-identity')
const { PolicyStore } = require('@tetherto/mdk-rbac')
const { KernelAuthorizer } = require('./transport/authorizer')

// Test support: every HRPC caller needs an access token now, so tests that
// talk to a Kernel over HRPC sign in as a service account the policy binds to
// an ordinary wildcard role, exactly as a real stack would. Nothing here is
// used by the Kernel itself.

const FAST_SCRYPT = Object.freeze({ N: 1024, r: 8, p: 1 })
const ADMIN_RULES = Object.freeze([{ resources: ['*'], verbs: ['*'] }])

/** `spec.rbac` binding each named service account to a full-access role. */
function adminPolicy (names = ['test-admin']) {
  return {
    roles: [{ name: 'test-admin', rules: ADMIN_RULES }],
    bindings: [{ role: 'test-admin', subjects: names.map((name) => ({ kind: 'ServiceAccount', name })) }]
  }
}

/**
 * Register a service account on a running KernelManager and bind it to full
 * access. Returns the credential for createMdkClient({ kernelCredential }).
 */
async function grantTestAdmin (kernel, name = 'test-admin') {
  const cred = generateCredential()
  await kernel.identity.upsertServiceAccount({ name, publicKey: cred.publicKey })
  const current = kernel.rbac.info()
  const policy = current && current.policy
  const names = new Set([name])
  for (const b of (policy && policy.bindings) || []) {
    if (b.role === 'test-admin') b.subjects.forEach((s) => names.add(s.name))
  }
  await kernel.rbac.apply(adminPolicy([...names]), { source: 'test' })
  return { name, privateKey: cred.privateKeyPem }
}

/** An unbound access token for `credential`, straight from the issuer: for tests that send raw envelopes. */
async function mintToken (identity, credential) {
  const assertion = createAssertion({ name: credential.name, privateKey: credential.privateKey, audience: identity.issuer })
  return (await identity.token({ assertion })).accessToken
}

/** grantTestAdmin, then an access token for it: put it in `envelope.auth`. */
async function grantTestToken (kernel, name) {
  return mintToken(kernel.identity, await grantTestAdmin(kernel, name))
}

/**
 * A standalone issuer, policy and authorizer for an HRPCListener built by hand
 * (with mock modules). `close()` removes the temporary store.
 */
async function createTestAuth ({ registry = {}, stateMachine, name = 'test-admin', policy } = {}) {
  const Corestore = require('corestore')
  const Hyperbee = require('hyperbee')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-test-auth-'))
  const store = new Corestore(dir)
  const bee = new Hyperbee(store.get({ name: 'auth' }), { keyEncoding: 'utf-8' })
  await bee.ready()

  const identity = new TokenIssuer({ bee: bee.sub('identity'), scryptParams: FAST_SCRYPT })
  await identity.ready()
  const rbac = new PolicyStore({ bee: bee.sub('rbac') })
  const cred = generateCredential()
  await identity.upsertServiceAccount({ name, publicKey: cred.publicKey })
  await rbac.apply(policy || adminPolicy([name]))

  return {
    identity,
    rbac,
    authorizer: new KernelAuthorizer({ identity, rbac, registry, stateMachine }),
    credential: { name, privateKey: cred.privateKeyPem },
    token () {
      return mintToken(identity, { name, privateKey: cred.privateKeyPem })
    },
    async close () {
      await bee.close()
      await store.close()
      fs.rmSync(dir, { recursive: true, force: true })
    }
  }
}

module.exports = { adminPolicy, grantTestAdmin, grantTestToken, mintToken, createTestAuth, FAST_SCRYPT }
