'use strict'

const crypto = require('crypto')
const EventEmitter = require('events')
const { signJwt, decodeJwt, verifyJwt } = require('./jwt')
const { generateSigningKey, privateKeyFromJwk, publicKeyFromHex, normalizePublicKey } = require('./keys')
const { hashPassword, verifyPassword, DEFAULT_PARAMS } = require('./passwords')
const { createVerifier } = require('./verifier')

// The token issuer: users sign in with a password, service accounts with an
// assertion signed by their own Ed25519 key. Both get a short-lived access JWT
// and a refresh token that rotates on every use. Presenting a refresh token
// that was already used revokes its whole family (theft detection). Within
// seconds of its use, while its successor is still unused, it gets that same
// successor (two tabs or processes refreshing at once): every holder then has
// one refresh token, and the next reuse of it, by whoever is behind, revokes
// the session as before. Anything else is a refusal that revokes nothing.
//
// Hyperbee layout (utf-8 keys, JSON buffer values):
//   meta/active-kid            → kid of the signing key in use
//   keys/<kid>                 → { kid, createdAt, retiredAt, privateJwk, publicJwk }
//   users/<name>               → { name, email, groups, passwordHash, disabled, tv, ... }
//   sa/<name>                  → { name, kind, publicKey, tv, ... }
//   family/<id>                → { kind, sub, exp, cnf, saKey, revokedAt, reason }
//   refresh/<id>               → { hash, family, exp, usedAt, next }  (next: the successor,
//                                  sealed with a key only the used token's secret derives)
//   subfam/<kind>/<sub>/<id>   → index of a subject's families, for revocation
//   jti/<sa>/<jti>             → { exp } of a used assertion, so it stays single-use across restarts

const USER_NAME = /^[A-Za-z0-9][A-Za-z0-9._@+-]{0,127}$/
const SA_NAME = /^(app:)?[a-z][a-z0-9-]{0,62}$/
const GROUP_NAME = /^[A-Za-z0-9][A-Za-z0-9._@:+-]{0,127}$/
const TOKEN_ID = /^[A-Za-z0-9_-]{22}$/
const TOKEN_SECRET = /^[A-Za-z0-9_-]{43}$/
const JTI = /^[A-Za-z0-9._:-]{8,128}$/

const enc = (v) => Buffer.from(JSON.stringify(v))
const dec = (node) => (node ? JSON.parse(node.value.toString()) : null)
const sha256 = (s) => crypto.createHash('sha256').update(s).digest()

// The successor of a used refresh token, sealed under a key derived from the
// used token's secret: the store never holds it in the clear, and only a
// presenter of the used token can open it.
function _sealKey (id, secret) {
  return Buffer.from(crypto.hkdfSync('sha256', Buffer.from(secret), Buffer.from(id), Buffer.from('mdk-refresh-successor'), 32))
}
function _seal (id, secret, plaintext) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', _sealKey(id, secret), iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return [iv, ct, cipher.getAuthTag()].map((b) => b.toString('base64url')).join('.')
}
function _open (id, secret, sealed) {
  try {
    const [iv, ct, tag] = String(sealed).split('.').map((p) => Buffer.from(p, 'base64url'))
    const decipher = crypto.createDecipheriv('aes-256-gcm', _sealKey(id, secret), iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}
const randomId = (bytes) => crypto.randomBytes(bytes).toString('base64url')

// A subject's token version (`tv`), stamped into its access tokens as `ver`.
// It changes when what a token says, or whether it may be used, changes: a
// new password, disabling, new groups or email, a new service-account key. A
// token whose `ver` is not the subject's current one, or whose subject is
// gone, is refused at once instead of living out its TTL. Random, so a user
// deleted and created again does not revive old tokens.
const newTokenVersion = () => randomId(6)
const _versionKey = (kind, name) => `${kind}:${name}`

function _fail (code, detail) {
  const err = new Error(detail ? `${code}: ${detail}` : code)
  err.code = code
  return err
}

function _userView (u) {
  return {
    name: u.name,
    ...(u.email ? { email: u.email } : {}),
    groups: u.groups || [],
    disabled: !!u.disabled,
    hasPassword: !!u.passwordHash,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt
  }
}

function _saView (s) {
  return { name: s.name, kind: s.kind, publicKey: s.publicKey, createdAt: s.createdAt, updatedAt: s.updatedAt }
}

function _groups (groups) {
  if (groups === undefined) return undefined
  if (!Array.isArray(groups) || groups.some((g) => typeof g !== 'string' || !GROUP_NAME.test(g))) {
    throw _fail('ERR_IDENTITY_GROUPS_INVALID', `groups must be names matching ${GROUP_NAME}`)
  }
  return [...new Set(groups)]
}

class TokenIssuer extends EventEmitter {
  /**
   * @param {object} opts
   * @param {import('hyperbee')} opts.bee - a Hyperbee (or sub) with utf-8 keys
   * @param {string} [opts.issuer='mdk'] - `iss` of every access token, and the audience assertions must name
   * @param {string} [opts.audience='mdk'] - `aud` of every access token
   * @param {number} [opts.accessTtlSec=600]
   * @param {number} [opts.refreshTtlSec=604800] - one refresh token's lifetime (7 days)
   * @param {number} [opts.familyTtlSec=2592000] - a session's absolute lifetime (30 days)
   * @param {number} [opts.assertionMaxTtlSec=60] - the longest service-account assertion accepted
   *   (createAssertion signs for 60 s); a used one is remembered until it expires
   * @param {number} [opts.refreshReuseGraceSec=10] - a used refresh token presented again this soon,
   *   before its successor is used, gets that successor instead of revoking the session
   * @param {{ maxFailures: number, baseLockSec: number, maxLockSec: number }} [opts.throttle]
   * @param {{ N: number, r: number, p: number }} [opts.scryptParams]
   * @param {() => number} [opts.now]
   */
  constructor (opts = {}) {
    super()
    if (!opts.bee) throw new Error('ERR_IDENTITY_STORE_BEE_REQUIRED')
    this.bee = opts.bee
    this.issuer = opts.issuer || 'mdk'
    this.audience = opts.audience || 'mdk'
    this.accessTtlSec = opts.accessTtlSec || 600
    this.refreshTtlSec = opts.refreshTtlSec || 7 * 86400
    this.familyTtlSec = opts.familyTtlSec || 30 * 86400
    this.assertionMaxTtlSec = opts.assertionMaxTtlSec || 60
    this.refreshReuseGraceSec = opts.refreshReuseGraceSec ?? 10
    this.clockSkewSec = 30
    this.throttle = { maxFailures: 5, baseLockSec: 30, maxLockSec: 900, ...(opts.throttle || {}) }
    this.scryptParams = opts.scryptParams || DEFAULT_PARAMS
    this.now = opts.now || Date.now

    this._keys = new Map() // kid → { record, privateKey }
    this._activeKid = null
    this._failures = new Map() // login throttle, name → { count, until }
    this._jtis = new Map() // assertion replay cache, `${sub}:${jti}` → exp (ms)
    this._versions = new Map() // `${kind}:${name}` → current token version, for every subject
    this._locks = new Map()
    this._dummyHash = null
    this.verifier = createVerifier({ jwks: () => this.jwks(), issuer: this.issuer, audience: this.audience, now: () => this.now() })
  }

  _sec () {
    return Math.floor(this.now() / 1000)
  }

  async _get (key) {
    return dec(await this.bee.get(key))
  }

  async _put (key, value) {
    await this.bee.put(key, enc(value))
  }

  async _withLock (key, fn) {
    const prev = this._locks.get(key) || Promise.resolve()
    const run = prev.then(fn, fn)
    const tail = run.catch(() => {})
    this._locks.set(key, tail)
    try {
      return await run
    } finally {
      if (this._locks.get(key) === tail) this._locks.delete(key)
    }
  }

  // ─── Signing keys ───────────────────────────────────────────────

  /** Load the signing keys (creating the first one), and drop expired sessions. */
  async ready () {
    for await (const node of this.bee.createReadStream({ gte: 'keys/', lt: 'keys/\xff' })) {
      const record = dec(node)
      this._keys.set(record.kid, { record, privateKey: privateKeyFromJwk(record.privateJwk) })
    }
    for await (const node of this.bee.createReadStream({ gte: 'users/', lt: 'users/\xff' })) {
      const u = dec(node)
      this._versions.set(_versionKey('user', u.name), u.tv)
    }
    for await (const node of this.bee.createReadStream({ gte: 'sa/', lt: 'sa/\xff' })) {
      const sa = dec(node)
      this._versions.set(_versionKey('serviceaccount', sa.name), sa.tv)
    }
    const active = await this._get('meta/active-kid')
    if (active && this._keys.has(active)) this._activeKid = active
    else await this.rotateSigningKey()
    // An unknown user still costs one scrypt run, so timing does not reveal which names exist.
    this._dummyHash = await hashPassword(randomId(24), this.scryptParams)
    await this.prune()
  }

  /** Start signing with a new key. The old one stays in the JWKS until its last token expires. */
  async rotateSigningKey () {
    const nowIso = new Date(this.now()).toISOString()
    const { kid, privateJwk, publicJwk } = generateSigningKey()
    const record = { kid, createdAt: nowIso, retiredAt: null, privateJwk, publicJwk }
    const batch = this.bee.batch()
    const previous = this._activeKid && this._keys.get(this._activeKid)
    if (previous) {
      previous.record = { ...previous.record, retiredAt: nowIso }
      await batch.put(`keys/${previous.record.kid}`, enc(previous.record))
    }
    await batch.put(`keys/${kid}`, enc(record))
    await batch.put('meta/active-kid', enc(kid))
    await batch.flush()
    this._keys.set(kid, { record, privateKey: privateKeyFromJwk(privateJwk) })
    this._activeKid = kid
    this.emit('keys-rotated', kid)
    return { kid }
  }

  _published (record) {
    if (!record.retiredAt) return true
    return Date.parse(record.retiredAt) + (this.accessTtlSec + this.clockSkewSec) * 1000 > this.now()
  }

  /** Public keys verifiers accept: the active key, and retired ones until their last token expires. */
  jwks () {
    return { keys: [...this._keys.values()].filter((k) => this._published(k.record)).map((k) => k.record.publicJwk) }
  }

  // ─── Users ──────────────────────────────────────────────────────

  /**
   * Create or update a user. `password` sets a new one; omit it to keep the
   * current one. Disabling a user, or changing their password, ends their sessions.
   */
  async upsertUser ({ name, email, groups, password, disabled } = {}) {
    if (typeof name !== 'string' || !USER_NAME.test(name)) throw _fail('ERR_IDENTITY_USER_NAME_INVALID', `must match ${USER_NAME}`)
    if (email !== undefined && email !== null && (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+$/.test(email))) {
      throw _fail('ERR_IDENTITY_EMAIL_INVALID')
    }
    if (disabled !== undefined && typeof disabled !== 'boolean') throw _fail('ERR_IDENTITY_USER_INVALID', 'disabled must be a boolean')
    const normalizedGroups = _groups(groups)
    const passwordHash = password !== undefined ? await hashPassword(password, this.scryptParams) : undefined

    return this._withLock(`user:${name}`, async () => {
      const nowIso = new Date(this.now()).toISOString()
      const existing = await this._get(`users/${name}`)
      const user = {
        name,
        email: email === null ? undefined : (email ?? existing?.email),
        groups: normalizedGroups ?? existing?.groups ?? [],
        passwordHash: passwordHash ?? existing?.passwordHash ?? null,
        disabled: disabled ?? existing?.disabled ?? false,
        tv: existing?.tv,
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso
      }
      const endsSessions = existing && (passwordHash || (user.disabled && !existing.disabled))
      // New groups or email change what a token grants: its holder refreshes to get the new claims.
      const changesClaims = existing && (user.email !== existing.email || String(user.groups) !== String(existing.groups || []))
      if (!existing || endsSessions || changesClaims) user.tv = newTokenVersion()
      await this._put(`users/${name}`, user)
      this._versions.set(_versionKey('user', name), user.tv)
      if (endsSessions) {
        await this._revokeSubject('user', name, passwordHash ? 'password-changed' : 'disabled')
      }
      return { created: !existing, user: _userView(user) }
    })
  }

  async deleteUser (name) {
    const existing = await this._get(`users/${name}`)
    if (!existing) return false
    await this.bee.del(`users/${name}`)
    this._versions.delete(_versionKey('user', name))
    await this._revokeSubject('user', name, 'deleted')
    return true
  }

  async getUser (name) {
    const u = await this._get(`users/${name}`)
    return u ? _userView(u) : null
  }

  async listUsers () {
    const out = []
    for await (const node of this.bee.createReadStream({ gte: 'users/', lt: 'users/\xff' })) out.push(_userView(dec(node)))
    return out
  }

  // ─── Service accounts ───────────────────────────────────────────

  /**
   * Register a service account's public key: `app:<name>` for an app, any
   * other name for an agent. A new key ends the sessions of the old one.
   */
  async upsertServiceAccount ({ name, publicKey } = {}) {
    if (typeof name !== 'string' || !SA_NAME.test(name)) throw _fail('ERR_IDENTITY_SA_NAME_INVALID', `must match ${SA_NAME}`)
    const key = normalizePublicKey(publicKey)
    return this._withLock(`sa:${name}`, async () => {
      const nowIso = new Date(this.now()).toISOString()
      const existing = await this._get(`sa/${name}`)
      if (existing && existing.publicKey === key) return { created: false, changed: false, serviceAccount: _saView(existing) }
      const sa = { name, kind: name.startsWith('app:') ? 'app' : 'agent', publicKey: key, tv: newTokenVersion(), createdAt: existing?.createdAt || nowIso, updatedAt: nowIso }
      await this._put(`sa/${name}`, sa)
      this._versions.set(_versionKey('serviceaccount', name), sa.tv)
      if (existing) await this._revokeSubject('serviceaccount', name, 'key-changed')
      return { created: !existing, changed: true, serviceAccount: _saView(sa) }
    })
  }

  async deleteServiceAccount (name) {
    const existing = await this._get(`sa/${name}`)
    if (!existing) return false
    await this.bee.del(`sa/${name}`)
    this._versions.delete(_versionKey('serviceaccount', name))
    await this._revokeSubject('serviceaccount', name, 'deleted')
    return true
  }

  async listServiceAccounts () {
    const out = []
    for await (const node of this.bee.createReadStream({ gte: 'sa/', lt: 'sa/\xff' })) out.push(_saView(dec(node)))
    return out
  }

  /**
   * Make the registered service accounts exactly `list` (the stack's apps and
   * agents, read from this instance's credentials at boot).
   * @param {Array<{ name: string, publicKey: string }>} list
   */
  async syncServiceAccounts (list) {
    if (!Array.isArray(list)) throw _fail('ERR_IDENTITY_SA_LIST_INVALID')
    const wanted = new Set()
    const summary = { added: [], updated: [], removed: [] }
    for (const sa of list) {
      const res = await this.upsertServiceAccount(sa)
      wanted.add(sa.name)
      if (res.created) summary.added.push(sa.name)
      else if (res.changed) summary.updated.push(sa.name)
    }
    for (const sa of await this.listServiceAccounts()) {
      if (!wanted.has(sa.name) && await this.deleteServiceAccount(sa.name)) summary.removed.push(sa.name)
    }
    return summary
  }

  // ─── Sign-in ────────────────────────────────────────────────────

  _throttled (name) {
    const f = this._failures.get(name)
    return f && f.until > this.now() ? Math.ceil((f.until - this.now()) / 1000) : 0
  }

  _recordFailure (name) {
    const f = this._failures.get(name) || { count: 0, until: 0 }
    f.count += 1
    if (f.count >= this.throttle.maxFailures) {
      const lockSec = Math.min(this.throttle.baseLockSec * 2 ** (f.count - this.throttle.maxFailures), this.throttle.maxLockSec)
      f.until = this.now() + lockSec * 1000
    }
    this._failures.set(name, f)
    if (this._failures.size > 10000) {
      for (const [k, v] of this._failures) if (v.until <= this.now() && v.count < this.throttle.maxFailures) this._failures.delete(k)
    }
  }

  /**
   * Password sign-in. Unknown users, wrong passwords and disabled users get the
   * same error. Repeated failures lock the name out for a growing interval.
   */
  async login ({ username, password } = {}) {
    if (typeof username !== 'string' || typeof password !== 'string' || !USER_NAME.test(username)) {
      throw _fail('ERR_IDENTITY_INVALID_CREDENTIALS')
    }
    const wait = this._throttled(username)
    if (wait) throw _fail('ERR_IDENTITY_LOGIN_THROTTLED', `retry in ${wait}s`)

    const user = await this._get(`users/${username}`)
    const ok = await verifyPassword(password, user?.passwordHash || this._dummyHash)
    if (!user || !user.passwordHash || user.disabled || !ok) {
      this._recordFailure(username)
      throw _fail('ERR_IDENTITY_INVALID_CREDENTIALS')
    }
    this._failures.delete(username)
    return this._issue({ kind: 'user', subject: user })
  }

  /**
   * Service-account sign-in (RFC 7523 style): `assertion` is a JWT the
   * account signs with its own key, `{ iss: name, sub: name, aud: <issuer>,
   * iat, exp, jti }`, valid for at most `assertionMaxTtlSec`, used once.
   * `cnf`, the caller's transport key, binds the tokens to that caller.
   */
  async token ({ assertion, cnf } = {}) {
    let decoded
    try {
      decoded = decodeJwt(assertion)
    } catch (err) {
      throw _fail('ERR_IDENTITY_ASSERTION_INVALID', err.code)
    }
    const name = decoded.claims.iss
    const sa = typeof name === 'string' && SA_NAME.test(name) ? await this._get(`sa/${name}`) : null
    if (!sa) throw _fail('ERR_IDENTITY_ASSERTION_INVALID', 'unknown service account')

    let claims
    try {
      claims = verifyJwt(assertion, {
        keyFor: () => publicKeyFromHex(sa.publicKey),
        audience: this.issuer,
        maxLifetimeSec: this.assertionMaxTtlSec,
        now: this.now
      })
    } catch (err) {
      throw _fail('ERR_IDENTITY_ASSERTION_INVALID', err.code)
    }
    if (claims.sub !== name) throw _fail('ERR_IDENTITY_ASSERTION_INVALID', 'sub must equal iss')
    if (typeof claims.jti !== 'string' || !JTI.test(claims.jti)) throw _fail('ERR_IDENTITY_ASSERTION_INVALID', 'jti is required')

    // Single use: remembered in memory and in the store (a restart must not
    // make a captured assertion good again), checked and set under one lock.
    const nowMs = this.now()
    for (const [k, exp] of this._jtis) if (exp <= nowMs) this._jtis.delete(k)
    const replayKey = `${name}:${claims.jti}`
    const storeKey = `jti/${name}/${claims.jti}`
    const exp = (claims.exp + this.clockSkewSec) * 1000
    await this._withLock(storeKey, async () => {
      const seen = this._jtis.has(replayKey) || ((await this._get(storeKey))?.exp ?? 0) > nowMs
      if (seen) throw _fail('ERR_IDENTITY_ASSERTION_INVALID', 'assertion already used')
      this._jtis.set(replayKey, exp)
      await this._put(storeKey, { exp })
    })

    return this._issue({ kind: 'serviceaccount', subject: sa, cnf: cnf ? normalizePublicKey(cnf) : undefined })
  }

  _parseRefresh (refreshToken) {
    const [id, secret, extra] = typeof refreshToken === 'string' ? refreshToken.split('.') : []
    if (extra !== undefined || !TOKEN_ID.test(id || '') || !TOKEN_SECRET.test(secret || '')) return null
    return { id, secret }
  }

  async _subjectFor (family) {
    if (family.kind === 'user') {
      const user = await this._get(`users/${family.sub}`)
      return user && user.passwordHash && !user.disabled ? user : null
    }
    const sa = await this._get(`sa/${family.sub}`)
    return sa && sa.publicKey === family.saKey ? sa : null
  }

  /**
   * Trade a refresh token for new tokens. The token is used up: presenting it
   * again revokes the session. A session bound to a transport key refreshes
   * only from that key (`cnf`).
   */
  async refresh ({ refreshToken, cnf } = {}) {
    const parsed = this._parseRefresh(refreshToken)
    if (!parsed) throw _fail('ERR_IDENTITY_REFRESH_INVALID')
    return this._withLock(`refresh:${parsed.id}`, async () => {
      const rec = await this._get(`refresh/${parsed.id}`)
      if (!rec || !crypto.timingSafeEqual(sha256(parsed.secret), Buffer.from(rec.hash, 'base64url'))) {
        throw _fail('ERR_IDENTITY_REFRESH_INVALID')
      }
      const family = await this._get(`family/${rec.family}`)
      if (!family || family.revokedAt) throw _fail('ERR_IDENTITY_REFRESH_REVOKED')
      const nowSec = this._sec()
      if (rec.usedAt) {
        const shared = await this._sharedSuccessor(parsed, rec, family, cnf)
        if (shared) return shared
        await this._revokeFamily(rec.family, family, 'reuse')
        this.emit('refresh-reused', { kind: family.kind, sub: family.sub })
        throw _fail('ERR_IDENTITY_REFRESH_REUSED', 'the session was revoked')
      }
      if (rec.exp <= nowSec || family.exp <= nowSec) throw _fail('ERR_IDENTITY_REFRESH_EXPIRED')
      if (family.cnf && family.cnf !== (typeof cnf === 'string' ? cnf.toLowerCase() : null)) throw _fail('ERR_IDENTITY_REFRESH_BINDING')

      const subject = await this._subjectFor(family)
      if (!subject) {
        await this._revokeFamily(rec.family, family, 'subject-gone')
        throw _fail('ERR_IDENTITY_REFRESH_REVOKED')
      }
      const tokens = await this._issue({ kind: family.kind, subject, cnf: family.cnf, familyId: rec.family, family })
      await this._put(`refresh/${parsed.id}`, { ...rec, usedAt: new Date(this.now()).toISOString(), next: _seal(parsed.id, parsed.secret, tokens.refreshToken) })
      return tokens
    })
  }

  // A used refresh token presented again within refreshReuseGraceSec of its
  // use, from the session's binding, while its successor is still unused: two
  // clients refreshing at once. It gets the same successor (and a new access
  // token), so both hold one refresh token; whoever presents it second, later,
  // revokes the session. Null when any of that does not hold (then it is theft).
  async _sharedSuccessor (parsed, rec, family, cnf) {
    if (!rec.next || this.now() - Date.parse(rec.usedAt) >= this.refreshReuseGraceSec * 1000) return null
    if (family.cnf && family.cnf !== (typeof cnf === 'string' ? cnf.toLowerCase() : null)) return null
    const successor = _open(parsed.id, parsed.secret, rec.next)
    const next = successor && this._parseRefresh(successor)
    const nextRec = next && await this._get(`refresh/${next.id}`)
    const nowSec = this._sec()
    if (!nextRec || nextRec.usedAt || nextRec.family !== rec.family || nextRec.exp <= nowSec) return null
    const subject = await this._subjectFor(family)
    if (!subject) return null
    return {
      tokenType: 'Bearer',
      accessToken: this._accessToken({ kind: family.kind, subject, cnf: family.cnf }),
      expiresIn: this.accessTtlSec,
      refreshToken: successor,
      refreshExpiresIn: nextRec.exp - nowSec
    }
  }

  /** End the session a refresh token belongs to. */
  async logout ({ refreshToken } = {}) {
    const parsed = this._parseRefresh(refreshToken)
    if (!parsed) return { revoked: false }
    const rec = await this._get(`refresh/${parsed.id}`)
    if (!rec || !crypto.timingSafeEqual(sha256(parsed.secret), Buffer.from(rec.hash, 'base64url'))) return { revoked: false }
    const family = await this._get(`family/${rec.family}`)
    if (!family || family.revokedAt) return { revoked: false }
    await this._revokeFamily(rec.family, family, 'logout')
    return { revoked: true }
  }

  /** Verify an access token this issuer signed (see createVerifier). */
  /**
   * Every subject's current token version, `{ '<kind>:<name>': ver | null }`
   * (null: a record from before token versions). A verifier in another process
   * (a remote Gateway or MCP server) holds a copy, so it refuses a token the
   * issuer would: one whose `ver` differs, or whose subject is not listed.
   */
  tokenVersions () {
    const out = {}
    for (const [key, ver] of this._versions) out[key] = ver ?? null
    return out
  }

  /**
   * Verify an access token and that it is still current: its subject exists
   * and its `ver` is the subject's token version (see newTokenVersion).
   * Throws ERR_IDENTITY_TOKEN_REVOKED otherwise.
   */
  verify (accessToken, opts) {
    const claims = this.verifier.verify(accessToken, opts)
    const key = _versionKey(claims.kind, claims.sub)
    if (!this._versions.has(key)) throw _fail('ERR_IDENTITY_TOKEN_REVOKED', 'the subject no longer exists')
    if (claims.ver !== this._versions.get(key)) throw _fail('ERR_IDENTITY_TOKEN_REVOKED', 'issued before the subject changed')
    return claims
  }

  // ─── Internals ──────────────────────────────────────────────────

  _accessToken ({ kind, subject, cnf }) {
    const active = this._keys.get(this._activeKid)
    if (!active) throw _fail('ERR_IDENTITY_NOT_READY', 'call ready() first')
    const iat = this._sec()
    const claims = {
      iss: this.issuer,
      aud: this.audience,
      sub: subject.name,
      kind,
      iat,
      exp: iat + this.accessTtlSec,
      jti: randomId(12),
      ...(subject.tv ? { ver: subject.tv } : {}),
      ...(kind === 'user' && subject.email ? { email: subject.email } : {}),
      ...(kind === 'user' && subject.groups && subject.groups.length ? { groups: subject.groups } : {}),
      ...(cnf ? { cnf: { hrpc: cnf } } : {})
    }
    return signJwt(claims, active.privateKey, { kid: active.record.kid })
  }

  async _issue ({ kind, subject, cnf, familyId, family }) {
    const iat = this._sec()
    const accessToken = this._accessToken({ kind, subject, cnf })

    const batch = this.bee.batch()
    if (!familyId) {
      familyId = randomId(16)
      family = {
        kind,
        sub: subject.name,
        createdAt: new Date(this.now()).toISOString(),
        exp: iat + this.familyTtlSec,
        ...(cnf ? { cnf } : {}),
        ...(kind === 'serviceaccount' ? { saKey: subject.publicKey } : {}),
        revokedAt: null
      }
      await batch.put(`family/${familyId}`, enc(family))
      await batch.put(`subfam/${kind}/${subject.name}/${familyId}`, enc(1))
    }
    const id = randomId(16)
    const secret = randomId(32)
    const exp = Math.min(iat + this.refreshTtlSec, family.exp)
    await batch.put(`refresh/${id}`, enc({ hash: sha256(secret).toString('base64url'), family: familyId, exp, usedAt: null }))
    await batch.flush()

    return {
      tokenType: 'Bearer',
      accessToken,
      expiresIn: this.accessTtlSec,
      refreshToken: `${id}.${secret}`,
      refreshExpiresIn: exp - iat
    }
  }

  async _revokeFamily (id, family, reason) {
    await this._put(`family/${id}`, { ...family, revokedAt: new Date(this.now()).toISOString(), reason })
  }

  async _revokeSubject (kind, sub, reason) {
    const prefix = `subfam/${kind}/${sub}/`
    for await (const node of this.bee.createReadStream({ gte: prefix, lt: `${prefix}\xff` })) {
      const id = node.key.slice(prefix.length)
      const family = await this._get(`family/${id}`)
      if (family && !family.revokedAt) await this._revokeFamily(id, family, reason)
    }
  }

  /** Delete expired refresh tokens, sessions and used assertions, and signing keys no verifier needs any more. */
  async prune () {
    const nowSec = this._sec()
    const batch = this.bee.batch()
    let removed = 0
    const deadFamilies = new Set()
    for await (const node of this.bee.createReadStream({ gte: 'family/', lt: 'family/\xff' })) {
      const f = dec(node)
      if (f.exp <= nowSec) {
        const id = node.key.slice('family/'.length)
        deadFamilies.add(id)
        await batch.del(node.key)
        await batch.del(`subfam/${f.kind}/${f.sub}/${id}`)
        removed++
      }
    }
    for await (const node of this.bee.createReadStream({ gte: 'refresh/', lt: 'refresh/\xff' })) {
      const r = dec(node)
      if (r.exp <= nowSec || deadFamilies.has(r.family)) {
        await batch.del(node.key)
        removed++
      }
    }
    const nowMs = this.now()
    for await (const node of this.bee.createReadStream({ gte: 'jti/', lt: 'jti/\xff' })) {
      if ((dec(node)?.exp ?? 0) <= nowMs) {
        await batch.del(node.key)
        removed++
      }
    }
    for (const [kid, k] of this._keys) {
      if (kid !== this._activeKid && !this._published(k.record)) {
        await batch.del(`keys/${kid}`)
        this._keys.delete(kid)
        removed++
      }
    }
    await batch.flush()
    return { removed }
  }
}

module.exports = { TokenIssuer, USER_NAME, SA_NAME }
