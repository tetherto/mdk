'use strict'

// The resources and verbs a rule can name. Two domains share one rule shape:
//
//   Kernel  — a fixed set of resources (devices, workers, commands, actions,
//             policy, identities), each with its own verbs. Names are paths: a device is
//             family/brand/worker/device (miner/antminer/antminer-a/AM-001),
//             a worker family/brand/worker.
//   Gateway — every other resource is an app or plugin route, <app>/<path>,
//             with the HTTP-shaped verbs below. The MCP server uses the same
//             vocabulary, because its tools are Gateway routes.
//
// `actions: delegate` lets a caller name the voter of a push or vote (an app
// voting for the user it authenticated); without it the voter is the caller.
//
// A request's verb must belong to its resource's domain, so `viewer` with
// resources ["*"] and verbs [get, list] reads every route and no device.

const KERNEL_RESOURCES = Object.freeze({
  devices: Object.freeze(['read', 'write']),
  workers: Object.freeze(['list', 'read', 'delete']),
  // The write-command log: every command.request attempt and its outcome.
  commands: Object.freeze(['read']),
  actions: Object.freeze(['read', 'write', 'vote', 'delegate']),
  policy: Object.freeze(['read', 'write']),
  identities: Object.freeze(['read', 'write'])
})

const GATEWAY_VERBS = Object.freeze(['get', 'list', 'create', 'update', 'delete'])

const KERNEL_VERBS = Object.freeze([...new Set(Object.values(KERNEL_RESOURCES).flat())])
const ALL_VERBS = Object.freeze([...new Set([...GATEWAY_VERBS, ...KERNEL_VERBS])])

// Every HRPC action the Kernel accepts from a caller, and the check it makes.
// `name` says which resourceName the Kernel resolves before evaluating:
//   device  — the target device, as family/brand/worker/device. A command
//             scoped to a worker or rack is checked once per device it reaches.
//   command — the device the referenced command targets.
//   worker  — the target worker, as family/brand/worker.
//   null    — no instance; a rule with resourceNames never matches.
// An action missing here is refused: the Kernel fails closed on anything new.
const KERNEL_ACTIONS = Object.freeze({
  'telemetry.pull': Object.freeze({ resource: 'devices', verb: 'read', name: 'device' }),
  'state.pull': Object.freeze({ resource: 'devices', verb: 'read', name: 'device' }),
  'device.capabilities': Object.freeze({ resource: 'devices', verb: 'read', name: 'device' }),
  'command.request': Object.freeze({ resource: 'devices', verb: 'write', name: 'device' }),
  'command.status': Object.freeze({ resource: 'devices', verb: 'read', name: 'command' }),
  'command.cancel': Object.freeze({ resource: 'devices', verb: 'write', name: 'command' }),
  'command.log': Object.freeze({ resource: 'commands', verb: 'read', name: null }),
  'worker.list': Object.freeze({ resource: 'workers', verb: 'list', name: null }),
  'worker.terminate': Object.freeze({ resource: 'workers', verb: 'delete', name: 'worker' }),
  'action.get': Object.freeze({ resource: 'actions', verb: 'read', name: null }),
  'action.get-batch': Object.freeze({ resource: 'actions', verb: 'read', name: null }),
  'action.query': Object.freeze({ resource: 'actions', verb: 'read', name: null }),
  'action.push': Object.freeze({ resource: 'actions', verb: 'write', name: null }),
  'action.push-batch': Object.freeze({ resource: 'actions', verb: 'write', name: null }),
  'action.cancel-batch': Object.freeze({ resource: 'actions', verb: 'write', name: null }),
  'action.vote': Object.freeze({ resource: 'actions', verb: 'vote', name: null }),
  'rbac.get': Object.freeze({ resource: 'policy', verb: 'read', name: null }),
  'rbac.apply': Object.freeze({ resource: 'policy', verb: 'write', name: null }),
  'identity.user.list': Object.freeze({ resource: 'identities', verb: 'read', name: null }),
  'identity.user.upsert': Object.freeze({ resource: 'identities', verb: 'write', name: null }),
  'identity.user.delete': Object.freeze({ resource: 'identities', verb: 'write', name: null }),
  'identity.sa.list': Object.freeze({ resource: 'identities', verb: 'read', name: null }),
  'identity.sa.upsert': Object.freeze({ resource: 'identities', verb: 'write', name: null }),
  'identity.sa.delete': Object.freeze({ resource: 'identities', verb: 'write', name: null }),
  'identity.keys.rotate': Object.freeze({ resource: 'identities', verb: 'write', name: null })
})

// Sign-in actions: the caller has no token yet, so there is nothing to
// evaluate. The issuer authenticates them itself (password, signed assertion,
// refresh token), and every other action needs a token.
const PUBLIC_KERNEL_ACTIONS = Object.freeze(['auth.login', 'auth.refresh', 'auth.token', 'auth.logout', 'auth.jwks'])

function isKernelResource (resource) {
  return Object.hasOwn(KERNEL_RESOURCES, resource)
}

// The verbs a concrete request resource accepts.
function verbsFor (resource) {
  return isKernelResource(resource) ? KERNEL_RESOURCES[resource] : GATEWAY_VERBS
}

// An app or plugin name becomes the first segment of its route resources, so
// it must not shadow a Kernel resource. Checked when a package is installed.
function isReservedName (name) {
  return isKernelResource(name)
}

const NAME_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/

function _segment (value, field) {
  if (typeof value !== 'string' || !NAME_SEGMENT.test(value)) {
    throw new Error(`ERR_RBAC_NAME_INVALID: ${field} must be a non-empty name without "/" or "*" (got ${JSON.stringify(value)})`)
  }
  return value
}

function deviceName ({ family, brand, worker, device }) {
  return [_segment(family, 'family'), _segment(brand, 'brand'), _segment(worker, 'worker'), _segment(device, 'device')].join('/')
}

function workerName ({ family, brand, worker }) {
  return [_segment(family, 'family'), _segment(brand, 'brand'), _segment(worker, 'worker')].join('/')
}

/**
 * A contract's display brand ("Antminer", "Schneider Electric") as a name
 * segment: lowercase, runs of anything else collapsed to `-`. Rules name brands
 * this way: `miner/antminer/*`, `power-meter/schneider-electric/*`.
 */
function brandSlug (brand) {
  if (typeof brand !== 'string') return null
  // `[^a-z0-9]+` already collapses each run to one `-`, so the slug can never
  // hold `--` and a single-character strip is enough. `/^-+|-+$/` would scan the
  // same run from every start position, which is quadratic on a long dash run.
  const slug = brand.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return slug || null
}

// The request a Kernel action is evaluated as, or null for an action the
// Kernel does not expose to callers (the caller must then refuse it).
function kernelRequest (action, resourceName) {
  if (!Object.hasOwn(KERNEL_ACTIONS, action)) return null
  const { resource, verb } = KERNEL_ACTIONS[action]
  return resourceName === undefined ? { resource, verb } : { resource, verb, resourceName }
}

module.exports = {
  KERNEL_RESOURCES,
  KERNEL_ACTIONS,
  PUBLIC_KERNEL_ACTIONS,
  KERNEL_VERBS,
  GATEWAY_VERBS,
  ALL_VERBS,
  isKernelResource,
  isReservedName,
  verbsFor,
  deviceName,
  workerName,
  brandSlug,
  kernelRequest
}
