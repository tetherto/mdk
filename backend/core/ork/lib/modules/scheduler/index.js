'use strict'

const debug = require('debug')('mdk:ork:scheduler')

/**
 * Scheduler — System Metronome
 *
 * Triggers repetitive tasks at configured intervals.
 * Does NOT hold domain-specific logic — it only fires ticks.
 *
 * Default jobs:
 * - telemetry.pull: every 10s
 * - state.pull: every 60s
 * - health.ping: every 5s
 *
 * Crash recovery: Timers re-initialize from zero. All tasks are idempotent.
 */
class Scheduler {
  constructor (opts) {
    this.telemetryCollector = opts.telemetryCollector
    this.healthMonitor = opts.healthMonitor
    this.registry = opts.registry
    this.workerChannel = opts.workerChannel
    this.dhtListener = opts.dhtListener || null

    this.cadences = opts.cadences || {
      telemetryPullMs: 10000,
      statePullMs: 60000,
      healthPingMs: 5000
    }

    this._jobs = new Map()
    this._running = false
  }

  start () {
    if (this._running) return
    this._running = true

    this.addJob('telemetry.pull', this.cadences.telemetryPullMs, () =>
      this.telemetryCollector.pullAll()
    )

    this.addJob('health.ping', this.cadences.healthPingMs, () =>
      this.healthMonitor.pingAll()
    )

    if (this.dhtListener) {
      this.addJob('state.pull', this.cadences.statePullMs, () =>
        this.dhtListener.refreshAll()
      )
    }

    debug(`scheduler started (telemetry: ${this.cadences.telemetryPullMs}ms, health: ${this.cadences.healthPingMs}ms, state: ${this.cadences.statePullMs}ms)`)
  }

  stop () {
    this._running = false
    for (const [name, job] of this._jobs) {
      if (job.timer) clearInterval(job.timer)
      debug(`job stopped: ${name}`)
    }
    this._jobs.clear()
  }

  addJob (name, intervalMs, handler) {
    if (this._jobs.has(name)) this.removeJob(name)

    const job = { name, intervalMs, handler, timer: null, running: false }

    job.timer = setInterval(async () => {
      if (job.running) return
      job.running = true
      try { await handler() } catch (err) {
        debug(`job ${name} error: ${err.message}`)
      } finally { job.running = false }
    }, intervalMs)

    if (job.timer.unref) job.timer.unref()
    this._jobs.set(name, job)
  }

  removeJob (name) {
    const job = this._jobs.get(name)
    if (!job) return
    if (job.timer) clearInterval(job.timer)
    this._jobs.delete(name)
  }
}

module.exports = { Scheduler }
