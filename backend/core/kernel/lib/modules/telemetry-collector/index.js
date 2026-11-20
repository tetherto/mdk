'use strict'

const debug = require('debug')('mdk:kernel:telemetry')
const { mergeStats, tallyStats } = require('@tetherto/mdk-stats')
const { getOp, OP_NAMES } = require('@tetherto/mdk-stats/ops')
const { isSafeKey } = require('@tetherto/mdk-stats/utils')
const { ACTIONS, MESSAGE_TYPES } = require('../../protocol/actions')
const { build: buildEnvelope } = require('../../protocol/envelope')

// Query types answered per worker (deviceId null) and merged here; any other
// type a caller sends with `query.workers` is handed back per worker, unmerged.
const WORKER_QUERY_TYPES = new Set(['snapshot', 'aggregate'])

// An aggregate spec the Kernel can fold: each safe-named op is a stats op
// with a merge, and the nested ops array_obj_calc / nested_obj_concat merge
// with are `{ src, op: 'sum' }`. The worker validates sources and types
// against its own contract.
function _mergeableOps (ops) {
  if (!ops || typeof ops !== 'object' || Array.isArray(ops) || !Object.keys(ops).length) return false
  return Object.entries(ops).every(([name, spec]) => {
    if (!isSafeKey(name) || !spec || typeof spec !== 'object' || typeof spec.op !== 'string') return false
    if (!OP_NAMES.includes(spec.op) || !getOp(spec.op).merge) return false
    if (spec.op === 'array_obj_calc') return _nestedOps(spec.objOps)
    if (spec.op === 'nested_obj_concat') return _nestedOps(spec.nestedOps)
    return true
  })
}

function _nestedOps (items) {
  return Array.isArray(items) && items.length > 0 &&
    items.every(item => item && typeof item.src === 'string' && isSafeKey(item.src) && item.op === 'sum')
}

/**
 * Telemetry Collector
 *
 * Proxy: routes telemetry queries from Gateway to the owning worker.
 * Kernel does NOT store telemetry — workers own their telemetry storage.
 * Not strictly stateless: _subscribers holds deviceId → Set<callback> in
 * process for fan-out, but nothing it keeps is persisted or recovered.
 *
 * Three modes:
 * 1. Scheduler-driven pull: fan out telemetry.pull to every Ready worker
 *    that does not collect its own telemetry (registry `pollsTelemetry`);
 *    subscribers are notified by these live pulls only, never by a
 *    polling worker's own sweeps
 * 2. On-demand query: Gateway requests telemetry for a specific device
 * 3. On-demand worker-level fan-out: one telemetry.pull per listed worker.
 *    `snapshot` answers are merged as the workers returned them; `aggregate`
 *    answers are each worker's pre-tally accumulators, folded with mdk-stats
 *    and tallied once; any other type (a Worker store builtin such as `list`
 *    or `logs`) is handed back per worker as the Worker answered it. The
 *    Kernel never sees raw metrics and computes none.
 */
class TelemetryCollector {
  constructor (opts) {
    this.registry = opts.registry
    this.workerChannel = opts.workerChannel
    this._subscribers = new Map()
    this._kernelId = 'kernel:kernel:default'
  }

  // A per-device read answers `{ error }` when there is nothing to read, as a
  // command does: ERR_DEVICE_NOT_FOUND (no Worker owns the device),
  // ERR_WORKER_NOT_ROUTABLE (its Worker has not connected since the Kernel
  // started), ERR_WORKER_UNREACHABLE (the send failed or timed out), or the
  // Worker's own refusal. SICK and DEAD Workers are still asked.
  async pull (deviceId, query) {
    const { payload, error } = await this._pullDevice(deviceId, ACTIONS.TELEMETRY_PULL, { deviceId, query: query || {} })
    if (!payload) return { error }
    this._notifySubscribers(deviceId, payload)
    return payload
  }

  async _pullDevice (deviceId, action, body) {
    const resolution = this.registry.resolveWorkerForDevice(deviceId)
    if (!resolution) return { error: 'ERR_DEVICE_NOT_FOUND' }
    if (!resolution.channel) return { error: 'ERR_WORKER_NOT_ROUTABLE' }

    const envelope = buildEnvelope({ action, type: MESSAGE_TYPES.REQUEST, sender: this._kernelId, deviceId, payload: body })

    let response
    try {
      response = await this.workerChannel.send(resolution.channel, envelope)
    } catch (err) {
      debug('%s failed for %s: %s', action, deviceId, err.message)
      return { error: 'ERR_WORKER_UNREACHABLE' }
    }
    if (response && response.payload) return { payload: response.payload }
    // A Worker refuses before dispatch with a bare `{ error }`, not an envelope.
    return { error: (response && typeof response.error === 'string') ? response.error : 'ERR_WORKER_RESPONSE_INVALID' }
  }

  /**
   * Fan out one Worker-scoped `telemetry.pull` (deviceId null) per listed
   * worker and merge the raw answers. Per-worker failures land in `errors`
   * (present only when non-empty); the other workers' data is still returned.
   * `snapshot`: devices = union of each worker's `devices`, snapshotTs = max.
   * `aggregate`: ops = each worker's `partial` merged op by op then tallied,
   * deviceCount = sum. Spec errors are per worker too: a metric one worker's
   * contract lacks is that worker's error while the others still answer.
   * Any other type: `workers` = each worker's payload by workerId, unmerged.
   */
  async pullWorkers (query) {
    const { workers: listed, ...forwarded } = query || {}
    if (!Array.isArray(listed) || !listed.length || !listed.every(w => typeof w === 'string')) {
      return { error: 'ERR_WORKERS_REQUIRED' }
    }
    if (forwarded.type === 'aggregate' && !_mergeableOps(forwarded.ops)) return { error: 'ERR_AGGREGATE_SPEC_INVALID' }
    const workers = [...new Set(listed)]

    const errors = {}
    const sends = workers.map(workerId => {
      const resolution = this.registry.resolveWorker(workerId)
      if (!resolution) {
        errors[workerId] = 'ERR_WORKER_NOT_FOUND'
        return null
      }
      if (!resolution.channel || !this.registry.isRoutable(workerId)) {
        errors[workerId] = 'ERR_WORKER_NOT_ROUTABLE'
        return null
      }
      const envelope = buildEnvelope({
        action: ACTIONS.TELEMETRY_PULL,
        type: MESSAGE_TYPES.REQUEST,
        sender: this._kernelId,
        deviceId: null,
        payload: { query: forwarded }
      })
      return this.workerChannel.send(resolution.channel, envelope)
    })

    const answers = []
    const settled = await Promise.allSettled(sends)
    settled.forEach((outcome, i) => {
      const workerId = workers[i]
      // Never sent: its error is already recorded.
      if (sends[i] === null) return
      if (outcome.status === 'rejected') {
        debug('worker telemetry pull failed for %s: %s', workerId, outcome.reason && outcome.reason.message)
        errors[workerId] = 'ERR_WORKER_UNREACHABLE'
        return
      }
      const response = outcome.value
      const payload = response && response.payload
      // A Worker refuses before dispatch with a bare `{ error }`, not an envelope.
      if (!payload) {
        errors[workerId] = (response && typeof response.error === 'string') ? response.error : 'ERR_WORKER_RESPONSE_INVALID'
        return
      }
      if (payload.error) errors[workerId] = payload.error
      else answers.push({ workerId, payload })
    })

    let result
    if (forwarded.type === 'aggregate') result = this._mergeAggregate(forwarded.ops, answers, errors)
    else if (forwarded.type === 'snapshot') result = this._mergeSnapshot(answers)
    else result = { workers: Object.fromEntries(answers.map(({ workerId, payload }) => [workerId, payload])) }
    return { ...result, ...(Object.keys(errors).length ? { errors } : {}) }
  }

  _mergeSnapshot (answers) {
    const devices = {}
    let snapshotTs = null
    for (const { payload } of answers) {
      if (!payload.devices) continue
      Object.assign(devices, payload.devices)
      if (typeof payload.snapshotTs === 'number' && (snapshotTs === null || payload.snapshotTs > snapshotTs)) snapshotTs = payload.snapshotTs
    }
    return { devices, snapshotTs }
  }

  // Folds one worker at a time so a malformed partial only drops that worker.
  // With no worker folded, `ops` is empty rather than a tally of nothing:
  // a reader must not mistake a zero for a fleet total.
  _mergeAggregate (specs, answers, errors) {
    const state = { ops: { ...specs } }
    const names = Object.keys(specs)
    let ops = mergeStats(state, [])
    let deviceCount = 0
    let folded = 0
    for (const { workerId, payload } of answers) {
      const partial = payload.partial
      if (partial === undefined || partial === null) {
        errors[workerId] = 'ERR_AGGREGATE_PARTIAL_MISSING'
        continue
      }
      const shaped = typeof partial === 'object' && !Array.isArray(partial) &&
        names.every(name => partial[name] === undefined || (partial[name] && typeof partial[name] === 'object' && !Array.isArray(partial[name])))
      if (!shaped) {
        errors[workerId] = 'ERR_AGGREGATE_PARTIAL_INVALID'
        continue
      }
      // Remote data boundary: the accumulators came off the wire, so a merge
      // throw is that worker's bad answer, not a Kernel bug.
      try {
        ops = mergeStats(state, [ops, partial])
      } catch (err) {
        debug('aggregate partial from %s rejected: %s', workerId, err.message)
        errors[workerId] = 'ERR_AGGREGATE_PARTIAL_INVALID'
        continue
      }
      deviceCount += typeof payload.deviceCount === 'number' ? payload.deviceCount : 0
      folded++
    }
    if (!folded) return { ops: {}, deviceCount: 0 }
    tallyStats(state, ops)
    return { ops, deviceCount }
  }

  async pullAll () {
    const workers = this.registry.getReadyWorkers().filter(worker => !worker.pollsTelemetry)
    const pulls = workers.flatMap(worker =>
      worker.deviceIds.map(deviceId => this.pull(deviceId))
    )
    await Promise.allSettled(pulls)
  }

  async pullState (deviceId) {
    const { payload, error } = await this._pullDevice(deviceId, ACTIONS.STATE_PULL, { deviceId })
    return payload || { error }
  }

  subscribe (deviceId, callback) {
    if (!this._subscribers.has(deviceId)) {
      this._subscribers.set(deviceId, new Set())
    }
    this._subscribers.get(deviceId).add(callback)
    return () => {
      const subs = this._subscribers.get(deviceId)
      if (subs) {
        subs.delete(callback)
        if (subs.size === 0) this._subscribers.delete(deviceId)
      }
    }
  }

  _notifySubscribers (deviceId, data) {
    const subs = this._subscribers.get(deviceId)
    if (!subs) return
    for (const cb of subs) {
      try { cb(data) } catch (err) {
        debug('subscriber error for %s: %s', deviceId, err.message)
      }
    }
  }
}

module.exports = { TelemetryCollector, WORKER_QUERY_TYPES }
