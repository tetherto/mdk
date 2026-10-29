'use strict'

const crypto = require('crypto')

// MQTT CONNACK return code 4: bad user name or password.
const RC_BAD_CREDENTIALS = 4

// Longest credential compared. validateCredentials refuses a configured value
// above this, so the configured side is never truncated by _fixedWidth below.
const MAX_CREDENTIAL_BYTES = 512

/**
 * `value` as a fixed-width buffer: a 4-byte big-endian true length, then the
 * bytes, zero-padded. Fixed width is what timingSafeEqual needs, and the length
 * prefix keeps distinct values distinct once padded.
 *
 * Deliberately not a hash. Hashing to equalize lengths reads to a static
 * analyzer as storing a password with a fast digest, and the rule only accepts
 * a slow KDF. A KDF is the wrong tool here and a denial-of-service risk: these
 * are plaintext credentials held in config, compared against what a client
 * presents on every MQTT CONNECT, so an attacker would choose how often we pay
 * its cost. Padding gives timingSafeEqual what it needs with no digest at all.
 */
function _fixedWidth (value) {
  const src = Buffer.from(value == null ? '' : String(value), 'utf8')
  const out = Buffer.alloc(4 + MAX_CREDENTIAL_BYTES)
  out.writeUInt32BE(src.length, 0)
  src.copy(out, 4, 0, MAX_CREDENTIAL_BYTES)
  return out
}

// Constant-time compare of two in-memory credentials. A presented value longer
// than MAX_CREDENTIAL_BYTES cannot false-match: its true length sits in the
// prefix, and no configured value reaches that length.
function _safeEqual (a, b) {
  return crypto.timingSafeEqual(_fixedWidth(a), _fixedWidth(b))
}

// A credential the fixed-width compare can hold exactly.
function _withinWidth (value) {
  return Buffer.byteLength(value, 'utf8') <= MAX_CREDENTIAL_BYTES
}

/**
 * Throws ERR_MQTT_CREDENTIALS_INVALID unless `credentials` is undefined or a
 * map of containerId -> { username, password } with non-empty strings of at
 * most MAX_CREDENTIAL_BYTES bytes, and unique usernames.
 */
function validateCredentials (credentials) {
  if (credentials === undefined) return
  if (!credentials || typeof credentials !== 'object' || Array.isArray(credentials)) {
    throw new Error('ERR_MQTT_CREDENTIALS_INVALID')
  }
  const usernames = new Set()
  for (const entry of Object.values(credentials)) {
    if (!entry || typeof entry.username !== 'string' || !entry.username ||
        typeof entry.password !== 'string' || !entry.password || usernames.has(entry.username) ||
        !_withinWidth(entry.username) || !_withinWidth(entry.password)) {
      throw new Error('ERR_MQTT_CREDENTIALS_INVALID')
    }
    usernames.add(entry.username)
  }
}

/**
 * Returns the containerId `topic` addresses when it is `<containerId><name>`
 * for one of `names` and a registered container, else null.
 */
function _containerOf (topic, names, containerIds) {
  if (typeof topic !== 'string') return null
  for (const name of names) {
    if (!topic.endsWith(name)) continue
    const containerId = topic.slice(0, -name.length)
    if (containerIds.has(containerId)) return containerId
  }
  return null
}

/**
 * Installs authenticate / authorizePublish / authorizeSubscribe hooks on the
 * embedded aedes broker.
 *
 * Every client is bound to one container: by its credentials when
 * `credentials` is set, otherwise to the first registered container whose
 * telemetry it publishes or command topic it subscribes to. A client may
 * subscribe only to that container's command topics (exact topics, no
 * wildcards, no $SYS). Publishing a command topic, or any topic under another
 * container's prefix, disconnects it; other unknown topics are accepted and
 * reach no subscriber. So it can neither issue commands nor spoof another
 * container's telemetry. The worker's own aedes.publish / aedes.subscribe
 * calls do not pass through these hooks.
 *
 * `containerIds` is read live, so the boot can fill it once devices are known.
 */
function secureBroker (aedes, { containerIds, credentials, telemetryTopics, commandTopics }) {
  const entries = credentials ? Object.entries(credentials) : []
  const containers = new WeakMap()

  function bind (client, containerId) {
    if (!client || !containerId) return false
    if (!containers.has(client)) containers.set(client, containerId)
    return containers.get(client) === containerId
  }

  aedes.authenticate = (client, username, password, cb) => {
    if (!entries.length) return cb(null, true)
    let matched = null
    for (const [containerId, entry] of entries) {
      // Compare every entry so timing does not reveal which username exists.
      const ok = _safeEqual(username, entry.username) & _safeEqual(password, entry.password)
      if (ok && matched === null) matched = containerId
    }
    if (matched === null) {
      const err = new Error('ERR_MQTT_AUTH_FAILED')
      err.returnCode = RC_BAD_CREDENTIALS
      return cb(err, false)
    }
    containers.set(client, matched)
    cb(null, true)
  }

  // Registered container `topic` starts with, preferring the longest id so
  // `D40-10Foo` resolves to D40-10 rather than D40-1.
  function prefixOf (topic) {
    let match = null
    for (const containerId of containerIds) {
      if (topic.startsWith(containerId) && (!match || containerId.length > match.length)) match = containerId
    }
    return match
  }

  aedes.authorizePublish = (client, packet, cb) => {
    const topic = packet.topic
    const deny = () => cb(new Error('ERR_MQTT_PUBLISH_DENIED'))
    if (commandTopics.some((name) => topic.endsWith(name))) return deny()
    const containerId = _containerOf(topic, telemetryTopics, containerIds)
    if (containerId) return bind(client, containerId) ? cb(null) : deny()
    // Any other topic (heartbeat, version, will message, ...) is accepted so a
    // real device is not kicked into a reconnect loop, unless it is under
    // another container's prefix. Nothing can subscribe to it, and retain is
    // dropped so unknown topics do not pile up in the broker.
    const owner = prefixOf(topic)
    const bound = containers.get(client)
    if (owner && bound && owner !== bound) return deny()
    packet.retain = false
    cb(null)
  }

  aedes.authorizeSubscribe = (client, sub, cb) => {
    const containerId = _containerOf(sub.topic, commandTopics, containerIds)
    // A null subscription is refused with SUBACK 128 without dropping the client.
    cb(null, bind(client, containerId) ? sub : null)
  }
}

module.exports = { secureBroker, validateCredentials }
