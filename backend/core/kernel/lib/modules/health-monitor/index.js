'use strict'

const debug = require('debug')('mdk:kernel:health')
const { HEALTH_STATES } = require('./states')
const { ACTIONS, MESSAGE_TYPES } = require('../../protocol/actions')
const { build: buildEnvelope } = require('../../protocol/envelope')

/**
 * Health Monitor
 *
 * Evaluates liveness of every registered worker via health.ping.
 * Prevents routing to dead nodes.
 *
 * State machine per worker:
 *   UNKNOWN → HEALTHY → SICK → DEAD
 *
 * SICK/DEAD → Registry halts routing to that worker.
 */
class HealthMonitor {
  constructor (opts) {
    this.registry = opts.registry
    this.workerChannel = opts.workerChannel
    this.failureThreshold = opts.failureThreshold || 3
    this._healthState = new Map()
    this._kernelId = 'kernel:kernel:default'
    this._running = false
  }

  start () { this._running = true }
  stop () { this._running = false }

  async pingAll () {
    if (!this._running) return
    const workers = this.registry.getReadyWorkers()
    await Promise.allSettled(workers.map(w => this._pingWorker(w)))
  }

  async _pingWorker (worker) {
    const { workerId, channel } = worker
    if (!channel) { this._recordFailure(workerId); return }

    const envelope = buildEnvelope({
      action: ACTIONS.HEALTH_PING,
      type: MESSAGE_TYPES.REQUEST,
      sender: this._kernelId,
      target: workerId,
      payload: {}
    })

    try {
      await this.workerChannel.send(channel, envelope, { timeout: 3000 })
      this._recordSuccess(workerId)
    } catch (err) {
      this._recordFailure(workerId)
    }
  }

  _recordSuccess (workerId) {
    const state = this._getOrCreate(workerId)
    state.state = HEALTH_STATES.HEALTHY
    state.consecutiveFailures = 0
    state.lastPing = Date.now()
    this.registry.updateHealthState(workerId, HEALTH_STATES.HEALTHY)
  }

  _recordFailure (workerId) {
    const state = this._getOrCreate(workerId)
    state.consecutiveFailures += 1
    state.lastPing = Date.now()

    if (state.consecutiveFailures >= this.failureThreshold) {
      state.state = HEALTH_STATES.DEAD
      this.registry.updateHealthState(workerId, HEALTH_STATES.DEAD)
      debug(`worker ${workerId}: DEAD (${state.consecutiveFailures} failures)`)
    } else {
      state.state = HEALTH_STATES.SICK
      this.registry.updateHealthState(workerId, HEALTH_STATES.SICK)
    }
  }

  _getOrCreate (workerId) {
    if (!this._healthState.has(workerId)) {
      this._healthState.set(workerId, {
        state: HEALTH_STATES.UNKNOWN,
        consecutiveFailures: 0,
        lastPing: null
      })
    }
    return this._healthState.get(workerId)
  }

  getHealth (workerId) {
    return this._healthState.get(workerId) || {
      state: HEALTH_STATES.UNKNOWN, consecutiveFailures: 0, lastPing: null
    }
  }
}

module.exports = { HealthMonitor }
