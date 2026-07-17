'use strict'

// provision.js — register a device on a running worker, the MDK way.
//
// SEED_TYPES holds the app-specific device params; provisionDevice does the
// generic MDK flow: resolve the worker via the Kernel and send registerThing
// worker-direct (sendWorkerCommand). The device takes effect on worker restart.
// Progress is reported through an injected callback, keeping CLI concerns out.

const { createMdkClient } = require('../../../backend/core/client')
const { readKernelKey } = require('./inspect')
const {
  PORTS,
  HOST,
  CONTAINER_ANTSPACE,
  CONTAINER_BITDEER,
  BITDEER_MQTT_ID,
  SENSOR_CONTAINERS
} = require('./site')

// Each seed type targets one running worker. The new device's connection opts
// default to that family's mock port (so the device has live telemetry); --port
// overrides.
const SEED_TYPES = {
  whatsminer: {
    workerId: 'whatsminer-worker',
    prefix: 'whatsminer',
    params: (id, flags) => ({
      id,
      info: { container: flags.container || CONTAINER_ANTSPACE, pos: flags.pos || id, serialNum: `WM-${id}` },
      opts: { address: HOST, port: Number(flags.port) || PORTS.MINER_BASE, password: 'admin' }
    })
  },
  antminer: {
    workerId: 'antminer-worker',
    prefix: 'antminer',
    params: (id, flags) => ({
      id,
      info: { container: flags.container || CONTAINER_ANTSPACE, pos: flags.pos || id, serialNum: `AM-${id}` },
      opts: { address: HOST, port: Number(flags.port) || PORTS.ANTMINER_BASE, username: 'root', password: 'root' }
    })
  },
  avalon: {
    workerId: 'avalon-worker',
    prefix: 'avalon',
    params: (id, flags) => ({
      id,
      info: { container: flags.container || CONTAINER_BITDEER, pos: flags.pos || id, serialNum: `AV-${id}` },
      opts: { address: HOST, port: Number(flags.port) || PORTS.AVALON_BASE, password: 'admin' }
    })
  },
  antspace: {
    workerId: 'antspace-worker',
    prefix: 'antspace',
    params: (id, flags) => ({
      id: flags.id || CONTAINER_ANTSPACE,
      info: { container: flags.id || CONTAINER_ANTSPACE, serialNum: 'HK3-001' },
      opts: { address: HOST, port: Number(flags.port) || PORTS.ANTSPACE }
    })
  },
  bitdeer: {
    workerId: 'bitdeer-worker',
    prefix: 'bitdeer',
    params: (id, flags) => ({
      id: flags.id || CONTAINER_BITDEER,
      info: { container: flags.id || CONTAINER_BITDEER, serialNum: 'D40-A1346-001' },
      opts: { containerId: flags.containerId || BITDEER_MQTT_ID }
    })
  },
  abb: {
    workerId: 'powermeter-worker',
    prefix: 'abb-powermeter',
    params: (id, flags) => ({
      id,
      info: { pos: 'site' },
      opts: { address: HOST, port: Number(flags.port) || PORTS.POWERMETER, unitId: 1 }
    })
  },
  satec: {
    workerId: 'satec-powermeter-worker',
    prefix: 'satec-powermeter',
    params: (id, flags) => ({
      id,
      info: { pos: 'site' },
      opts: { address: HOST, port: Number(flags.port) || PORTS.SATEC_POWERMETER, unitId: 1 }
    })
  },
  schneider: {
    workerId: 'schneider-powermeter-worker',
    prefix: 'schneider-powermeter',
    params: (id, flags) => ({
      id,
      info: { pos: 'site' },
      opts: { address: HOST, port: Number(flags.port) || PORTS.SCHNEIDER_POWERMETER, unitId: 1 }
    })
  },
  seneca: {
    workerId: 'seneca-sensor-worker',
    prefix: 'seneca-sensor',
    params: (id, flags) => ({
      id,
      info: { container: flags.container || SENSOR_CONTAINERS[0].container, pos: flags.pos || 'inlet' },
      opts: { address: HOST, port: Number(flags.port) || PORTS.SENSOR_BASE, unitId: 0, register: 3 }
    })
  }
}

const SEED_TYPE_LIST = Object.keys(SEED_TYPES).join('|')

function nextId (prefix, existing) {
  let n = existing.length
  while (existing.includes(`${prefix}-${n}`)) n++
  return `${prefix}-${n}`
}

// Register the next device of `type` on its worker. `root` locates the Kernel key;
// `flags` carry per-device overrides (container/pos/port); `report` (optional)
// receives human-readable progress lines. Returns the new deviceId. Throws
// ERR_UNKNOWN_SEED_TYPE / ERR_WORKER_KEY_MISSING / ERR_SEED_FAILED.
async function provisionDevice (type, { root, flags = {}, report = () => {} } = {}) {
  const spec = SEED_TYPES[type]
  if (!spec) throw new Error(`ERR_UNKNOWN_SEED_TYPE: ${type || ''} (${SEED_TYPE_LIST})`)

  const kernel = createMdkClient({ hrpc: { key: readKernelKey(root) } })
  await kernel.connect()
  try {
    const { workers } = await kernel.getStatus()
    const wk = workers.find((w) => w.workerId === spec.workerId)
    if (!wk || !wk.rpcKey) throw new Error(`ERR_WORKER_KEY_MISSING: ${spec.workerId}`)

    const id = nextId(spec.prefix, wk.deviceIds || [])
    const params = spec.params(id, flags)

    const res = await kernel.sendWorkerCommand(spec.workerId, id, 'registerThing', params)
    const payload = res && res.payload
    if (payload && payload.status === 'FAILED') throw new Error(`ERR_SEED_FAILED: ${payload.error}`)
    const portHint = params.opts.port != null ? `port ${params.opts.port}` : `containerId ${params.opts.containerId}`

    report(`seeded ${params.id || id} on ${spec.workerId} (${portHint}); takes effect on worker restart`)
    return params.id || id
  } finally {
    await kernel.close()
  }
}

module.exports = { SEED_TYPES, nextId, provisionDevice }
