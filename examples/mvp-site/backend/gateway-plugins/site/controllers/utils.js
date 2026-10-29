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
const isForbidden = (err) => !!err && String(err.code || err.message).startsWith('ERR_KERNEL_ACTION_FORBIDDEN')

// Fallback when a config pull fails or omits deviceFamily — keyed by stable workerId.
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

const resolveFamily = (worker, cfg) => {
  const fromContract = cfg && cfg.config && cfg.config.contract && cfg.config.contract.deviceFamily
  if (fromContract) return fromContract
  return WORKER_FAMILY[worker.workerId] || null
}

const telemetryAnchor = (worker) => {
  const deviceIds = worker.deviceIds || []
  return deviceIds[0] || worker.workerId
}

// Adapter for workers that don't serve the worker-infra `config`/`list`
// queries (e.g. a Worker scaffolded by `mdk create worker`):
// classify by published
// capability (the Kernel registry exposes contract.capabilities, not
// metadata — a worker declaring a hashrate_rt channel is a miner) and
// synthesize the thing shape the controllers read from plain per-device
// `metrics` pulls. Only miners are adapted — theirs is the card shape the
// overview knows how to render.
const adaptContractMiners = async (mdkClient, worker) => {
  const caps = await mdkClient.getCapabilities(telemetryAnchor(worker))
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

// List workers and classify each by deviceFamily (contract or workerId fallback).
// One list pull per worker — with { status: true } each thing carries its latest
// snapshot (thg.last.snap). The minerpool is a scheduler worker with no things.
const loadSite = async (mdkClient, opts = {}) => {
  if (!mdkClient) throw new Error('ERR_MDK_CLIENT_UNAVAILABLE')

  const res = await mdkClient.listWorkers()
  const workers = (res && res.workers) || []

  const byFamily = {}
  const pools = []

  await Promise.all(workers.map(async (w) => {
    if (w.state === 'TERMINATED' || w.healthState === 'DEAD') return

    const anchor = telemetryAnchor(w)
    let cfg
    try {
      cfg = await mdkClient.pullTelemetry(anchor, { type: 'config' })
    } catch (err) {
      // A user whose roles cover only some devices (a hosting client) sees
      // only those: a worker they may not read is left out, not an error.
      if (isForbidden(err)) return
      throw err
    }
    const family = resolveFamily(w, cfg)

    if (family === 'minerpool') {
      pools.push({ workerId: w.workerId, deviceId: anchor })
      return
    }

    if (!family) {
      // No worker-infra surface — fall back to contract classification
      // (rejections mean "not adaptable", same as unknown family before).
      const adapted = await adaptContractMiners(mdkClient, w).catch(() => null)
      if (adapted && adapted.length) {
        if (!byFamily.miner) byFamily.miner = []
        byFamily.miner.push(...adapted)
      }
      return
    }

    let limit = Math.max((w.deviceIds || []).length, 1)
    try {
      const countRes = await mdkClient.pullTelemetry(anchor, { type: 'count' })
      if (countRes && countRes.count > 0) limit = countRes.count
    } catch {}

    const query = { type: 'list', limit }
    if (opts.status) query.status = true
    const tel = await mdkClient.pullTelemetry(anchor, query)
    const things = (tel && tel.things) || []
    if (!things.length) {
      // Container worker is registered but returned no things (e.g. MQTT broker
      // initialising before its first snap). Add a stub using the device ID so the
      // container card still appears in the overview.
      if (family === 'container' && anchor !== w.workerId) {
        if (!byFamily[family]) byFamily[family] = []
        byFamily[family].push({ id: anchor, code: anchor, info: { container: anchor }, last: {}, workerId: w.workerId })
      }
      return
    }

    if (!byFamily[family]) byFamily[family] = []
    for (const thg of things) byFamily[family].push({ ...thg, workerId: w.workerId })
  }))

  return { workers, byFamily, pools }
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

module.exports = { loadSite, snapStats, snapConfig, requestClient, pullPoolStats, pullPoolStatsHistory, WORKER_FAMILY, resolveFamily }
