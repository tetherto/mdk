'use strict'

// Shared helpers for the site plugin controllers. Every Kernel access goes through
// the plugin's own mdkClient (lib/client.js) — controllers never reach further down.

// The Kernel client for one request. For a signed-in user the app runtime
// hands the controller req.mdk, which carries the user's token beside the
// app's: the Kernel allows each call only when both the app's and the user's
// roles allow it, and logs the user as the one who sent a command. Without one
// (an MCP agent's call) it is the app's own client.
//
// `ctx` is a test-only seam: a real route call always passes just `req`.
// Tests pass `{ mdkClient }` directly instead of loading the plugin.
const requestClient = (req, ctx) => {
  if (ctx !== undefined) return ctx.mdkClient
  return (req && req.mdk) || require('../lib/client')
}

// The Kernel refused this caller (or the user it acts for) the call.
const isForbidden = (err) => !!err && String(err.code || err.message || err).startsWith('ERR_KERNEL_ACTION_FORBIDDEN')

// The Kernel answers a command it refuses before queuing it (unknown device or
// Worker, a Worker it cannot route to, a command or params outside the contract)
// with { status: 'REJECTED', error } rather than throwing. Raise it, so the caller
// gets an error status and the reason instead of a 200: 404 when the target does
// not exist, 422 otherwise.
const NOT_FOUND_CODES = ['ERR_DEVICE_NOT_FOUND', 'ERR_WORKER_NOT_FOUND']
const throwIfRejected = (result) => {
  if (!result || result.status !== 'REJECTED') return
  const code = String(result.error || 'ERR_COMMAND_REJECTED')
  const statusCode = NOT_FOUND_CODES.some((c) => code.startsWith(c)) ? 404 : 422
  throw Object.assign(new Error(code), { statusCode })
}

// Fallback when the worker.list row carries no deviceFamily (a Worker not yet READY,
// a contract without metadata, or an older Kernel) — keyed by stable workerId.
const WORKER_FAMILY = {
  'whatsminer-worker': 'miner',
  'minerpool-worker': 'minerpool',
  // The pool workers have no provisioning service, so the contract
  // `config` pull can't classify them — the fallback map must.
  'ocean-pool-worker': 'minerpool',
  'emcd-pool-worker': 'minerpool',
  'spiderpool-pool-worker': 'minerpool',
  'foundry-pool-worker': 'minerpool'
}

const resolveFamily = (worker) => worker.deviceFamily || WORKER_FAMILY[worker.workerId] || null

// Adapter for workers that don't serve the worker-infra `list` query (e.g. a
// Worker scaffolded by `mdk create worker`): classify by published capability
// (a worker declaring a hashrate_rt channel is a miner) and synthesize the
// thing shape the controllers read from plain per-device `metrics` pulls.
// Power meters are adapted by adaptContractMeters below. Every device of a
// Worker shares its contract and the Kernel answers device.capabilities from
// its registry, so any device the caller may read gives the Worker's
// capabilities.
const adaptContractMiners = async (mdkClient, worker) => {
  const [deviceId] = worker.deviceIds || []
  if (!deviceId) return null
  const caps = await mdkClient.getCapabilities(deviceId)
  const telemetry = (caps && caps.capabilities && caps.capabilities.telemetry) || []
  if (!telemetry.some((t) => t.name === 'hashrate_rt')) return null

  const container = `rack-${worker.workerId.replace(/-worker$/, '')}`
  return Promise.all((worker.deviceIds || []).map(async (deviceId, i) => {
    const tel = await mdkClient.pullTelemetry(deviceId, { type: 'metrics' }).catch(() => null)
    const m = (tel && tel.metrics) || {}
    const hashrateThs = Number(m.hashrate_rt) || 0
    return {
      id: deviceId,
      code: deviceId,
      info: { container, pos: String(i + 1) },
      last: {
        snap: {
          stats: {
            status: hashrateThs > 0 ? 'mining' : 'offline',
            power_w: Number(m.power) || 0,
            hashrate_mhs: { t_5m: hashrateThs * 1e6 },
            temperature_c: { avg: Number(m.temperature) || 0 }
          },
          // The UI's mode toggle speaks low|normal|high; firmware v3 says eco.
          config: { power_mode: m.power_mode === 'eco' ? 'low' : m.power_mode || null }
        }
      },
      workerId: worker.workerId
    }
  }))
}

// A contract power meter (e.g. @tetherto/mdk-worker-satec on WorkerRuntimeV2)
// has no thing record either. Its `snap` channel answers the legacy snapshot
// the overview reads; a meter it cannot read comes back as { id, error }, not
// as a zero reading. A contract carries no position, so every contract meter
// counts as the site meter; a site with per-container meters would read `pos`
// from config/devices.json instead. The Kernel does not require a contract's
// metadata.brand, so the workerId stands in for it in the label's type.
const adaptContractMeters = (mdkClient, worker) => Promise.all((worker.deviceIds || []).map(async (deviceId) => {
  const tel = await mdkClient.pullTelemetry(deviceId, { type: 'snap' }).catch((err) => ({ error: err }))
  if (!tel || tel.error || !tel.value) return { id: deviceId, error: (tel && tel.error) || 'ERR_SNAP_EMPTY' }
  return {
    id: deviceId,
    code: deviceId,
    type: `powermeter-${String(worker.brand || worker.workerId).toLowerCase()}`,
    info: { pos: 'site' },
    last: { snap: tel.value },
    workerId: worker.workerId
  }
}))

const readableDeviceIds = async (mdkClient, deviceIds) => {
  const readable = await Promise.all(deviceIds.map(async (deviceId) => {
    try {
      await mdkClient.getCapabilities(deviceId)
      return true
    } catch (err) {
      return !isForbidden(err)
    }
  }))
  return deviceIds.filter((_, i) => readable[i])
}

// List workers and classify each by deviceFamily (worker.list row or workerId
// fallback). One Worker-scoped list per worker (pullWorkerQuery, checked by the
// Kernel on every device of the Worker) — with { status: true } each thing carries
// its latest snapshot (thg.last.snap). A Worker without the worker-infra store
// answers a bare device list, no things, and is adapted from its contract instead.
// The minerpool is a scheduler worker whose one device is the worker itself.
//
// A Worker whose devices cannot be read (Kernel reports it DEAD or TERMINATED, or
// the contract adapter failed) is listed in `unavailable` as { workerId, reason },
// so a consumer can tell an outage from an empty site instead of seeing its
// devices silently disappear.
const loadSite = async (mdkClient, opts = {}) => {
  if (!mdkClient) throw new Error('ERR_MDK_CLIENT_UNAVAILABLE')

  const res = await mdkClient.listWorkers()
  const workers = (res && res.workers) || []

  const byFamily = {}
  const pools = []
  const unavailable = []
  // The devices of a Worker that is down, flagged rather than dropped. Same rule as the
  // forbidden-skip below: only devices this caller may read. device.capabilities is checked
  // as devices:read and answered by the Kernel, so it still works while the Worker is down.
  const unavailableDevices = []

  await Promise.all(workers.map(async (w) => {
    if (w.state === 'TERMINATED' || w.healthState === 'DEAD') {
      unavailable.push({ workerId: w.workerId, reason: w.state === 'TERMINATED' ? 'TERMINATED' : 'DEAD' })
      for (const deviceId of await readableDeviceIds(mdkClient, w.deviceIds || [])) {
        unavailableDevices.push({ deviceId, workerId: w.workerId, status: 'offline', stale: true })
      }
      return
    }

    const deviceIds = w.deviceIds || []
    const family = resolveFamily(w)

    if (family === 'minerpool') {
      pools.push({ workerId: w.workerId, deviceId: deviceIds[0] || w.workerId })
      return
    }

    const query = { workers: [w.workerId], type: 'list', limit: Math.max(deviceIds.length, 1) }
    if (opts.status) query.status = true
    let reply
    try {
      reply = await mdkClient.pullWorkerQuery(query)
    } catch (err) {
      // A user whose roles cover only some devices (a hosting client) sees
      // only those: a worker they may not read as a whole is left out, not an error.
      if (isForbidden(err)) return
      throw err
    }
    const answer = reply && reply.workers && reply.workers[w.workerId]
    if (!answer) {
      unavailable.push({ workerId: w.workerId, reason: String((reply && reply.errors && reply.errors[w.workerId]) || 'ERR_WORKER_UNAVAILABLE') })
      return
    }

    if (!Array.isArray(answer.things)) {
      // No worker-infra store — fall back to contract classification. A
      // rejection means the Worker did not answer, which is reported, not hidden.
      if (family === 'power-meter') {
        for (const meter of await adaptContractMeters(mdkClient, w)) {
          if (!meter.error) (byFamily[family] = byFamily[family] || []).push(meter)
          else if (!isForbidden(meter.error)) unavailableDevices.push({ deviceId: meter.id, workerId: w.workerId, status: 'offline', stale: true })
        }
        return
      }
      const adapted = await adaptContractMiners(mdkClient, w).catch((err) => {
        if (!isForbidden(err)) unavailable.push({ workerId: w.workerId, reason: String((err && (err.code || err.message)) || 'ERR_WORKER_UNAVAILABLE') })
        return null
      })
      if (adapted && adapted.length) {
        if (!byFamily.miner) byFamily.miner = []
        byFamily.miner.push(...adapted)
      }
      return
    }

    if (!answer.things.length) {
      // Container worker is registered but returned no things (e.g. MQTT broker
      // initialising before its first snap). Add a stub using the device ID so the
      // container card still appears in the overview.
      if (family === 'container' && deviceIds[0]) {
        if (!byFamily[family]) byFamily[family] = []
        byFamily[family].push({ id: deviceIds[0], code: deviceIds[0], info: { container: deviceIds[0] }, last: {}, workerId: w.workerId })
      }
      return
    }

    // Things of a family the overview has no card for are not rendered.
    if (!family) return
    if (!byFamily[family]) byFamily[family] = []
    for (const thg of answer.things) byFamily[family].push({ ...thg, workerId: w.workerId })
  }))

  unavailable.sort((a, b) => a.workerId.localeCompare(b.workerId))
  unavailableDevices.sort((a, b) => a.deviceId.localeCompare(b.deviceId))
  return { workers, byFamily, pools, unavailable, unavailableDevices }
}

// Pool stats come two ways with the same row shape: the WorkerRuntime pool
// workers (EMCD, SpiderPool, Foundry) serve them as ext_data keys 'stats' /
// 'stats-history'; contract-only pool workers (ocean-mdk-worker) declare
// `stats` / `stats_history` telemetry channels instead. Try ext_data first and
// fall back to the channel when the worker doesn't serve it.
const pullExtData = (mdkClient, deviceId, query) => mdkClient.pullTelemetry(deviceId, { type: 'ext_data', ...query })
  .then((tel) => (tel && tel.extData) || null)
  .catch(() => null)

const pullChannel = (mdkClient, deviceId, query) => mdkClient.pullTelemetry(deviceId, query)
  .then((tel) => (tel && !tel.error && tel.value) || null)
  .catch(() => null)

// -> latest per-account stats rows
const pullPoolStats = async (mdkClient, deviceId) => {
  const extData = await pullExtData(mdkClient, deviceId, { key: 'stats' })
  if (extData) return extData.stats || []
  const value = await pullChannel(mdkClient, deviceId, { type: 'stats' })
  return (value && value.stats) || []
}

// -> [{ ts, stats: [...] }] in [start, end]
const pullPoolStatsHistory = async (mdkClient, deviceId, { start, end }) => {
  const extData = await pullExtData(mdkClient, deviceId, { key: 'stats-history', start, end })
  if (extData) return Array.isArray(extData) ? extData : []
  const value = await pullChannel(mdkClient, deviceId, { type: 'stats_history', start, end })
  return Array.isArray(value) ? value : []
}

const snapStats = (thg) => {
  return (thg && thg.last && thg.last.snap && thg.last.snap.stats) || {}
}

const snapConfig = (thg) => {
  return (thg && thg.last && thg.last.snap && thg.last.snap.config) || {}
}

module.exports = { loadSite, snapStats, snapConfig, requestClient, throwIfRejected, pullPoolStats, pullPoolStatsHistory, WORKER_FAMILY, resolveFamily }
