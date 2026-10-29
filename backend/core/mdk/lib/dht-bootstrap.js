'use strict'

// Private HyperDHT network for local and air-gapped deployments.
//
// HRPC (Kernel <-> Worker <-> Gateway <-> app runtime <-> clients) always runs
// over HyperDHT, whatever discovery mode is in use. By default every DHT node
// joins the public network through node{1,2,3}.hyperdht.org. A site that must
// not reach those runs its own bootstrap instead, following hyperdht's
// isolated-network pattern: one bootstrap node (`DHT.bootstrapper`) plus at
// least one persistent node, and every MDK component started with that list as
// its `bootstrap` and, optionally, a `dhtHost` to bind (127.0.0.1 on one
// machine, a LAN address on an isolated LAN).
//
// This is plain HyperDHT configuration: no proxy and no other transport.

const net = require('net')
const debug = require('debug')('mdk:dht-bootstrap')

const DEFAULT_PORT = 49737

// hyperdht's public bootstrap set (hyperdht/lib/constants.js BOOTSTRAP_NODES).
const PUBLIC_BOOTSTRAP_HOSTS = new Set([
  'node1.hyperdht.org', 'node2.hyperdht.org', 'node3.hyperdht.org',
  '88.99.3.86', '142.93.90.113', '138.68.147.8'
])

function _hostOf (node) {
  if (node && typeof node === 'object') return String(node.host || '')
  // hyperdht accepts `[suggested-ip@]host:port`.
  const s = String(node)
  const at = s.lastIndexOf('@')
  const hostPort = at === -1 ? s : s.slice(at + 1)
  const ip = at === -1 ? null : s.slice(0, at)
  const host = hostPort.slice(0, hostPort.lastIndexOf(':'))
  return ip && PUBLIC_BOOTSTRAP_HOSTS.has(ip) ? ip : host
}

function _isPublicBootstrap (node) {
  const host = _hostOf(node).toLowerCase()
  return PUBLIC_BOOTSTRAP_HOSTS.has(host) || host.endsWith('.hyperdht.org')
}

/**
 * Normalize a bootstrap list: an array of `'host:port'` / `{ host, port }`, or
 * a comma-separated string (the MDK_DHT_BOOTSTRAP form). Returns `null` for an
 * empty value. Throws ERR_MDK_DHT_BOOTSTRAP_INVALID on a malformed entry and
 * ERR_MDK_DHT_BOOTSTRAP_PUBLIC on a public *.hyperdht.org node — a private list
 * that names one is not private.
 */
function parseBootstrap (value) {
  if (value == null || value === '') return null
  const list = Array.isArray(value)
    ? value
    : String(value).split(',').map((s) => s.trim()).filter(Boolean)
  if (list.length === 0) return null
  return list.map((node) => {
    const entry = node && typeof node === 'object'
      ? `${node.host}:${node.port}`
      : String(node).trim()
    const at = entry.lastIndexOf('@')
    const hostPort = at === -1 ? entry : entry.slice(at + 1)
    const sep = hostPort.lastIndexOf(':')
    const host = sep > 0 ? hostPort.slice(0, sep) : ''
    const port = Number(hostPort.slice(sep + 1))
    if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`ERR_MDK_DHT_BOOTSTRAP_INVALID: "${entry}" is not host:port`)
    }
    if (_isPublicBootstrap(entry)) {
      throw new Error(`ERR_MDK_DHT_BOOTSTRAP_PUBLIC: "${entry}" is a public HyperDHT bootstrap node; a private network lists only its own bootstrap nodes`)
    }
    return entry
  })
}

/** Validate a bind interface: an IPv4/IPv6 literal (`127.0.0.1`, a LAN address). */
function parseDhtHost (value) {
  if (value == null || value === '') return null
  const host = String(value).trim()
  if (!net.isIP(host)) throw new Error(`ERR_MDK_DHT_HOST_INVALID: "${host}" is not an IP address`)
  return host
}

function _isLoopback (ip) {
  return net.isIP(ip) === 4 ? ip.startsWith('127.') : ip === '::1'
}

/**
 * The interface DHT nodes bind for a private network. Without an explicit
 * `host`: loopback when this machine runs the generated bootstrap (no
 * `bootstrap` list), otherwise null — hyperdht then binds every interface, so
 * a bootstrap on another LAN machine stays reachable. Throws
 * ERR_MDK_DHT_HOST_UNREACHABLE when `host` is loopback and the list names a
 * non-loopback address: a socket bound to loopback cannot reach it.
 *
 * @param {string|null} host      - a parseDhtHost() result
 * @param {string[]|null} bootstrap - a parseBootstrap() result
 * @returns {string|null}
 */
function resolveDhtHost (host, bootstrap) {
  if (!bootstrap) return host || '127.0.0.1'
  if (host && _isLoopback(host)) {
    const remote = bootstrap.find((entry) => {
      const ip = _hostOf(entry)
      return net.isIP(ip) && !_isLoopback(ip)
    })
    if (remote) {
      throw new Error(`ERR_MDK_DHT_HOST_UNREACHABLE: a DHT node bound to ${host} cannot reach the bootstrap node ${remote}; set the host to this machine's LAN address, or leave it unset`)
    }
  }
  return host || null
}

/**
 * The private-DHT settings of a service process, from its environment:
 *   MDK_DHT_BOOTSTRAP  comma-separated `host:port` list
 *   MDK_DHT_HOST       interface every DHT node binds
 * Returns `{ bootstrap, dhtHost }` with only the keys that are set, ready to
 * spread into a Worker boot or startGateway().
 */
function dhtFromEnv (env = process.env) {
  const bootstrap = parseBootstrap(env.MDK_DHT_BOOTSTRAP)
  const dhtHost = parseDhtHost(env.MDK_DHT_HOST)
  return {
    ...(bootstrap ? { bootstrap } : {}),
    ...(dhtHost ? { dhtHost } : {})
  }
}

/**
 * Start a private HyperDHT bootstrap: a bootstrap node at `host:port` and
 * `nodes` persistent DHT nodes that join through it (hyperdht needs at least
 * one persistent node for announce/lookup to work).
 *
 * @param {object} [opts]
 * @param {string} [opts.host]     - IPv4 address the bootstrap is reached at and advertised as
 *                                   (default `127.0.0.1`; the machine's LAN or container address otherwise)
 * @param {number} [opts.port]     - UDP port of the bootstrap node (default 49737)
 * @param {string} [opts.bindHost] - Interface to bind when it differs from `host` (default `host`)
 * @param {number} [opts.nodes]    - Persistent nodes to run alongside it (default 2)
 * @returns {Promise<{ bootstrap: string[], host: string, port: number, close: Function }>}
 *   `bootstrap` is the list to hand every MDK component.
 */
async function startDhtBootstrap (opts = {}) {
  const DHT = require('hyperdht')
  const host = opts.host || '127.0.0.1'
  const port = opts.port === undefined ? DEFAULT_PORT : Number(opts.port)
  const bindHost = opts.bindHost || host
  const count = opts.nodes === undefined ? 2 : Number(opts.nodes)
  if (net.isIP(host) !== 4) throw new Error(`ERR_MDK_DHT_HOST_INVALID: the bootstrap host must be an IPv4 address, got "${host}"`)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`ERR_MDK_DHT_PORT_INVALID: ${opts.port}`)
  if (!Number.isInteger(count) || count < 1) throw new Error(`ERR_MDK_DHT_NODES_INVALID: nodes must be at least 1, got ${opts.nodes}`)

  const started = []
  const close = async () => {
    for (const node of started.splice(0).reverse()) {
      try { await node.destroy() } catch {}
    }
  }

  try {
    const bootstrapNode = DHT.bootstrapper(port, host, { host: bindHost })
    started.push(bootstrapNode)
    await bootstrapNode.ready()

    const bootstrap = [`${host}:${port}`]
    for (let i = 0; i < count; i++) {
      const node = new DHT({ ephemeral: false, firewalled: false, bootstrap, host: bindHost })
      started.push(node)
      await node.fullyBootstrapped()
    }
    debug('private DHT bootstrap at %s (%d persistent nodes, bound to %s)', bootstrap[0], count, bindHost)
    return { bootstrap, host, port, close }
  } catch (err) {
    await close()
    throw err
  }
}

module.exports = {
  DEFAULT_PORT,
  parseBootstrap,
  parseDhtHost,
  resolveDhtHost,
  dhtFromEnv,
  startDhtBootstrap
}
