'use strict'

const createLogger = require('debug')
const debug = createLogger('mdk:worker:runtime-v2')
const WorkerRuntime = require('./worker-runtime')
const { loadContract } = require('./contract-loader')
const { createInstance } = require('./instance-loader')

/**
 * Host for a directory-loaded Worker Plugin — an mdk-contract.json plus handler
 * files, with no module to require and no connect() to call:
 *
 *   const runtime = new WorkerRuntimeV2(pkgDir, { workerId, kernelTopic, devices, env, config, storeDir })
 *
 * One HRPC server and one DHT identity for the process regardless of device
 * count, as in v1; what fans out per device is the plugin's module registry.
 * Pass `storeDir` (or `store`) so the DHT/RPC seeds — and therefore the
 * public key published to the Kernel — survive restarts.
 * Each device gets its own instance (see instance-loader.js), so handlers are
 * plain (params) functions that read `{ id, opts, env, config }` from the
 * ambient '@tetherto/mdk-worker/device' instead of taking a ctx argument. The
 * device list is fixed at construction.
 *
 * v1 is inherited whole — deviceId routing, the pull set, envelope wrapping,
 * param normalization, the service built-ins — because the contract's handler
 * table is filled with shims that resolve the addressed device's instance.
 *
 * Two behavior differences from v1: there is no boot-time probe, so every
 * declared device reports `online` and an unreachable one surfaces as an error
 * inside the telemetry payload rather than ERR_DEVICE_UNAVAILABLE; and there is
 * no disconnect, so whatever a plugin opens at load time lives until the
 * process exits.
 *
 * The `health` telemetry channel is v1's: every contract-first plugin gets
 * the per-device { reachable, lastSuccessAt, lastError, lastErrorAt } from
 * its own metrics polls, unless its contract declares a `health` channel.
 */
class WorkerRuntimeV2 extends WorkerRuntime {
  constructor (dir, opts) {
    opts = opts || {}
    if (typeof dir !== 'string' || !dir) throw new Error('ERR_WORKER_DIR_REQUIRED')

    const contract = loadContract(dir)
    // The shims are v1's handler table, so they must be built during super() —
    // before `this` exists. They reach the runtime through this holder.
    const host = {}
    super({
      contract: contract.contract,
      dir,
      connect: _noConnect,
      loadHandler: (file, { section, name }) => (ctx, params) => host.runtime._invoke(section, name, ctx, params)
    }, opts)
    host.runtime = this

    this._dir = dir
    this._entries = contract.entries
    // Resolved by the CLI from mdk.yaml and shared by every device; `config` is
    // the plugin-defined opaque block, device connection details live in opts.
    this._env = Object.freeze({ ...(opts.env || {}) })
    this._config = Object.freeze({ ...(opts.config || {}) })
  }

  async _openContexts () {
    for (const entry of this._devices.values()) {
      if (entry.status === 'online') continue

      const device = Object.freeze({
        id: entry.deviceId,
        opts: Object.freeze({ ...entry.config }),
        env: this._env,
        config: this._config,
        workerId: this.workerId,
        logger: createLogger(`mdk:worker:${this.workerId}:${entry.deviceId}`)
      })
      entry.instance = createInstance({ dir: this._dir, entries: this._entries, device })
      // v1 dispatches fn(ctx, params) and the shim routes on ctx.deviceId; the
      // plugin sees none of this. No `device` key: there is nothing to connect.
      entry.ctx = Object.freeze({ deviceId: entry.deviceId, config: entry.config, services: this.services })
      entry.status = 'online'
      entry.error = null
      debug('instance opened: %s', entry.deviceId)
    }
  }

  _invoke (section, name, ctx, params) {
    const deviceId = ctx ? ctx.deviceId : null
    const entry = this._devices.get(deviceId)
    if (!entry || !entry.instance) throw new Error(`ERR_DEVICE_INSTANCE_MISSING: ${deviceId}`)
    return entry.instance[section].get(name)(params)
  }
}

function _noConnect () {
  throw new Error('ERR_CONNECT_NOT_SUPPORTED')
}

module.exports = WorkerRuntimeV2
