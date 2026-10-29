'use strict'

const { ACTIONS } = require('../protocol/actions')

/**
 * Caller admission for the Kernel HRPC listener: which transport keys may
 * connect at all. It grants nothing else. What a caller may do is decided per
 * request by its access token and spec.rbac (see authorizer.js), so a key on
 * this list is no more privileged than any other: there are no roles, no
 * full-access entries and no admit-everyone switch.
 *
 * Allowlist entries are hex public keys (or `{ key }`).
 */

/**
 * Every action a caller may send. Anything else (the worker-bound protocol
 * actions) is refused. Each one but sign-in has an RBAC check in
 * @tetherto/mdk-rbac's KERNEL_ACTIONS; a test holds the two lists together.
 */
const CALLER_ACTIONS = Object.freeze([
  ACTIONS.COMMAND_STATUS,
  ACTIONS.TELEMETRY_PULL,
  ACTIONS.STATE_PULL,
  ACTIONS.WORKER_LIST,
  ACTIONS.DEVICE_CAPABILITIES,
  ACTIONS.ACTION_GET,
  ACTIONS.ACTION_GET_BATCH,
  ACTIONS.ACTION_QUERY,
  ACTIONS.COMMAND_REQUEST,
  ACTIONS.COMMAND_CANCEL,
  ACTIONS.COMMAND_LOG,
  ACTIONS.ACTION_PUSH,
  ACTIONS.ACTION_PUSH_BATCH,
  ACTIONS.ACTION_VOTE,
  ACTIONS.ACTION_CANCEL_BATCH,
  ACTIONS.WORKER_TERMINATE,
  ACTIONS.RBAC_GET,
  ACTIONS.RBAC_APPLY,
  ACTIONS.AUTH_LOGIN,
  ACTIONS.AUTH_REFRESH,
  ACTIONS.AUTH_TOKEN,
  ACTIONS.AUTH_LOGOUT,
  ACTIONS.AUTH_JWKS,
  ACTIONS.IDENTITY_USER_LIST,
  ACTIONS.IDENTITY_USER_UPSERT,
  ACTIONS.IDENTITY_USER_DELETE,
  ACTIONS.IDENTITY_SA_LIST,
  ACTIONS.IDENTITY_SA_UPSERT,
  ACTIONS.IDENTITY_SA_DELETE,
  ACTIONS.IDENTITY_KEYS_ROTATE
])

const HEX_KEY = /^[0-9a-f]{64}$/

/**
 * Normalize a public key (hex string or Buffer) to lowercase hex.
 * Throws ERR_KERNEL_CALLER_KEY_INVALID for anything that is not 32 bytes.
 */
function normalizeKey (key) {
  const hex = Buffer.isBuffer(key) ? key.toString('hex') : (typeof key === 'string' ? key.trim().toLowerCase() : '')
  if (!HEX_KEY.test(hex)) throw new Error('ERR_KERNEL_CALLER_KEY_INVALID: expected a 32-byte hex public key')
  return hex
}

/**
 * Parse an allowlist (`whitelist`) into a Set of hex keys. An entry with
 * `roles` is refused: roles no longer exist, and silently dropping them would
 * leave an operator believing a key is limited when only spec.rbac limits it.
 * @param {Array<string|Buffer|{key: string|Buffer}>} entries
 */
function parseAllowlist (entries) {
  const out = new Set()
  if (entries === undefined || entries === null) return out
  if (!Array.isArray(entries)) throw new Error('ERR_KERNEL_WHITELIST_INVALID: whitelist must be an array')
  for (const entry of entries) {
    if (entry && typeof entry === 'object' && !Buffer.isBuffer(entry)) {
      if (entry.roles !== undefined) {
        throw new Error('ERR_KERNEL_CALLER_ROLES_UNSUPPORTED: allowlist entries only admit a key; what it may do is set by spec.rbac')
      }
      out.add(normalizeKey(entry.key))
    } else {
      out.add(normalizeKey(entry))
    }
  }
  return out
}

module.exports = {
  CALLER_ACTIONS,
  normalizeKey,
  parseAllowlist
}
