'use strict'

const test = require('brittle')
const { TokenIssuer, createAssertion, generateCredential, decodeJwt, createVerifier, identityFromClaims } = require('../../index')
const { openBee, clock, issuer } = require('./helpers')

const PASSWORD = 'correct horse battery'
const CALLER = 'cd'.repeat(32)
const code = async (p) => { try { await p } catch (err) { return err.code } return null }
const claimsOf = (tokens) => decodeJwt(tokens.accessToken).claims

test('requires a bee', (t) => {
  t.exception(() => new TokenIssuer(), /ERR_IDENTITY_STORE_BEE_REQUIRED/)
})

test('user login issues an access token carrying email and groups', async (t) => {
  const { iss } = await issuer(t)
  const { created, user } = await iss.upsertUser({ name: 'ankit', email: 'ankit@example.com', groups: ['ops-team', 'ops-team'], password: PASSWORD })
  t.ok(created)
  t.alike(user.groups, ['ops-team'])
  t.ok(user.hasPassword)
  t.absent('passwordHash' in user, 'hashes never leave the issuer')

  const tokens = await iss.login({ username: 'ankit', password: PASSWORD })
  t.is(tokens.tokenType, 'Bearer')
  t.is(tokens.expiresIn, 600)
  const claims = iss.verify(tokens.accessToken)
  t.is(claims.sub, 'ankit')
  t.is(claims.kind, 'user')
  t.is(claims.email, 'ankit@example.com')
  t.alike(claims.groups, ['ops-team'])
  t.alike(identityFromClaims(claims), { kind: 'user', sub: 'ankit', email: 'ankit@example.com', groups: ['ops-team'] })
})

test('wrong password, unknown user and disabled user get the same error', async (t) => {
  const { iss } = await issuer(t)
  await iss.upsertUser({ name: 'ankit', password: PASSWORD })
  await iss.upsertUser({ name: 'off', password: PASSWORD, disabled: true })
  await iss.upsertUser({ name: 'nopass' })
  t.is(await code(iss.login({ username: 'ankit', password: 'wrong password!!' })), 'ERR_IDENTITY_INVALID_CREDENTIALS')
  t.is(await code(iss.login({ username: 'ghost', password: PASSWORD })), 'ERR_IDENTITY_INVALID_CREDENTIALS')
  t.is(await code(iss.login({ username: 'off', password: PASSWORD })), 'ERR_IDENTITY_INVALID_CREDENTIALS')
  t.is(await code(iss.login({ username: 'nopass', password: PASSWORD })), 'ERR_IDENTITY_INVALID_CREDENTIALS')
  t.is(await code(iss.login({})), 'ERR_IDENTITY_INVALID_CREDENTIALS')
})

test('repeated failures lock the name out, growing, then expire', async (t) => {
  const { iss, now } = await issuer(t, { issuer: { throttle: { maxFailures: 3, baseLockSec: 30, maxLockSec: 60 } } })
  await iss.upsertUser({ name: 'ankit', password: PASSWORD })
  for (let i = 0; i < 3; i++) await code(iss.login({ username: 'ankit', password: 'wrong password!!' }))
  t.is(await code(iss.login({ username: 'ankit', password: PASSWORD })), 'ERR_IDENTITY_LOGIN_THROTTLED', 'even the right password')
  now.advance(31)
  t.is(await code(iss.login({ username: 'ankit', password: 'wrong password!!' })), 'ERR_IDENTITY_INVALID_CREDENTIALS')
  now.advance(31)
  t.is(await code(iss.login({ username: 'ankit', password: PASSWORD })), 'ERR_IDENTITY_LOGIN_THROTTLED', 'second lock is longer')
  now.advance(30)
  t.ok(await iss.login({ username: 'ankit', password: PASSWORD }))
})

test('refresh rotates; reusing a refresh token revokes the session', async (t) => {
  const { iss, now } = await issuer(t)
  await iss.upsertUser({ name: 'ankit', groups: ['a'], password: PASSWORD })
  const first = await iss.login({ username: 'ankit', password: PASSWORD })
  now.advance(60)
  await iss.upsertUser({ name: 'ankit', groups: ['a', 'b'] })
  const second = await iss.refresh({ refreshToken: first.refreshToken })
  t.not(second.refreshToken, first.refreshToken)
  t.alike(claimsOf(second).groups, ['a', 'b'], 'claims are rebuilt from the current record')

  now.advance(11) // past the reuse window: a reuse now is theft
  t.is(await code(iss.refresh({ refreshToken: first.refreshToken })), 'ERR_IDENTITY_REFRESH_REUSED')
  t.is(await code(iss.refresh({ refreshToken: second.refreshToken })), 'ERR_IDENTITY_REFRESH_REVOKED', 'the whole family is gone')
})

test('concurrent refreshes of one token: both get the same successor, and the session lives on', async (t) => {
  const { iss, now } = await issuer(t)
  await iss.upsertUser({ name: 'ankit', password: PASSWORD })
  const { refreshToken } = await iss.login({ username: 'ankit', password: PASSWORD })
  const [a, b] = await Promise.all([iss.refresh({ refreshToken }), iss.refresh({ refreshToken })])
  t.is(a.refreshToken, b.refreshToken, 'two tabs end up holding one refresh token')
  t.ok(iss.verify(a.accessToken) && iss.verify(b.accessToken))
  now.advance(60)
  t.ok(await iss.refresh({ refreshToken: a.refreshToken }), 'the session lives on')
})

test('a thief who refreshes first is caught: the victim shares the successor, and the next reuse revokes it all', async (t) => {
  const { iss, now } = await issuer(t)
  await iss.upsertUser({ name: 'ankit', password: PASSWORD })
  const stolen = (await iss.login({ username: 'ankit', password: PASSWORD })).refreshToken

  const thief = await iss.refresh({ refreshToken: stolen })
  now.advance(2)
  const victim = await iss.refresh({ refreshToken: stolen })
  t.is(victim.refreshToken, thief.refreshToken, 'within the window the victim is not logged out')

  // Each then refreshes on its own schedule: whoever is second presents a used token.
  now.advance(240)
  const thiefAgain = await iss.refresh({ refreshToken: thief.refreshToken })
  now.advance(60)
  t.is(await code(iss.refresh({ refreshToken: victim.refreshToken })), 'ERR_IDENTITY_REFRESH_REUSED')
  t.is(await code(iss.refresh({ refreshToken: thiefAgain.refreshToken })), 'ERR_IDENTITY_REFRESH_REVOKED', 'the thief\'s session is gone too')
})

test('a reuse within the window, once the successor was itself used, is theft', async (t) => {
  const { iss, now } = await issuer(t)
  await iss.upsertUser({ name: 'ankit', password: PASSWORD })
  const first = await iss.login({ username: 'ankit', password: PASSWORD })
  const second = await iss.refresh({ refreshToken: first.refreshToken })
  await iss.refresh({ refreshToken: second.refreshToken })
  now.advance(1)
  t.is(await code(iss.refresh({ refreshToken: first.refreshToken })), 'ERR_IDENTITY_REFRESH_REUSED')
})

test('the shared successor is stored sealed, never in the clear', async (t) => {
  const { iss, bee } = await issuer(t)
  await iss.upsertUser({ name: 'ankit', password: PASSWORD })
  const { refreshToken } = await iss.login({ username: 'ankit', password: PASSWORD })
  const next = await iss.refresh({ refreshToken })
  const dump = []
  for await (const node of bee.createReadStream()) dump.push(node.value.toString())
  t.absent(dump.join('\n').includes(next.refreshToken.split('.')[1]), 'the successor secret is not in the store')
})

test('a bound session counts a reuse from another caller key as theft, even within the race window', async (t) => {
  const { iss } = await issuer(t)
  const cred = generateCredential()
  await iss.upsertServiceAccount({ name: 'app:x', publicKey: cred.publicKey })
  const first = await iss.token({ assertion: createAssertion({ name: 'app:x', privateKey: cred.privateKeyPem, now: iss.now }), cnf: CALLER })
  await iss.refresh({ refreshToken: first.refreshToken, cnf: CALLER })
  t.is(await code(iss.refresh({ refreshToken: first.refreshToken, cnf: 'ef'.repeat(32) })), 'ERR_IDENTITY_REFRESH_REUSED')
})

test('refresh tokens and sessions expire', async (t) => {
  const { iss, now } = await issuer(t, { issuer: { refreshTtlSec: 3600, familyTtlSec: 5000 } })
  await iss.upsertUser({ name: 'ankit', password: PASSWORD })
  const a = await iss.login({ username: 'ankit', password: PASSWORD })
  now.advance(3601)
  t.is(await code(iss.refresh({ refreshToken: a.refreshToken })), 'ERR_IDENTITY_REFRESH_EXPIRED')

  const b = await iss.login({ username: 'ankit', password: PASSWORD })
  now.advance(3000)
  const c = await iss.refresh({ refreshToken: b.refreshToken })
  t.ok(c.refreshExpiresIn <= 2000, 'capped at the session lifetime')
  now.advance(2001)
  t.is(await code(iss.refresh({ refreshToken: c.refreshToken })), 'ERR_IDENTITY_REFRESH_EXPIRED')
})

test('malformed and forged refresh tokens are invalid', async (t) => {
  const { iss } = await issuer(t)
  await iss.upsertUser({ name: 'ankit', password: PASSWORD })
  const { refreshToken } = await iss.login({ username: 'ankit', password: PASSWORD })
  const [id] = refreshToken.split('.')
  for (const bad of [undefined, '', 'x', `${id}.${'A'.repeat(43)}`, `${'B'.repeat(22)}.${'A'.repeat(43)}`, `${refreshToken}.x`]) {
    t.is(await code(iss.refresh({ refreshToken: bad })), 'ERR_IDENTITY_REFRESH_INVALID')
  }
})

test('password change, disabling and deletion end sessions', async (t) => {
  const { iss } = await issuer(t)
  for (const [change, expected] of [
    [(i) => i.upsertUser({ name: 'u', password: 'another password!' }), 'ERR_IDENTITY_REFRESH_REVOKED'],
    [(i) => i.upsertUser({ name: 'u', disabled: true }), 'ERR_IDENTITY_REFRESH_REVOKED'],
    [(i) => i.deleteUser('u'), 'ERR_IDENTITY_REFRESH_REVOKED']
  ]) {
    await iss.upsertUser({ name: 'u', password: PASSWORD, disabled: false })
    const { refreshToken } = await iss.login({ username: 'u', password: PASSWORD })
    await change(iss)
    t.is(await code(iss.refresh({ refreshToken })), expected)
  }
  t.absent(await iss.deleteUser('nobody'))
})

test('password change, disabling, deletion and new groups refuse access tokens already issued', async (t) => {
  const { iss } = await issuer(t)
  const verifyCode = (token) => { try { iss.verify(token); return null } catch (err) { return err.code } }
  for (const change of [
    (i) => i.upsertUser({ name: 'u', password: 'another password!' }),
    (i) => i.upsertUser({ name: 'u', disabled: true }),
    (i) => i.upsertUser({ name: 'u', groups: [] }),
    (i) => i.deleteUser('u')
  ]) {
    await iss.upsertUser({ name: 'u', password: PASSWORD, groups: ['ops-team'], disabled: false })
    const { accessToken } = await iss.login({ username: 'u', password: PASSWORD })
    t.is(verifyCode(accessToken), null)
    await change(iss)
    t.is(verifyCode(accessToken), 'ERR_IDENTITY_TOKEN_REVOKED')
  }

  // A group change keeps the session: a refresh issues a token with the new groups.
  await iss.upsertUser({ name: 'u', password: PASSWORD, groups: ['ops-team'] })
  const tokens = await iss.login({ username: 'u', password: PASSWORD })
  await iss.upsertUser({ name: 'u', groups: ['viewers'] })
  const renewed = await iss.refresh({ refreshToken: tokens.refreshToken })
  t.alike(iss.verify(renewed.accessToken).groups, ['viewers'])

  // An unchanged upsert keeps tokens valid; a user created again does not revive old ones.
  await iss.upsertUser({ name: 'u', email: undefined })
  t.is(verifyCode(renewed.accessToken), null, 'no change, no revocation')
  await iss.deleteUser('u')
  await iss.upsertUser({ name: 'u', password: PASSWORD, groups: ['viewers'] })
  t.is(verifyCode(renewed.accessToken), 'ERR_IDENTITY_TOKEN_REVOKED')
})

test('tokenVersions lists every subject with its current version, for remote verifiers', async (t) => {
  const { iss } = await issuer(t)
  await iss.upsertUser({ name: 'u', password: PASSWORD })
  const { accessToken } = await iss.login({ username: 'u', password: PASSWORD })
  const versions = iss.tokenVersions()
  t.is(versions['user:u'], iss.verify(accessToken).ver)
  await iss.deleteUser('u')
  t.absent(Object.hasOwn(iss.tokenVersions(), 'user:u'))
})

test('a new service-account key refuses its access tokens already issued, across a restart', async (t) => {
  const now = clock()
  const { bee } = await openBee(t)
  const { iss } = await issuer(t, { bee, now })
  const a = generateCredential()
  await iss.upsertServiceAccount({ name: 'app:x', publicKey: a.publicKey })
  const { accessToken } = await iss.token({ assertion: createAssertion({ name: 'app:x', privateKey: a.privateKeyPem, now }) })
  const restarted = await issuer(t, { bee, now })
  t.ok(restarted.iss.verify(accessToken), 'versions are loaded at ready()')
  await restarted.iss.upsertServiceAccount({ name: 'app:x', publicKey: generateCredential().publicKey })
  t.exception(() => restarted.iss.verify(accessToken), /ERR_IDENTITY_TOKEN_REVOKED/)
})

test('logout ends the session', async (t) => {
  const { iss } = await issuer(t)
  await iss.upsertUser({ name: 'u', password: PASSWORD })
  const { refreshToken } = await iss.login({ username: 'u', password: PASSWORD })
  t.alike(await iss.logout({ refreshToken }), { revoked: true })
  t.alike(await iss.logout({ refreshToken }), { revoked: false })
  t.alike(await iss.logout({ refreshToken: 'junk' }), { revoked: false })
  t.is(await code(iss.refresh({ refreshToken })), 'ERR_IDENTITY_REFRESH_REVOKED')
})

test('user validation', async (t) => {
  const { iss } = await issuer(t)
  t.is(await code(iss.upsertUser({ name: 'bad name' })), 'ERR_IDENTITY_USER_NAME_INVALID')
  t.is(await code(iss.upsertUser({ name: 'u', email: 'nope' })), 'ERR_IDENTITY_EMAIL_INVALID')
  t.is(await code(iss.upsertUser({ name: 'u', groups: ['ok', 'not ok'] })), 'ERR_IDENTITY_GROUPS_INVALID')
  t.is(await code(iss.upsertUser({ name: 'u', disabled: 'yes' })), 'ERR_IDENTITY_USER_INVALID')
  await t.exception(iss.upsertUser({ name: 'u', password: 'short' }), /ERR_IDENTITY_PASSWORD_WEAK/)

  await iss.upsertUser({ name: 'u', email: 'u@example.com', groups: ['g'], password: PASSWORD })
  const updated = await iss.upsertUser({ name: 'u', email: null })
  t.absent(updated.created)
  t.absent(updated.user.email, 'null clears the email')
  t.alike(updated.user.groups, ['g'], 'unspecified fields are kept')
  t.ok(updated.user.hasPassword)
  t.is((await iss.getUser('u')).name, 'u')
  t.is(await iss.getUser('nobody'), null)
  t.alike((await iss.listUsers()).map((u) => u.name), ['u'])
})

test('service account sign-in with a signed assertion, bound to the caller', async (t) => {
  const { iss } = await issuer(t)
  const cred = generateCredential()
  await iss.upsertServiceAccount({ name: 'app:ops-center', publicKey: cred.publicKey })

  const tokens = await iss.token({ assertion: createAssertion({ name: 'app:ops-center', privateKey: cred.privateKeyPem, now: iss.now }), cnf: CALLER })
  const claims = iss.verify(tokens.accessToken, { cnf: CALLER })
  t.is(claims.kind, 'serviceaccount')
  t.is(claims.sub, 'app:ops-center')
  t.alike(claims.cnf, { hrpc: CALLER })
  t.absent(claims.groups)

  const otherCaller = 'ef'.repeat(32)
  t.exception(() => iss.verify(tokens.accessToken), /ERR_IDENTITY_TOKEN_BINDING/, 'a bound token needs its caller')
  t.exception(() => iss.verify(tokens.accessToken, { cnf: otherCaller }), /ERR_IDENTITY_TOKEN_BINDING/)
  t.is(await code(iss.refresh({ refreshToken: tokens.refreshToken, cnf: otherCaller })), 'ERR_IDENTITY_REFRESH_BINDING')
  const again = await iss.refresh({ refreshToken: tokens.refreshToken, cnf: CALLER })
  t.alike(claimsOf(again).cnf, { hrpc: CALLER }, 'the binding carries over')
})

test('assertions: wrong key, wrong audience, too long, replayed, unknown account', async (t) => {
  const { iss } = await issuer(t)
  const cred = generateCredential()
  const stranger = generateCredential()
  await iss.upsertServiceAccount({ name: 'operator-agent', publicKey: cred.publicKey })
  const make = (o = {}) => createAssertion({ name: 'operator-agent', privateKey: cred.privateKeyPem, now: iss.now, ...o })

  const reason = async (assertion) => { try { await iss.token({ assertion }) } catch (err) { return err.message } return null }
  t.ok((await reason(make({ privateKey: stranger.privateKeyPem }))).includes('ERR_IDENTITY_TOKEN_SIGNATURE'))
  t.ok((await reason(make({ audience: 'someone-else' }))).includes('ERR_IDENTITY_TOKEN_AUDIENCE'))
  t.ok((await reason(make({ ttlSec: 3600 }))).includes('ERR_IDENTITY_TOKEN_CLAIMS'))
  t.ok((await reason(make({ name: 'ghost' }))).includes('unknown service account'))
  t.ok((await reason('not-a-jwt')).includes('ERR_IDENTITY_TOKEN_MALFORMED'))

  const once = make()
  t.ok(await iss.token({ assertion: once }))
  t.ok((await reason(once)).includes('already used'))
  t.ok((await reason(make({ ttlSec: 120 }))).includes('ERR_IDENTITY_TOKEN_CLAIMS'), 'longer than 60 s is refused by default')
})

test('an assertion stays single-use across a restart, and under concurrent use', async (t) => {
  const now = clock()
  const { bee } = await openBee(t)
  const first = await issuer(t, { bee, now })
  const cred = generateCredential()
  await first.iss.upsertServiceAccount({ name: 'operator-agent', publicKey: cred.publicKey })
  const make = () => createAssertion({ name: 'operator-agent', privateKey: cred.privateKeyPem, now })

  const raced = make()
  const results = await Promise.allSettled([first.iss.token({ assertion: raced }), first.iss.token({ assertion: raced })])
  t.is(results.filter((r) => r.status === 'fulfilled').length, 1, 'two overlapping uses mint one session')

  // A new issuer over the same store, as after a Kernel restart: nothing in memory.
  const used = make()
  t.ok(await first.iss.token({ assertion: used }))
  const restarted = await issuer(t, { bee, now })
  t.is(await code(restarted.iss.token({ assertion: used })), 'ERR_IDENTITY_ASSERTION_INVALID', 'still used after a restart')

  now.advance(120)
  t.ok((await restarted.iss.prune()).removed >= 2, 'expired assertion ids are pruned')
})

test('a new service-account key ends the old sessions; sync makes the registry exact', async (t) => {
  const { iss } = await issuer(t)
  const a = generateCredential()
  const b = generateCredential()
  await iss.upsertServiceAccount({ name: 'app:x', publicKey: a.publicKey })
  const { refreshToken } = await iss.token({ assertion: createAssertion({ name: 'app:x', privateKey: a.privateKeyPem, now: iss.now }) })
  t.alike(await iss.upsertServiceAccount({ name: 'app:x', publicKey: a.publicKey.toUpperCase() }).then((r) => r.changed), false, 'same key, case-insensitive')
  await iss.upsertServiceAccount({ name: 'app:x', publicKey: b.publicKey })
  t.is(await code(iss.refresh({ refreshToken })), 'ERR_IDENTITY_REFRESH_REVOKED')

  await iss.upsertServiceAccount({ name: 'old-agent', publicKey: a.publicKey })
  const summary = await iss.syncServiceAccounts([{ name: 'app:x', publicKey: b.publicKey }, { name: 'app:y', publicKey: a.publicKey }])
  t.alike(summary, { added: ['app:y'], updated: [], removed: ['old-agent'] })
  t.alike((await iss.listServiceAccounts()).map((s) => [s.name, s.kind]), [['app:x', 'app'], ['app:y', 'app']])

  t.is(await code(iss.upsertServiceAccount({ name: 'App:X', publicKey: a.publicKey })), 'ERR_IDENTITY_SA_NAME_INVALID')
  await t.exception(iss.upsertServiceAccount({ name: 'app:z', publicKey: 'nothex' }), /ERR_IDENTITY_KEY_INVALID/)
  t.is(await code(iss.syncServiceAccounts('x')), 'ERR_IDENTITY_SA_LIST_INVALID')
})

test('signing key rotation: old tokens verify until they expire, then the key is pruned', async (t) => {
  const { iss, now } = await issuer(t)
  await iss.upsertUser({ name: 'u', password: PASSWORD })
  const before = await iss.login({ username: 'u', password: PASSWORD })
  const oldKid = decodeJwt(before.accessToken).header.kid
  const { kid } = await iss.rotateSigningKey()
  t.not(kid, oldKid)
  t.is(iss.jwks().keys.length, 2)
  t.ok(iss.verify(before.accessToken))
  t.is(decodeJwt((await iss.login({ username: 'u', password: PASSWORD })).accessToken).header.kid, kid)

  now.advance(631)
  t.alike(iss.jwks().keys.map((k) => k.kid), [kid])
  await iss.prune()
  t.is(iss._keys.size, 1)
})

test('keys, users and sessions survive a restart', async (t) => {
  const store = await openBee(t)
  const now = clock()
  const first = await issuer(t, { ...store, now })
  await first.iss.upsertUser({ name: 'u', password: PASSWORD })
  const tokens = await first.iss.login({ username: 'u', password: PASSWORD })
  await first.close()

  const reopened = await openBee(t, store.dir)
  const second = await issuer(t, { ...reopened, now })
  t.ok(second.iss.verify(tokens.accessToken), 'same signing key')
  t.ok(await second.iss.refresh({ refreshToken: tokens.refreshToken }))
})

test('prune drops expired sessions', async (t) => {
  const { iss, now } = await issuer(t, { issuer: { familyTtlSec: 100, refreshTtlSec: 100 } })
  await iss.upsertUser({ name: 'u', password: PASSWORD })
  await iss.login({ username: 'u', password: PASSWORD })
  now.advance(101)
  t.is((await iss.prune()).removed, 2, 'the session and its refresh token')
  let left = 0
  for await (const node of iss.bee.createReadStream()) left += node.key.startsWith('keys/') || node.key.startsWith('meta/') || node.key.startsWith('users/') ? 0 : 1
  t.is(left, 0, 'nothing of the session is left, its index entry included')
})

test('a verifier built from the JWKS checks issuer and audience', async (t) => {
  const { iss } = await issuer(t)
  await iss.upsertUser({ name: 'u', password: PASSWORD })
  const { accessToken } = await iss.login({ username: 'u', password: PASSWORD })
  const jwks = iss.jwks()
  t.is(createVerifier({ jwks, now: iss.now }).verify(accessToken).sub, 'u')
  t.exception(() => createVerifier({ jwks, audience: 'other', now: iss.now }).verify(accessToken), /ERR_IDENTITY_TOKEN_AUDIENCE/)
  t.exception(() => createVerifier({ jwks: { keys: [] }, now: iss.now }).verify(accessToken), /ERR_IDENTITY_TOKEN_KEY_UNKNOWN/)
  t.exception(() => createVerifier(), /ERR_IDENTITY_JWKS_REQUIRED/)
})
