'use strict'

const mdkClient = require('./client')

// The vocabularies the agent tool contract defines. Duplicated rather than
// imported: this plugin is CJS and the contract ships as ESM.
const AXIS = {
  family: ['miner', 'container', 'powermeter', 'sensor', 'pool', 'all'],
  state: ['all', 'online', 'offline', 'error'],
  metric: ['hashrate', 'power', 'temperature', 'efficiency', 'uptime'],
  order: ['desc', 'asc']
}

// The Worker's family in the tool vocabulary: from its status row (the contract's
// metadata.deviceFamily, null until the Worker has been READY once, absent from an
// older Kernel), else guessed from the worker id since device ids here are UUIDs.
const FAMILY_BY_DEVICE_FAMILY = { miner: 'miner', container: 'container', 'power-meter': 'powermeter', powermeter: 'powermeter', sensor: 'sensor', minerpool: 'pool' }
const WORKER_FAMILY = [
  { test: /powermeter|power-meter|satec|meter/i, family: 'powermeter' },
  { test: /pool/i, family: 'pool' },
  { test: /sensor|temperature/i, family: 'sensor' },
  { test: /container/i, family: 'container' },
  { test: /miner/i, family: 'miner' }
]
function classifyWorker (worker) {
  const declared = FAMILY_BY_DEVICE_FAMILY[worker.deviceFamily]
  if (declared) return declared
  const match = WORKER_FAMILY.find((e) => e.test.test(worker.workerId))
  return match ? match.family : 'other'
}

// One row per device, with readiness expressed in the contract's state vocabulary.
function collectDevices (status) {
  const rows = []
  for (const w of (status?.workers ?? [])) {
    const state = w.state === 'READY' ? 'online' : 'offline'
    for (const id of (w.deviceIds ?? [])) {
      rows.push({ deviceId: id, family: classifyWorker(w), state, worker: w.workerId })
    }
  }
  return rows
}

const matches = (row, family, state) =>
  (family === 'all' || row.family === family) && (state === 'all' || row.state === state)

const plural = (family, n) => `${family === 'all' ? 'device' : family}${n === 1 ? '' : 's'}`

/**
 * A count with its noun attached, and zero spelled as a word.
 *
 * Written for how a 4B reads a summary rather than for brevity. "2 devices across 1 workers — 2
 * online, 0 offline" was misread ten times in twelve: the plural disagreement on "1 workers"
 * invites the salient 2, the online count is not attached to any noun so it lands on both, and a
 * bare "0 offline" came back as "two devices are offline" — a zero reported as the total. Every
 * number here is glued to what it counts, so there is nothing to reattach.
 */
const counted = (n, noun) => `${n === 0 ? 'no' : n} ${noun}${n === 1 ? '' : 's'}`

const METRIC_FIELDS = {
  hashrate: ['hashrate_avg', 'hashrate_rt', 'hashrate'],
  power: ['power', 'active_power'],
  temperature: ['temperature'],
  efficiency: ['efficiency'],
  uptime: ['uptime']
}
function readMetric (telemetry, metric) {
  const metrics = telemetry?.metrics ?? telemetry ?? {}
  for (const field of METRIC_FIELDS[metric]) {
    if (typeof metrics[field] === 'number') return metrics[field]
  }
  return null
}

// Fan out in bounded batches — one Promise.all over the whole fleet would
// open that many HRPC calls at once.
const TELEMETRY_CONCURRENCY = 8
async function mapInBatches (items, fn) {
  const results = []
  for (let i = 0; i < items.length; i += TELEMETRY_CONCURRENCY) {
    results.push(...await Promise.all(items.slice(i, i + TELEMETRY_CONCURRENCY).map(fn)))
  }
  return results
}

// Keyed by contract metadata.brand, as the owning Worker's status row carries
// it — the only power-mode signal for a UUID device id.
const POWER_MODES_BY_BRAND = {
  Whatsminer: ['low', 'normal', 'high', 'sleep'],
  Antminer: ['sleep', 'normal'],
  // The modes all three series accept; A2 also takes low_power.
  SealMiner: ['normal', 'high_performance', 'sleep'],
  Avalon: ['normal', 'high', 'sleep']
}
async function powerModesFor (deviceId) {
  const status = await mdkClient.getStatus().catch(() => null)
  const owner = (status?.workers ?? []).find((w) => (w.deviceIds ?? []).includes(deviceId))
  const brand = owner?.brand
  const modes = brand ? POWER_MODES_BY_BRAND[brand] : null
  return modes
    ? { deviceId, brand, supportedPowerModes: modes }
    : { deviceId, supportedPowerModes: null, reason: 'device type not recognised' }
}

const json = (payload) => ({ content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] })

const isEmpty = (v) => v == null || (typeof v === 'object' && !Object.keys(v).length)

module.exports = { AXIS, classifyWorker, collectDevices, counted, matches, plural, readMetric, mapInBatches, powerModesFor, isEmpty, json }
