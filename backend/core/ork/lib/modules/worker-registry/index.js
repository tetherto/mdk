'use strict'

const debug = require('debug')('mdk:ork:registry')
const { REGISTRY_STATES } = require('./states')

/**
 * Worker Registry
 *
 * Maps deviceId → worker HRPC channel and stores declared capabilities.
 * Used by the Command Dispatcher to route commands to the correct worker.
 *
 * State machine per worker:
 *   Unregistered → Discovered → IdentitySaved → Ready → Terminated
 *
 * Recovery: Rebuilt from Hyperbee on restart; detects failed reconnects.
 */
class WorkerRegistry {
  constructor (opts) {
    this.store = opts.store
    this.capabilityStore = opts.capabilityStore

    // In-memory index: deviceId → { workerId, channel, capabilities }
    this._deviceIndex = new Map()
    // In-memory index: workerId → { state, deviceIds, channel, rpcKey }
    this._workerIndex = new Map()
  }

  async recover () {
    for await (const node of this.store.createReadStream()) {
      const worker = JSON.parse(node.value.toString())
      this._workerIndex.set(worker.workerId, {
        ...worker,
        state: REGISTRY_STATES.DISCOVERED,
        channel: null
      })
      if (worker.deviceIds) {
        for (const deviceId of worker.deviceIds) {
          this._deviceIndex.set(deviceId, { workerId: worker.workerId, channel: null })
        }
      }
    }
    debug(`recovered ${this._workerIndex.size} workers from store`)
  }

  async register (opts) {
    const { workerId, deviceIds, rpcKey, channel } = opts

    for (const deviceId of deviceIds) {
      const existing = this._deviceIndex.get(deviceId)
      if (existing && existing.workerId !== workerId) {
        debug(`deviceId conflict: ${deviceId} already owned by ${existing.workerId}`)
        return false
      }
    }

    const workerEntry = {
      workerId,
      deviceIds,
      rpcKey,
      channel,
      state: REGISTRY_STATES.IDENTITY_SAVED,
      registeredAt: Date.now()
    }

    await this.store.put(workerId, Buffer.from(JSON.stringify({
      workerId,
      deviceIds,
      rpcKey,
      registeredAt: workerEntry.registeredAt
    })))

    this._workerIndex.set(workerId, workerEntry)
    for (const deviceId of deviceIds) {
      this._deviceIndex.set(deviceId, { workerId, channel })
    }

    debug(`worker registered: ${workerId} (${deviceIds.length} devices)`)
    return true
  }

  async setReady (workerId, contract) {
    const worker = this._workerIndex.get(workerId)
    if (!worker) throw new Error('ERR_WORKER_NOT_FOUND')

    worker.state = REGISTRY_STATES.READY
    worker.capabilities = contract.capabilities || {}

    await this.capabilityStore.put(workerId, Buffer.from(JSON.stringify(contract)))

    for (const deviceId of worker.deviceIds) {
      const entry = this._deviceIndex.get(deviceId)
      if (entry) entry.capabilities = contract.capabilities
    }

    debug(`worker ready: ${workerId}`)
  }

  async terminate (workerId) {
    const worker = this._workerIndex.get(workerId)
    if (!worker) return

    for (const deviceId of worker.deviceIds) {
      this._deviceIndex.delete(deviceId)
    }

    await this.store.del(workerId)
    await this.capabilityStore.del(workerId)
    this._workerIndex.delete(workerId)
    debug(`worker terminated: ${workerId}`)
  }

  /**
   * Update the device list for a registered worker.
   * Called by DHTListener.refreshAll() to keep the registry current
   * after devices are added/removed from workers post-discovery.
   */
  async syncDeviceIds (workerId, newDeviceIds, channel) {
    const worker = this._workerIndex.get(workerId)
    if (!worker) return

    const oldDeviceIds = worker.deviceIds || []

    // Remove obsolete device mappings
    for (const id of oldDeviceIds) {
      if (!newDeviceIds.includes(id)) {
        this._deviceIndex.delete(id)
      }
    }

    // Add new device mappings
    for (const id of newDeviceIds) {
      if (!this._deviceIndex.has(id)) {
        this._deviceIndex.set(id, {
          workerId,
          channel,
          capabilities: worker.capabilities || null
        })
      }
    }

    worker.deviceIds = newDeviceIds

    // Persist updated device list
    await this.store.put(workerId, Buffer.from(JSON.stringify({
      workerId,
      deviceIds: newDeviceIds,
      rpcKey: worker.rpcKey,
      registeredAt: worker.registeredAt
    })))

    debug(`synced device IDs for ${workerId}: ${newDeviceIds.length} devices`)
  }

  resolveWorkerForDevice (deviceId) {
    return this._deviceIndex.get(deviceId) || null
  }

  getCapabilities (deviceId) {
    const entry = this._deviceIndex.get(deviceId)
    return entry ? entry.capabilities || null : null
  }

  updateHealthState (workerId, healthState) {
    const worker = this._workerIndex.get(workerId)
    if (worker) worker.healthState = healthState
  }

  isRoutable (workerId) {
    const worker = this._workerIndex.get(workerId)
    if (!worker) return false
    if (worker.state !== REGISTRY_STATES.READY) return false
    if (worker.healthState === 'SICK' || worker.healthState === 'DEAD') return false
    return true
  }

  listWorkers () {
    const workers = []
    for (const [workerId, worker] of this._workerIndex) {
      workers.push({
        workerId,
        deviceIds: worker.deviceIds,
        state: worker.state,
        healthState: worker.healthState || 'UNKNOWN'
      })
    }
    return workers
  }

  getReadyWorkers () {
    const ready = []
    for (const [, worker] of this._workerIndex) {
      if (worker.state === REGISTRY_STATES.READY) ready.push(worker)
    }
    return ready
  }
}

module.exports = { WorkerRegistry }
