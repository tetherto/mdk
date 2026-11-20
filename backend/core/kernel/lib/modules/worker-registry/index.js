'use strict'

const debug = require('debug')('mdk:kernel:registry')
const { REGISTRY_STATES } = require('./states')
const { brandSlug } = require('@tetherto/mdk-rbac')

/**
 * Worker Registry
 *
 * Two flat in-memory indexes, not a chained lookup:
 *   _deviceIndex: deviceId → { workerId, channel, capabilities }
 *   _workerIndex: workerId → { state, deviceIds, channel, rpcKey, ... }
 * Used by the Command Dispatcher to route commands to the correct worker.
 *
 * State machine per worker (see ./states.js):
 *   UNREGISTERED → DISCOVERED → IDENTITY_SAVED → READY → TERMINATED
 *
 * Recovery: Rebuilt from Hyperbee on restart; detects failed reconnects. Only
 * { workerId, deviceIds, rpcKey, registeredAt } is persisted, so recover()
 * synthesises state DISCOVERED and channel null; the contract persisted at
 * setReady gives back deviceFamily and brand, so the Worker keeps its RBAC
 * name and its worker.list row while it is not yet routable.
 */
class WorkerRegistry {
  constructor (opts) {
    this.store = opts.store
    this.capabilityStore = opts.capabilityStore

    // In-memory index: deviceId → { workerId, channel, capabilities }
    this._deviceIndex = new Map()
    // In-memory index: workerId → { state, deviceIds, channel, rpcKey }
    this._workerIndex = new Map()
    // Called with a workerId whose bindings shrank outside a registration:
    // terminate() released the id and its devices, or syncDeviceIds() dropped
    // devices. Discovery retries the Workers those bindings refused.
    this._onRelease = opts.onRelease || null
  }

  async recover () {
    for await (const node of this.store.createReadStream()) {
      const worker = JSON.parse(node.value.toString())
      const stored = await this.capabilityStore.get(worker.workerId)
      const contract = stored ? JSON.parse(stored.value.toString()) : null
      this._workerIndex.set(worker.workerId, {
        ...worker,
        state: REGISTRY_STATES.DISCOVERED,
        channel: null,
        deviceFamily: contract?.metadata?.deviceFamily || null,
        brand: contract?.metadata?.brand || null
      })
      if (worker.deviceIds) {
        for (const deviceId of worker.deviceIds) {
          this._deviceIndex.set(deviceId, { workerId: worker.workerId, channel: null })
        }
      }
    }
    debug(`recovered ${this._workerIndex.size} workers from store`)
  }

  /**
   * Resolves `{ registered: true }`, or `{ registered: false, error, ... }`
   * when a persisted binding refuses the Worker as a whole:
   * - ERR_WORKER_KEY_CONFLICT: a workerId is bound to the first RPC key it
   *   registered with; a different key claiming it is an impersonation attempt.
   * - ERR_WORKER_DEVICE_CONFLICT `{ deviceId, ownerId, ownerPending? }`: a
   *   deviceId is bound to the first workerId that registered it.
   *   `ownerPending` means the owner's claim was loaded by recover() and the
   *   owner has not registered this run: it may still come back without the
   *   device.
   * Both bindings survive restarts and a Worker going offline. worker.terminate
   * of the bound workerId releases both; the owner itself releases a device by
   * no longer listing it (here, or in syncDeviceIds).
   */
  async register (opts) {
    const { workerId, deviceIds, rpcKey, channel } = opts

    const existingWorker = this._workerIndex.get(workerId)
    if (existingWorker && existingWorker.rpcKey && rpcKey && existingWorker.rpcKey !== rpcKey) {
      debug(`workerId conflict: ${workerId} is bound to ${String(existingWorker.rpcKey).slice(0, 16)}..., rejecting ${String(rpcKey).slice(0, 16)}...`)
      return { registered: false, error: 'ERR_WORKER_KEY_CONFLICT', workerId }
    }

    for (const deviceId of deviceIds) {
      const existing = this._deviceIndex.get(deviceId)
      if (existing && existing.workerId !== workerId) {
        debug(`deviceId conflict: ${deviceId} already owned by ${existing.workerId}`)
        const conflict = { registered: false, error: 'ERR_WORKER_DEVICE_CONFLICT', workerId, deviceId, ownerId: existing.workerId }
        if (this._workerIndex.get(existing.workerId).state === REGISTRY_STATES.DISCOVERED) conflict.ownerPending = true
        return conflict
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

    // A Worker coming back (typically one recover() loaded) releases the
    // devices it no longer lists, as syncDeviceIds does; otherwise they stay
    // bound to it and refuse whichever Worker took them over.
    const kept = new Set(deviceIds)
    const dropped = existingWorker ? (existingWorker.deviceIds || []).filter(id => !kept.has(id)) : []

    this._workerIndex.set(workerId, workerEntry)
    for (const deviceId of dropped) this._unmapDevice(deviceId, workerId)
    for (const deviceId of deviceIds) {
      this._deviceIndex.set(deviceId, { workerId, channel })
    }

    debug(`worker registered: ${workerId} (${deviceIds.length} devices)`)
    return { registered: true }
  }

  async setReady (workerId, contract) {
    const worker = this._workerIndex.get(workerId)
    if (!worker) throw new Error('ERR_WORKER_NOT_FOUND')

    worker.state = REGISTRY_STATES.READY
    worker.capabilities = contract.capabilities || {}
    // A Worker that sweeps its own devices (the collector in mdk-worker) is
    // left out of the scheduled live pull: it would poll each device twice.
    worker.pollsTelemetry = Number.isInteger(contract.telemetryPollIntervalMs)
    worker.deviceFamily = contract.metadata?.deviceFamily || null
    worker.brand = contract.metadata?.brand || null

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
      this._unmapDevice(deviceId, workerId)
    }

    await this.store.del(workerId)
    await this.capabilityStore.del(workerId)
    this._workerIndex.delete(workerId)
    debug(`worker terminated: ${workerId}`)
    if (this._onRelease) this._onRelease(workerId)
  }

  /**
   * Update the device list for a registered worker.
   * Called by DHTListener.refreshAll() to keep the registry current
   * after devices are added/removed from workers post-discovery.
   *
   * An unchanged device list is a no-op: the store is append-only, so
   * rewriting it on every refresh grows the kernel-db (and its block cache)
   * without bound.
   */
  async syncDeviceIds (workerId, newDeviceIds, channel) {
    const worker = this._workerIndex.get(workerId)
    if (!worker) return

    const oldDeviceIds = worker.deviceIds || []
    const oldSet = new Set(oldDeviceIds)
    const newSet = new Set(newDeviceIds)

    if (oldSet.size === newSet.size && newDeviceIds.every(id => oldSet.has(id))) return

    // Remove obsolete device mappings
    let released = false
    for (const id of oldDeviceIds) {
      if (!newSet.has(id)) {
        this._unmapDevice(id, workerId)
        released = true
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
    if (released && this._onRelease) this._onRelease(workerId)
  }

  // Only drop a device mapping this worker owns: a stale or hostile worker
  // must not unmap a device another worker has since claimed.
  _unmapDevice (deviceId, workerId) {
    const entry = this._deviceIndex.get(deviceId)
    if (entry && entry.workerId === workerId) this._deviceIndex.delete(deviceId)
  }

  resolveWorkerForDevice (deviceId) {
    return this._deviceIndex.get(deviceId) || null
  }

  /**
   * The RBAC name parts of a worker: `{ family, brand, worker }`, from its
   * contract's metadata (deviceFamily, brand as a slug) and its workerId. Null
   * until the worker is ready, so rules naming instances never match before then.
   */
  nameParts (workerId) {
    const worker = this._workerIndex.get(workerId)
    if (!worker || !worker.deviceFamily) return null
    const brand = brandSlug(worker.brand)
    return brand ? { family: worker.deviceFamily, brand, worker: workerId } : null
  }

  /** The device ids a worker registered, or []. */
  devicesOf (workerId) {
    const worker = this._workerIndex.get(workerId)
    return worker ? [...worker.deviceIds] : []
  }

  resolveWorker (workerId) {
    const worker = this._workerIndex.get(workerId)
    if (!worker) return null
    return { workerId, channel: worker.channel }
  }

  getCapabilities (deviceId) {
    const entry = this._deviceIndex.get(deviceId)
    return entry ? entry.capabilities || null : null
  }

  getWorkerCapabilities (workerId) {
    const worker = this._workerIndex.get(workerId)
    return worker ? worker.capabilities || null : null
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
        healthState: worker.healthState || 'UNKNOWN',
        rpcKey: worker.rpcKey,
        deviceFamily: worker.deviceFamily || null,
        brand: worker.brand || null
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
