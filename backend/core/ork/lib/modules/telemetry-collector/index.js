'use strict'

const debug = require('debug')('mdk:ork:telemetry')
const { ACTIONS, MESSAGE_TYPES } = require('../../protocol/actions')
const { build: buildEnvelope } = require('../../protocol/envelope')

/**
 * Telemetry Collector
 *
 * Stateless proxy: routes telemetry queries from App Node to the owning worker.
 * ORK does NOT store telemetry — workers own their telemetry storage.
 *
 * Two modes:
 * 1. Scheduler-driven pull: fan out telemetry.pull to all Ready workers
 * 2. On-demand query: App Node requests telemetry for a specific device
 */
class TelemetryCollector {
  constructor (opts) {
    this.registry = opts.registry
    this.workerChannel = opts.workerChannel
    this._subscribers = new Map()
    this._orkId = 'ork:kernel:default'
  }

  async pull (deviceId, query) {
    const resolution = this.registry.resolveWorkerForDevice(deviceId)
    if (!resolution || !resolution.channel) return null

    const envelope = buildEnvelope({
      action: ACTIONS.TELEMETRY_PULL,
      type: MESSAGE_TYPES.REQUEST,
      sender: this._orkId,
      deviceId,
      payload: { deviceId, query: query || {} }
    })

    try {
      const response = await this.workerChannel.send(resolution.channel, envelope)
      const data = response && response.payload ? response.payload : null
      if (data) this._notifySubscribers(deviceId, data)
      return data
    } catch (err) {
      debug('telemetry pull failed for %s: %s', deviceId, err.message)
      return null
    }
  }

  async pullAll () {
    const workers = this.registry.getReadyWorkers()
    const pulls = workers.flatMap(worker =>
      worker.deviceIds.map(deviceId => this.pull(deviceId))
    )
    await Promise.allSettled(pulls)
  }

  async pullState (deviceId) {
    const resolution = this.registry.resolveWorkerForDevice(deviceId)
    if (!resolution || !resolution.channel) return null

    const envelope = buildEnvelope({
      action: ACTIONS.STATE_PULL,
      type: MESSAGE_TYPES.REQUEST,
      sender: this._orkId,
      deviceId,
      payload: { deviceId }
    })

    try {
      const response = await this.workerChannel.send(resolution.channel, envelope)
      return response && response.payload ? response.payload : null
    } catch (err) {
      debug('state pull failed for %s: %s', deviceId, err.message)
      return null
    }
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

module.exports = { TelemetryCollector }
