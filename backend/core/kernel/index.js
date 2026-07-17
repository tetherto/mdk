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
 * @param {string[]} [opts.auth.whitelist]       - HRPC firewall allowlist (hex pubkeys)
 * @param {object}  [opts.discovery]
 * @param {string}  [opts.discovery.topic]       - DHT topic hex string
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

  return new KernelManager(conf, ctx)
}

module.exports = { KernelManager, createKernel }
