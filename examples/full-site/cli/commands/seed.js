'use strict'

const { SEED_TYPES, provisionDevice } = require('../../backend/provision')
const { fetchStatus } = require('../../backend/inspect')
const { requireRunning, startComponent } = require('./components')

async function waitForDeviceRegistered (root, workerId, deviceId, { timeoutMs = 30000, intervalMs = 1000 } = {}) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const { workers } = await fetchStatus(root, { retries: 1 }).catch(() => ({ workers: [] }))
    const w = (workers || []).find((x) => x.workerId === workerId)
    if (w && w.state === 'READY' && (w.deviceIds || []).includes(deviceId)) return true
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  return false
}

// seed <whatsminer|antminer|avalon|...> [--container <id>] [--pos <pdu_socket>] [--port <p>]
// Check the local Kernel + worker are alive, delegate registration to
// backend/provision, then restart the worker (the device set is fixed at
// construction, so registerThing takes effect on restart).
async function seed (ctx, { args, flags }) {
  const type = args[0]
  const spec = SEED_TYPES[type]
  if (!spec) throw new Error(`ERR_UNKNOWN_SEED_TYPE: ${type || ''} (whatsminer|antminer|avalon|antspace|bitdeer|abb|satec|schneider)`)

  requireRunning(ctx, 'kernel')
  requireRunning(ctx, spec.workerId)

  const id = await provisionDevice(type, { root: ctx.root, flags, report: ctx.print })

  ctx.print(`restarting ${spec.workerId} so the runtime picks up ${id}…`)
  await ctx.pm.stop(spec.workerId)
  await startComponent(ctx, spec.workerId, { minerCount: ctx.minerCount })

  const visible = await waitForDeviceRegistered(ctx.root, spec.workerId, id)
  ctx.print(visible
    ? `${spec.workerId} back up, ${id} registered in the Kernel`
    : `${spec.workerId} back up (${id} not yet visible in the Kernel registry)`)

  return id
}

module.exports = { seed }
