'use strict'

// Shared helpers for the site plugin controllers. Every Kernel access goes through
// the injected mdkClient (RPC listener) — controllers never reach further down.

// Fallback when a config pull fails or omits deviceFamily — keyed by stable workerId.
const WORKER_FAMILY = {
  'whatsminer-worker': 'miner',
  'antminer-worker': 'miner',
  'avalon-worker': 'miner',
  'container-worker': 'container',
  'antspace-worker': 'container',
  'bitdeer-worker': 'container',
  'powermeter-worker': 'power-meter',
  'satec-powermeter-worker': 'power-meter',
  'schneider-powermeter-worker': 'power-meter',
  'seneca-sensor-worker': 'sensor',
  'minerpool-worker': 'minerpool',
  'f2pool-worker': 'minerpool'
}

function resolveFamily (worker, cfg) {
  const fromContract = cfg && cfg.config && cfg.config.contract && cfg.config.contract.deviceFamily
  if (fromContract) return fromContract
  return WORKER_FAMILY[worker.workerId] || null
}

function telemetryAnchor (worker) {
  const deviceIds = worker.deviceIds || []
  return deviceIds[0] || worker.workerId
}

// List workers and classify each by deviceFamily (contract or workerId fallback).
// One list pull per worker — with { status: true } each thing carries its latest
// snapshot (thg.last.snap). The minerpool is a scheduler worker with no things.
async function loadSite (mdkClient, opts = {}) {
  if (!mdkClient) throw new Error('ERR_MDK_CLIENT_UNAVAILABLE')

  const res = await mdkClient.listWorkers()
  const workers = (res && res.workers) || []

  const byFamily = {}
  const pools = []

  await Promise.all(workers.map(async (w) => {
    if (w.state === 'TERMINATED' || w.healthState === 'DEAD') return

    const anchor = telemetryAnchor(w)
    const cfg = await mdkClient.pullTelemetry(anchor, { type: 'config' })
    const family = resolveFamily(w, cfg)

    if (family === 'minerpool') {
      pools.push({ workerId: w.workerId, deviceId: anchor })
      return
    }

    if (!family) return

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

function snapStats (thg) {
  return (thg && thg.last && thg.last.snap && thg.last.snap.stats) || {}
}

function snapConfig (thg) {
  return (thg && thg.last && thg.last.snap && thg.last.snap.config) || {}
}

module.exports = { loadSite, snapStats, snapConfig, WORKER_FAMILY, resolveFamily }
