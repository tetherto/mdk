'use strict'

// Shared helpers for the site plugin controllers. Every ORK access goes through
// the injected mdkClient (RPC gateway) — controllers never reach further down.

// List workers and classify each by its contract's deviceFamily (the real MDK
// classification, robust to thing-type naming). Thing workers (miner, container,
// power-meter) get one list pull — with { status: true } each thing carries its
// latest snapshot (thg.last.snap), so the live site is assembled from one call
// per worker, not one per miner. The minerpool is a scheduler worker with no
// things; it is exposed only as { workerId, deviceId } for ext_data pulls.
async function loadSite (mdkClient, opts = {}) {
  if (!mdkClient) throw new Error('ERR_MDK_CLIENT_UNAVAILABLE')

  const res = await mdkClient.listWorkers()
  const workers = (res && res.workers) || []

  const byFamily = {}
  let pool = null

  await Promise.all(workers.map(async (w) => {
    const deviceIds = w.deviceIds || []
    if (!deviceIds.length) return

    const cfg = await mdkClient.pullTelemetry(deviceIds[0], { type: 'config' })
    const family = cfg && cfg.config && cfg.config.contract && cfg.config.contract.deviceFamily

    if (family === 'minerpool') {
      pool = { workerId: w.workerId, deviceId: deviceIds[0] }
      return
    }

    const query = { type: 'list', limit: 10000 }
    if (opts.status) query.status = true
    const tel = await mdkClient.pullTelemetry(deviceIds[0], query)
    const things = (tel && tel.things) || []
    if (!byFamily[family]) byFamily[family] = []
    for (const thg of things) byFamily[family].push({ ...thg, workerId: w.workerId })
  }))

  return { workers, byFamily, pool }
}

function snapStats (thg) {
  return (thg && thg.last && thg.last.snap && thg.last.snap.stats) || {}
}

function snapConfig (thg) {
  return (thg && thg.last && thg.last.snap && thg.last.snap.config) || {}
}

module.exports = { loadSite, snapStats, snapConfig }
