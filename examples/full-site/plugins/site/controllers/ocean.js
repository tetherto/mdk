'use strict'

const { loadSite } = require('../lib/site')

const BTC_SATS = 1e8

// Only the Ocean-backed minerpool worker serves the DATUM keys; poolType comes
// from the worker itself (PoolService.appendPoolType / the MiningOS worker's
// POOL_TYPE), so it identifies both the in-repo manager and the HRPC bridge.
const OCEAN_POOL_TYPE = 'ocean'

// hp-svc-facs-http hands back the parsed body, but the DATUM gateway is also
// reachable through JSON-RPC-style wrappers in some deployments — unwrap either.
function unwrap (data) {
  if (!data || typeof data !== 'object') return null
  if (data.result && typeof data.result === 'object') return data.result
  return data
}

function num (v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

// A pull that fails (remote down, key unknown to this pool worker, DATUM admin
// credentials absent) must not take the whole tab down — every section is
// independently optional, and the UI renders what arrived.
function pull (mdkClient, deviceId, query) {
  return mdkClient
    .pullTelemetry(deviceId, { type: 'ext_data', ...query })
    .then((tel) => (tel && tel.extData) || null)
    .catch(() => null)
}

function mapAccount (stat) {
  return {
    username: stat.username || '',
    timestamp: num(stat.timestamp),
    hashrate: num(stat.hashrate),
    hashrate1h: num(stat.hashrate_1h),
    hashrate24h: num(stat.hashrate_24h),
    hashrateStale1h: num(stat.hashrate_stale_1h),
    hashrateStale24h: num(stat.hashrate_stale_24h),
    balanceBtc: num(stat.balance),
    unsettledBtc: num(stat.unsettled),
    revenue24hBtc: num(stat.revenue_24h),
    estimatedTodayIncomeSats: num(stat.estimated_today_income),
    workerCount: num(stat.worker_count),
    activeWorkersCount: num(stat.active_workers_count)
  }
}

function mapWorker (w) {
  return {
    id: String(w.id != null ? w.id : w.name),
    name: w.name || '',
    username: w.username || '',
    online: !!w.online,
    lastUpdated: num(w.last_updated),
    hashrate: num(w.hashrate),
    hashrate1h: num(w.hashrate_1h),
    hashrate24h: num(w.hashrate_24h)
  }
}

function mapAlerts (extData) {
  const alerts = (extData && Array.isArray(extData.alerts)) ? extData.alerts : []
  return alerts.map((a) => ({
    uuid: a.uuid || a.name,
    name: a.name || '',
    description: a.description || '',
    severity: a.severity || 'medium',
    createdAt: num(a.createdAt)
  }))
}

// thread-stats is keyed by stratum thread id: { "0": { connection_count, ... } }.
function mapThreads (extData) {
  const src = unwrap(extData)
  if (!src) return []
  return Object.entries(src)
    .filter(([, v]) => v && typeof v === 'object')
    .map(([id, v]) => ({
      id,
      connectionCount: num(v.connection_count),
      subscriptionCount: num(v.subscription_count),
      approxHashrateThs: num(v.approx_hashrate)
    }))
    .sort((a, b) => Number(a.id) - Number(b.id))
}

// stratum-list is nested thread → client: { "0": { "3": { ... } } }. Admin-only
// on the gateway, so it is routinely absent.
function mapClients (extData) {
  const src = unwrap(extData)
  if (!src) return []
  const rows = []
  for (const [threadId, clients] of Object.entries(src)) {
    if (!clients || typeof clients !== 'object') continue
    for (const [clientId, c] of Object.entries(clients)) {
      if (!c || typeof c !== 'object') continue
      rows.push({
        id: `${threadId}:${clientId}`,
        threadId,
        remoteHost: c.remote_host || '',
        authUsername: c.auth_username || '',
        subscribed: !!c.subscribed,
        sid: c.sid || '',
        sidTimeS: num(c.sid_time),
        lastShareS: c.last_share == null ? -1 : Number(c.last_share),
        vdiff: num(c.vdiff),
        acceptedDiff: num(c.accepted_diff),
        acceptedCount: num(c.accepted_count),
        rejectedDiff: num(c.rejected_diff),
        rejectedCount: num(c.rejected_count),
        rejectedPct: num(c.rejected_percentage),
        // "N/A" until the client has an accepted share.
        hashrateThs: c.hash_rate === 'N/A' ? null : num(c.hash_rate),
        hashrateAgeS: num(c.hash_rate_age),
        coinbase: c.coinbase || '',
        useragent: c.useragent || ''
      })
    }
  }
  return rows.sort((a, b) => (b.hashrateThs || 0) - (a.hashrateThs || 0))
}

// coinbaser is an address → sats map of the outputs DATUM would pay this template to.
function mapCoinbaser (extData) {
  const src = unwrap(extData)
  if (!src) return []
  return Object.entries(src)
    .filter(([, v]) => typeof v === 'number')
    .map(([address, sats]) => ({ address, valueSats: sats, valueBtc: sats / BTC_SATS }))
    .sort((a, b) => b.valueSats - a.valueSats)
}

function mapClientStats (extData) {
  const s = unwrap(extData)
  if (!s) return null
  return {
    acceptedShares: num(s.acceptedShares),
    acceptedSharesDiff: num(s.acceptedSharesDiff),
    rejectedShares: num(s.rejectedShares),
    rejectedSharesDiff: num(s.rejectedSharesDiff),
    ready: !!s.ready,
    poolHost: s.poolHost || '',
    poolTag: s.poolTag || '',
    minerTag: s.minerTag || '',
    poolMinDiff: num(s.poolMinDiff),
    poolPubKey: s.poolPubKey || '',
    uptimeS: num(s.uptime)
  }
}

function mapStratumInfo (extData) {
  const s = unwrap(extData)
  if (!s) return null
  return {
    activeThreads: num(s.activeThread),
    totalConnections: num(s.totalConnections),
    totalWorkSubscriptions: num(s.totalWorkSubscriptions),
    estimatedHashrateThs: num(s.estimatedHashrate)
  }
}

// current_stratum_job answers { error: "No stratum job" } when the gateway has
// no template yet — that is a state to show, not a failure.
function mapJob (extData) {
  const j = unwrap(extData)
  if (!j) return null
  if (j.error) return { error: String(j.error) }
  return {
    blockHeight: num(j.block_height),
    blockValueBtc: num(j.block_value) / BTC_SATS,
    previousBlock: j.previous_block || '',
    blockDifficulty: num(j.block_difficulty),
    bits: j.bits || '',
    versionHex: (j.block_version && j.block_version.hex) || '',
    timeCurrent: num(j.time && j.time.current),
    sizeBytes: num(j.size),
    weight: num(j.weight),
    sigops: num(j.sigops),
    txCount: num(j.tx_count)
  }
}

// Detail view for the Ocean minerpool worker (miningos-wrk-minerpool-ocean, or
// the in-repo manager standing in for it): everything the pool card on
// /site/overview leaves out — per-account hashrate, the worker list and
// component alerts — plus the DATUM gateway surface the
// same worker proxies (`datum-*`, `stratum-*`, `thread-stats`, `coinbaser`).
//
// Every section is pulled independently and may be null: the bundled REST mock
// backs only the Ocean keys (PoolService has no DATUM keys at all), and the
// gateway's client-list and configuration endpoints need an admin password.
//
// `ctx` is a test-only seam — see overview.js.
module.exports = async function ocean (req, ctx) {
  const mdkClient = ctx === undefined ? require('../lib/client') : ctx.mdkClient
  const { pools } = await loadSite(mdkClient)
  const now = Date.now()

  const bundles = await Promise.all(pools.map(async (p) => {
    const stats = await pull(mdkClient, p.deviceId, { key: 'stats' })
    const accounts = (stats && Array.isArray(stats.stats)) ? stats.stats : []
    const poolType = (accounts[0] && accounts[0].poolType) || null
    if (poolType !== OCEAN_POOL_TYPE) return null

    const [workers, alerts, datumStats, clientStats, stratumInfo, job, threads, clients, coinbaser] =
      await Promise.all([
        pull(mdkClient, p.deviceId, { key: 'workers', offset: 0, limit: 100 }),
        pull(mdkClient, p.deviceId, { key: 'alerts' }),
        pull(mdkClient, p.deviceId, { key: 'datum-stats' }),
        pull(mdkClient, p.deviceId, { key: 'datum-client-stats' }),
        pull(mdkClient, p.deviceId, { key: 'stratum-info' }),
        pull(mdkClient, p.deviceId, { key: 'stratum-job' }),
        pull(mdkClient, p.deviceId, { key: 'thread-stats' }),
        pull(mdkClient, p.deviceId, { key: 'stratum-list' }),
        pull(mdkClient, p.deviceId, { key: 'coinbaser' })
      ])

    const datum = (datumStats && datumStats.datum) || null
    const gateway = {
      status: datum ? (datum.status || 'unknown') : null,
      error: datum ? (datum.error || null) : null,
      connections: datum ? num(datum.connections) : 0,
      hashrateThs: datum ? num(datum.hashrate) : 0,
      clientStats: mapClientStats(clientStats),
      stratumInfo: mapStratumInfo(stratumInfo),
      job: mapJob(job),
      threads: mapThreads(threads),
      clients: mapClients(clients),
      coinbaser: mapCoinbaser(coinbaser)
    }

    return {
      deviceId: p.deviceId,
      workerId: p.workerId,
      poolType,
      ts: num(stats && stats.ts),
      accounts: accounts.map(mapAccount),
      workers: ((workers && Array.isArray(workers.workers)) ? workers.workers : []).map(mapWorker),
      workersTs: num(workers && workers.ts),
      alerts: mapAlerts(alerts),
      // `false` is the signal the UI needs to say "this worker serves no DATUM
      // keys" rather than "the gateway is down".
      gatewayAvailable: datum != null || gateway.stratumInfo != null || gateway.clientStats != null,
      gateway
    }
  }))

  return { ts: now, pools: bundles.filter(Boolean) }
}
