'use strict'

const test = require('brittle')
const { parseAllowlist, normalizeKey, CALLER_ACTIONS } = require('../../lib/transport/caller-auth')
const { ACTIONS } = require('../../lib/protocol/actions')

const K1 = 'aa'.repeat(32)
const K2 = 'bb'.repeat(32)

test('caller-auth - entries are keys that may connect, nothing more', (t) => {
  const keys = parseAllowlist([K1, { key: K2 }, Buffer.from(K1, 'hex')])
  t.alike([...keys], [K1, K2])
})

test('caller-auth - empty or missing allowlist admits nobody', (t) => {
  t.is(parseAllowlist([]).size, 0)
  t.is(parseAllowlist(undefined).size, 0)
})

test('caller-auth - invalid keys, and entries with roles, are refused', (t) => {
  t.exception(() => parseAllowlist(['nothex']), /ERR_KERNEL_CALLER_KEY_INVALID/)
  t.exception(() => parseAllowlist([{ key: K1, roles: ['read'] }]), /ERR_KERNEL_CALLER_ROLES_UNSUPPORTED/)
  t.exception(() => parseAllowlist('x'), /ERR_KERNEL_WHITELIST_INVALID/)
  t.is(normalizeKey(Buffer.from(K1, 'hex')), K1)
  t.is(normalizeKey(K1.toUpperCase()), K1)
})

test('caller-auth - worker-bound protocol actions are not caller actions', (t) => {
  t.ok(CALLER_ACTIONS.includes(ACTIONS.COMMAND_REQUEST))
  for (const a of [ACTIONS.IDENTITY_REQUEST, ACTIONS.TELEMETRY_RESPONSE, ACTIONS.HEALTH_PING, ACTIONS.WRITE_CALLS_REQUEST]) t.absent(CALLER_ACTIONS.includes(a), a)
})
