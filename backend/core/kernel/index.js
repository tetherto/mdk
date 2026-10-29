'use strict'

const KernelManager = require('./lib/kernel.manager')

/**
 * Factory for creating a configured, unstarted KernelManager.
 *
 * Caller controls the lifecycle:
 *   const kernel = createKernel({ db, listeners, auth, discovery })
 *   await kernel.init()
 *   await kernel.start()
 *   // ...
 *   await kernel.stop()
 *
 * For a one-call convenience wrapper that also starts and handles SIGINT,
 * use getKernel() from the mdk package instead.
 *
 * @param {object} opts
 * @param {string}  [opts.db]                   - Hyperbee store directory path
 * @param {string}  [opts.root]                 - Config root dir
 * @param {object}  [opts.listeners]
 * @param {object|boolean} [opts.listeners.hrpc] - HRPC config or false to disable
 * @param {object}  [opts.auth]
 * @param {Array<string|{key: string}>} [opts.auth.whitelist] - HRPC caller allowlist: the keys that may
 *                                                connect. Empty (default) admits nobody; add callers at
 *                                                runtime with kernel.allowKey(). What a caller may do is
 *                                                set by its access token and spec.rbac.
 * @param {object|null} [opts.rbac]              - spec.rbac from mdk.yaml, applied at start (null: deny-all).
 *                                                Omit to keep the last applied policy.
 * @param {Array<{name: string, publicKey: string}>} [opts.serviceAccounts] - the exact set of service accounts
 *                                                (apps as `app:<name>`, agents by name) to register at start
 * @param {object}  [opts.identity]               - token issuer settings: issuer, audience, accessTtlSec,
 *                                                refreshTtlSec, familyTtlSec, assertionMaxTtlSec
 * @param {object}  [opts.discovery]
 * @param {string}  [opts.discovery.topic]       - DHT topic hex string
 * @param {string[]} [opts.discovery.workerKeys] - Worker RPC keys accepted from the topic. Empty (default)
 *                                                admits nobody; add Workers at runtime with
 *                                                kernel.allowWorkerKey(), or skip the topic with
 *                                                kernel.registerWorker().
 * @param {boolean} [opts.discovery.allowAnyWorker] - Admit every Worker that announces on the topic
 *                                                (development only; logs a warning)
 * @param {object}  [opts.cadences]
 * @param {number}  [opts.cadences.telemetryPullMs]
 * @param {number}  [opts.cadences.healthPingMs]
 * @param {number}  [opts.cadences.statePullMs]
 * @returns {KernelManager}
 */
function createKernel (opts = {}) {
  const conf = { kernel: {} }

  if (opts.listeners) {
    if (opts.listeners.hrpc === false) {
      conf.kernel.hrpc = false
    } else if (opts.listeners.hrpc) {
      conf.kernel.hrpc = typeof opts.listeners.hrpc === 'object' ? opts.listeners.hrpc : {}
    }
  }

  const hrpcDisabled = conf.kernel.hrpc === false
  if (!hrpcDisabled && opts.auth && opts.auth.whitelist) {
    if (!conf.kernel.hrpc) conf.kernel.hrpc = {}
    conf.kernel.hrpc.whitelist = opts.auth.whitelist
  }
  if (opts.auth && opts.auth.allowAll !== undefined) {
    throw new Error('ERR_KERNEL_ALLOW_ALL_REMOVED: admit callers by key (auth.whitelist, kernel.allowKey)')
  }

  if (opts.discovery) conf.kernel.discovery = opts.discovery

  if (opts.cadences) {
    if (opts.cadences.telemetryPullMs) conf.kernel.telemetryPullMs = opts.cadences.telemetryPullMs
    if (opts.cadences.healthPingMs) conf.kernel.healthPingMs = opts.cadences.healthPingMs
    if (opts.cadences.statePullMs) conf.kernel.statePullMs = opts.cadences.statePullMs
  }

  if (opts.actions) {
    if (opts.actions.actionIntvlMs) conf.kernel.actionIntvlMs = opts.actions.actionIntvlMs
    if (opts.actions.callTargetsLimit) conf.kernel.callTargetsLimit = opts.actions.callTargetsLimit
    if (opts.actions.getWriteCallsLimit) conf.kernel.getWriteCallsLimit = opts.actions.getWriteCallsLimit
  }

  const ctx = { loadConf: () => {} }
  if (opts.db) ctx.storeDir = opts.db
  if (opts.root) ctx.root = opts.root
  if (opts.rbac !== undefined) ctx.rbac = opts.rbac
  if (opts.serviceAccounts !== undefined) ctx.serviceAccounts = opts.serviceAccounts
  if (opts.identity) conf.kernel.identity = opts.identity

  return new KernelManager(conf, ctx)
}

module.exports = { KernelManager, createKernel }
