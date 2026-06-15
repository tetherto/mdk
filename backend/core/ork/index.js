'use strict'

const OrkManager = require('./lib/ork.manager')

/**
 * Factory for creating a configured, unstarted OrkManager.
 *
 * Caller controls the lifecycle:
 *   const ork = createORK({ db, gateways, auth, discovery })
 *   await ork.init()
 *   await ork.start()
 *   // ...
 *   await ork.stop()
 *
 * For a one-call convenience wrapper that also starts and handles SIGINT,
 * use getOrk() from the mdk package instead.
 *
 * @param {object} opts
 * @param {string}  [opts.db]                   - Hyperbee store directory path
 * @param {string}  [opts.root]                 - Config root dir
 * @param {object}  [opts.gateways]
 * @param {object|boolean} [opts.gateways.hrpc] - HRPC config or false to disable
 * @param {object|boolean} [opts.gateways.ipc]  - IPC config or false to disable
 * @param {object}  [opts.auth]
 * @param {string[]} [opts.auth.whitelist]       - HRPC firewall allowlist (hex pubkeys)
 * @param {object}  [opts.discovery]
 * @param {string}  [opts.discovery.topic]       - DHT topic hex string
 * @param {object}  [opts.cadences]
 * @param {number}  [opts.cadences.telemetryPullMs]
 * @param {number}  [opts.cadences.healthPingMs]
 * @param {number}  [opts.cadences.statePullMs]
 * @returns {OrkManager}
 */
function createORK (opts = {}) {
  const conf = { ork: {} }

  if (opts.gateways) {
    if (opts.gateways.hrpc === false) {
      conf.ork.hrpc = false
    } else if (opts.gateways.hrpc) {
      conf.ork.hrpc = typeof opts.gateways.hrpc === 'object' ? opts.gateways.hrpc : {}
    }
    if (opts.gateways.ipc && opts.gateways.ipc !== false) {
      conf.ork.ipc = opts.gateways.ipc
    }
  }

  const hrpcDisabled = conf.ork.hrpc === false
  if (!hrpcDisabled && opts.auth && opts.auth.whitelist) {
    if (!conf.ork.hrpc) conf.ork.hrpc = {}
    conf.ork.hrpc.whitelist = opts.auth.whitelist
  }

  if (opts.discovery) conf.ork.discovery = opts.discovery

  if (opts.cadences) {
    if (opts.cadences.telemetryPullMs) conf.ork.telemetryPullMs = opts.cadences.telemetryPullMs
    if (opts.cadences.healthPingMs) conf.ork.healthPingMs = opts.cadences.healthPingMs
    if (opts.cadences.statePullMs) conf.ork.statePullMs = opts.cadences.statePullMs
  }

  const ctx = { loadConf: () => {} }
  if (opts.db) ctx.storeDir = opts.db
  if (opts.root) ctx.root = opts.root

  return new OrkManager(conf, ctx)
}

module.exports = { OrkManager, createORK }
