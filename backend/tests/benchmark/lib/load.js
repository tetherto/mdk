'use strict'

// Load generators and the cycle-headroom / device-baseline measurements from
// capacity-metrics-template.md. Everything here goes through the same
// createMdkClient surface the Gateway and MCP plugins use (pullTelemetry,
// sendCommand, getStatus).
//
// Scope note: this harness measures read-path latency (single + aggregate),
// cycle headroom, sustained read throughput, command *submit* latency
// (Client -> Kernel dispatch accept), and — via pollAlerts below — how long
// after boot an induced alert first becomes visible through the Kernel. It
// does NOT measure the full push/vote/execute action-approval workflow, nor
// alert generation latency in isolation (synchronous inside the Worker
// process — needs in-process instrumentation this harness doesn't have),
// nor Gateway/fan-out/history alert delivery (the harness's own
// fleet-summary plugin has no alerts endpoint). Reports leave those
// template rows blank with a note, per the template's "partial fills are
// fine" guidance.

const net = require('net')
const { LatencyRecorder } = require('./latency')

async function mapWithConcurrency (items, limit, fn) {
  const results = new Array(items.length)
  let idx = 0
  let inFlight = 0
  let peakInFlight = 0
  async function worker () {
    while (idx < items.length) {
      const i = idx++
      inFlight++
      peakInFlight = Math.max(peakInFlight, inFlight)
      try {
        results[i] = await fn(items[i], i)
      } finally {
        inFlight--
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker))
  return { results, peakInFlight }
}

// A Worker answers an offline or failing device with a normal response that
// carries the failure in its payload (`{ error: 'ERR_DEVICE_UNAVAILABLE: …' }`,
// a `FAILED` command result, or per-channel `{ error }` metrics) rather than
// rejecting the call. Every timed call goes through one of these so a fast
// error reply counts as an error, never as a successful round trip.
//
// `snap` is checked on its own: it is the one channel that always reads the
// device live, and it reports a failed read as `{ success: false }` rather
// than `{ error }`. The other channels read through the miner's 5s
// fetchDeviceData cache (backend/core/mdk/lib/things/miner.js), so for up to
// 5s after a device stops answering they still return its last values.
function assertTelemetry (res) {
  if (res && res.error) throw new Error(String(res.error))
  const metrics = res && res.metrics
  if (!metrics || typeof metrics !== 'object') throw new Error('ERR_BENCH_TELEMETRY_EMPTY')
  const channels = Object.values(metrics)
  if (channels.length && channels.every((v) => v && v.error)) throw new Error(String(channels[0].error))
  const snap = metrics.snap
  if (snap && snap.success === false) {
    const detail = (snap.stats && snap.stats.errors && snap.stats.errors[0] && snap.stats.errors[0].msg) || (snap.stats && snap.stats.status)
    throw new Error(`ERR_BENCH_SNAP_FAILED: ${detail}`)
  }
  return res
}

function assertCommand (res) {
  const result = res && res.result && res.result.status ? res.result : res
  if (result && result.error) throw new Error(String(result.error))
  if (result && result.status === 'FAILED') throw new Error('ERR_BENCH_COMMAND_FAILED')
  return res
}

// First ERR_* code in an error's message (or a short prefix of a code-less
// message), tallied per load phase so a report says why calls failed, not
// only how many did.
function errorCode (err) {
  const msg = err && err.message ? err.message : String(err)
  const m = msg.match(/ERR_[A-Z0-9_]+/)
  return m ? m[0] : msg.slice(0, 60)
}

function tally (counts, err) {
  const code = errorCode(err)
  counts[code] = (counts[code] || 0) + 1
}

function classifyError (err) {
  return /timeout/i.test(err && err.message ? err.message : String(err)) ? 'timedOut' : 'rejected'
}

// One full sweep of `deviceIds` per worker, at `concurrency` in flight,
// repeated `rounds` times. Returns per-worker cycle time samples (ms) —
// compare against the configured telemetry interval for headroom.
async function measureCycleHeadroom ({ client, workerDeviceMap, concurrency, rounds = 3, recorder }) {
  const byWorker = {}
  for (const [workerId, deviceIds] of Object.entries(workerDeviceMap)) {
    const cycleMsSamples = []
    let rejected = 0
    let timedOut = 0
    for (let r = 0; r < rounds; r++) {
      const start = process.hrtime.bigint()
      await mapWithConcurrency(deviceIds, concurrency, async (id) => {
        const t0 = process.hrtime.bigint()
        try {
          assertTelemetry(await client.pullTelemetry(id, 'metrics'))
          recorder.record(Number(process.hrtime.bigint() - t0) / 1e6)
        } catch (err) {
          recorder.recordError()
          if (classifyError(err) === 'timedOut') timedOut++
          else rejected++
        }
      })
      cycleMsSamples.push(Number(process.hrtime.bigint() - start) / 1e6)
    }
    byWorker[workerId] = {
      deviceCount: deviceIds.length,
      cycleMsSamples,
      avgCycleMs: cycleMsSamples.reduce((a, b) => a + b, 0) / cycleMsSamples.length,
      maxCycleMs: Math.max(...cycleMsSamples),
      rejected,
      timedOut
    }
  }
  return byWorker
}

// Sustained read load at fixed concurrency for durationMs. Records per-call
// latency into `recorder` and tallies throughput/backpressure.
async function runReadLoad ({ client, deviceIds, durationMs, concurrency, recorder }) {
  const end = Date.now() + durationMs
  let completed = 0
  let rejected = 0
  let timedOut = 0
  let peakInFlight = 0
  let inFlight = 0
  const errorCodes = {}

  async function worker () {
    while (Date.now() < end) {
      const id = deviceIds[Math.floor(Math.random() * deviceIds.length)]
      inFlight++
      peakInFlight = Math.max(peakInFlight, inFlight)
      const t0 = process.hrtime.bigint()
      try {
        assertTelemetry(await client.pullTelemetry(id, 'metrics'))
        recorder.record(Number(process.hrtime.bigint() - t0) / 1e6)
        completed++
      } catch (err) {
        recorder.recordError()
        tally(errorCodes, err)
        if (classifyError(err) === 'timedOut') timedOut++
        else rejected++
      } finally {
        inFlight--
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, worker)
  const wallStart = Date.now()
  await Promise.all(workers)
  const wallMs = Date.now() - wallStart

  return {
    completed,
    rejected,
    timedOut,
    peakQueueDepth: peakInFlight,
    errorCodes,
    readsPerSec: wallMs > 0 ? completed / (wallMs / 1000) : 0
  }
}

// Fixed-rate command submissions (Client -> Kernel dispatch accept). Open-loop:
// a new submission is fired every intervalMs regardless of whether earlier
// ones have resolved, so the achieved rate is actually ratePerSec (bounded
// by real backpressure/rejects) instead of collapsing to 1/latency — awaiting
// each submit before scheduling the next would just measure single-stream
// latency, not throughput capacity. Not a full approve/execute/e2e
// measurement — see module header.
async function runActionLoad ({ client, deviceIds, durationMs, ratePerSec, recorder, actionType, actionParams }) {
  const end = Date.now() + durationMs
  const intervalMs = 1000 / Math.max(ratePerSec, 0.001)
  let completed = 0
  let rejected = 0
  let timedOut = 0
  let inFlight = 0
  let peakInFlight = 0
  const pending = new Set()
  const errorCodes = {}

  function submit () {
    const id = deviceIds[Math.floor(Math.random() * deviceIds.length)]
    const t0 = process.hrtime.bigint()
    inFlight++
    peakInFlight = Math.max(peakInFlight, inFlight)
    const p = client.sendCommand(id, actionType, actionParams || {})
      .then((res) => {
        assertCommand(res)
        recorder.record(Number(process.hrtime.bigint() - t0) / 1e6)
        completed++
      })
      .catch((err) => {
        recorder.recordError()
        tally(errorCodes, err)
        if (classifyError(err) === 'timedOut') timedOut++
        else rejected++
      })
      .finally(() => {
        inFlight--
        pending.delete(p)
      })
    pending.add(p)
  }

  const wallStart = Date.now()
  while (Date.now() < end) {
    const tickStart = Date.now()
    submit()
    const elapsed = Date.now() - tickStart
    if (elapsed < intervalMs) await new Promise((resolve) => setTimeout(resolve, intervalMs - elapsed))
  }
  await Promise.all(pending)
  const wallMs = Date.now() - wallStart

  return {
    completed,
    rejected,
    timedOut,
    peakInFlight,
    errorCodes,
    actionsPerSec: wallMs > 0 ? completed / (wallMs / 1000) : 0
  }
}

// Best-effort "device-only" baseline: a raw TCP connect against the mock's
// listening port, bypassing MDK and the vendor protocol entirely. This is a
// FLOOR, not the real device round trip (it excludes protocol parse/auth
// time) — label it "approximate: TCP connect only" wherever it's reported.
// A protocol-accurate probe would need to speak the vendor's wire format
// directly, which is out of scope for a
// device-family-agnostic harness.
function tcpConnectLatencyMs (host, port, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    const t0 = process.hrtime.bigint()
    const socket = net.createConnection({ host, port, timeout: timeoutMs })
    socket.once('connect', () => {
      const ms = Number(process.hrtime.bigint() - t0) / 1e6
      socket.destroy()
      resolve(ms)
    })
    socket.once('timeout', () => { socket.destroy(); reject(new Error('ERR_TIMEOUT')) })
    socket.once('error', reject)
  })
}

async function measureDeviceBaseline ({ devices, recorder, sampleSize = 20 }) {
  const sample = devices.slice(0, Math.min(sampleSize, devices.length))
  for (const d of sample) {
    try {
      const ms = await tcpConnectLatencyMs(d.opts.address, d.opts.port)
      recorder.record(ms)
    } catch {
      recorder.recordError()
    }
  }
  return recorder.summary()
}

// Polls the fleet for induced alerts (see ALERT_INDUCTION in
// lib/constants.js — every device's temperature-warning threshold is
// forced far below any real reading) from the moment the caller starts this
// poller until stop() is called, recording one "time since poll start"
// latency sample the first time each device shows a non-empty alerts list.
// This is the only externally observable half of the alerts path: the
// Worker computes alerts synchronously right after each snap (see
// SnapsService), so what this actually measures is "how long since we
// started watching did the Kernel-visible alert show up" — bounded below by
// intervalMs, and by the Worker's own (never-overridden) snap cadence
// above: if that cadence is longer than the caller's observation window,
// n stays 0 and that's an honest result, not a bug.
//
// `type: 'list', status: true` is the only telemetry query that surfaces
// `last.alerts` (see service-builtins.js) — it answers per-Worker (one
// query per worker, via any one of its device ids), not per-device.
// Shared "run pollOnce every intervalMs until stop()" driver for the two
// alerts pollers below — they differ only in how one poll round actually
// fetches alerts (Kernel client vs Gateway HTTP), not in the timing loop.
function runPoller (pollOnce, intervalMs) {
  let stopped = false
  const loop = (async () => {
    for (;;) {
      await pollOnce()
      if (stopped) break
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
      if (stopped) break
    }
  })()
  return { stop: async () => { stopped = true; await loop } }
}

function pollAlerts ({ client, workerDeviceMap, intervalMs = 1000 }) {
  const recorder = new LatencyRecorder('alertVisibleViaKernel')
  const seenDeviceIds = new Set()
  const byName = {}
  const startedAt = Date.now()

  async function pollOnce () {
    for (const deviceIds of Object.values(workerDeviceMap)) {
      if (!deviceIds.length) continue
      let res
      try {
        // `list` pages at 100 devices by default; ask for the Worker's whole set.
        res = await client.pullTelemetry(deviceIds[0], { type: 'list', status: true, limit: deviceIds.length })
      } catch {
        continue
      }
      for (const thg of (res && res.things) || []) {
        const alerts = thg.last && thg.last.alerts
        if (!Array.isArray(alerts) || !alerts.length || seenDeviceIds.has(thg.id)) continue
        seenDeviceIds.add(thg.id)
        recorder.record(Date.now() - startedAt)
        for (const a of alerts) byName[a.name] = (byName[a.name] || 0) + 1
      }
    }
  }

  const poller = runPoller(pollOnce, intervalMs)
  return { recorder, byName, seenDeviceIds, stop: poller.stop }
}

// Same idea as pollAlerts, but through the Gateway's own per-device alerts
// route instead of the Kernel client directly — the "Alert visible via
// Gateway" half of the alerts path pollAlerts can't reach on its own.
// fetchDeviceAlerts is caller-supplied (processes/run-process.js builds it
// with fetch() against GATEWAY_DEFAULTS.deviceAlertsPath) so this module
// stays HTTP-client agnostic, matching the rest of lib/load.js.
function pollAlertsViaGateway ({ fetchDeviceAlerts, allDeviceIds, intervalMs = 1000 }) {
  const recorder = new LatencyRecorder('alertVisibleViaGateway')
  const seenDeviceIds = new Set()
  const byName = {}
  const startedAt = Date.now()

  async function pollOnce () {
    for (const deviceId of allDeviceIds) {
      if (seenDeviceIds.has(deviceId)) continue
      let alerts
      try {
        alerts = await fetchDeviceAlerts(deviceId)
      } catch {
        continue
      }
      if (!Array.isArray(alerts) || !alerts.length) continue
      seenDeviceIds.add(deviceId)
      recorder.record(Date.now() - startedAt)
      for (const a of alerts) byName[a.name] = (byName[a.name] || 0) + 1
    }
  }

  const poller = runPoller(pollOnce, intervalMs)
  return { recorder, byName, seenDeviceIds, stop: poller.stop }
}

module.exports = {
  assertTelemetry,
  assertCommand,
  errorCode,
  mapWithConcurrency,
  measureCycleHeadroom,
  runReadLoad,
  runActionLoad,
  measureDeviceBaseline,
  tcpConnectLatencyMs,
  pollAlerts,
  pollAlertsViaGateway
}
