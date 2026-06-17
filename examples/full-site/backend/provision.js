'use strict'

// provision.js — register a device on a running worker, the MDK way.
//
// SEED_TYPES holds the app-specific device params; provisionDevice does the
// generic MDK flow: resolve the worker via the ORK, send registerThing
// worker-direct (sendWorkerCommand), then wait for the ORK to sync it. Progress
// is reported through an injected callback, keeping CLI concerns out.

const { createMdkClient } = require('../../../backend/core/client')
const { readOrkKey } = require('./inspect')
const { PORTS, HOST, CONTAINER_ID } = require('./site')

// Each seed type targets one running worker. The new device's connection opts
// default to that family's mock port (so the device has live telemetry); --port
// overrides.
const SEED_TYPES = {
  miner: {
    workerId: 'miner-worker',
    prefix: 'miner',
    params: (id, flags) => ({
      id,
      info: { container: flags.container || CONTAINER_ID, pos: flags.pos || '1_1', serialNum: `WM-${id}` },
      opts: { address: HOST, port: Number(flags.port) || PORTS.MINER_BASE, password: 'admin' }
    })
  },
  container: {
    workerId: 'container-worker',
    prefix: 'container',
    params: (id, flags) => ({
      id,
      info: { container: id },
      opts: { address: HOST, port: Number(flags.port) || PORTS.CONTAINER, username: 'admin', password: 'admin' }
    })
  },
  powermeter: {
    workerId: 'powermeter-worker',
    prefix: 'powermeter',
    params: (id, flags) => ({
      id,
      info: { pos: 'site' },
      opts: { address: HOST, port: Number(flags.port) || PORTS.POWERMETER, unitId: 1 }
    })
  }
}

function nextId (prefix, existing) {
  let n = existing.length
  while (existing.includes(`${prefix}-${n}`)) n++
  return `${prefix}-${n}`
}

// Register the next device of `type` on its worker. `root` locates the ORK key;
// `flags` carry per-device overrides (container/pos/port); `report` (optional)
// receives human-readable progress lines. Returns the new deviceId. Throws
// ERR_UNKNOWN_SEED_TYPE / ERR_WORKER_KEY_MISSING / ERR_SEED_FAILED.
async function provisionDevice (type, { root, flags = {}, report = () => {} } = {}) {
  const spec = SEED_TYPES[type]
  if (!spec) throw new Error(`ERR_UNKNOWN_SEED_TYPE: ${type || ''} (miner|container|powermeter)`)

  const ork = createMdkClient({ hrpc: { key: readOrkKey(root) } })
  await ork.connect()
  try {
    const { workers } = await ork.getStatus()
    const wk = workers.find((w) => w.workerId === spec.workerId)
    if (!wk || !wk.rpcKey) throw new Error(`ERR_WORKER_KEY_MISSING: ${spec.workerId}`)

    const id = nextId(spec.prefix, wk.deviceIds || [])
    const params = spec.params(id, flags)

    const res = await ork.sendWorkerCommand(spec.workerId, id, 'registerThing', params)
    const payload = res && res.payload
    if (payload && payload.status === 'FAILED') throw new Error(`ERR_SEED_FAILED: ${payload.error}`)
    report(`seeded ${id} on ${spec.workerId} (port ${params.opts.port}); waiting for ORK refresh…`)

    // The worker syncs the new device into the ORK registry on its next refresh.
    try {
      await ork.waitForDevice(id, { workerId: spec.workerId, timeoutMs: 12000, intervalMs: 1500 })
      const after = await ork.getStatus()
      const w = after.workers.find((x) => x.workerId === spec.workerId)
      report(`${id} registered in ORK (worker now has ${w ? w.deviceCount : '?'} device(s))`)
    } catch {
      report(`(${id} seeded but not yet visible in the ORK registry)`)
    }
    return id
  } finally {
    await ork.close()
  }
}

module.exports = { SEED_TYPES, nextId, provisionDevice }
