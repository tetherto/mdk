'use strict'

// Single per-process entrypoint for the benchmark harness: one role per OS
// process, selected by --role (defaulting to `profile`, the only role a
// human ever needs to ask for directly). `profile` is the coordinator: it
// spawns mocks, Kernel, every Worker, and a Gateway as their own child
// process (the same split a real MDK deployment runs under PM2, each
// self-invoked with an explicit --role), waits for each to report ready,
// then drives load and samples every child's CPU/RSS by pid — never
// in-process, so numbers are always per-process, never a blended combined
// figure.
//
// Usage:
//   node processes/run-process.js
//   node processes/run-process.js --devices 250 --workers 1 --type mdk-worker-avalon --model a1346 --id cap-250devices-1workers --sweep ceiling
//   node processes/run-process.js --role kernel --id cap-10devices-1workers --root <path>   (debugging one role)

const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const { spawn } = require('child_process')
const { createMdkClient } = require('@tetherto/mdk-client')
const {
  config, loadConfig, profileRoot, makeDevicePlan, saveDevicePlan, loadDevicePlan,
  startMocks, bootKernel, bootWorker, bootGateway, workerStoreDir, harnessClientConfig, gatewayTokenSource
} = require('../lib/site')
const { DEFAULT_WORKER_TYPE, DEFAULT_MODEL, ALERT_INDUCTION, WORKER_CONF_DEFAULTS, WORKER_LOG_CACHE_WARMUP_MS, MINER_DEVICE_TIMEOUT_MS, DEFAULT_THING_RTD_CONCURRENCY, KERNEL_DEFAULTS, GATEWAY_DEFAULTS, RUN_REPRODUCIBILITY, THRESHOLDS } = require('../lib/constants')
const { ResourceSampler, dirSizeBytes } = require('../lib/metrics')
const { LatencyRecorder } = require('../lib/latency')
const { assertTelemetry, assertCommand, errorCode, mapWithConcurrency, measureCycleHeadroom, runReadLoad, runActionLoad, measureDeviceBaseline, pollAlerts, pollAlertsViaGateway } = require('../lib/load')
const { writeReport } = require('../lib/report')

const RESULTS_DIR = path.join(__dirname, '..', 'results')

// Gateway app routes are RBAC-gated: every harness HTTP call carries a bearer
// token from `gatewayAuth` (see gatewayTokenSource in lib/site.js).
async function authHeaders (gatewayAuth) {
  return gatewayAuth ? { authorization: `Bearer ${await gatewayAuth.getToken()}` } : {}
}

function arg (name, fallback) {
  const i = process.argv.indexOf(name)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

// A --devices/--workers CLI override describes pure capacity scaling (same
// worker type/model throughout, just more of them) — type/model default to
// DEFAULT_WORKER_TYPE/DEFAULT_MODEL but can be pinned via --type/--model so
// scenarios/benchmark.js can sweep each config.workers entry's own family.
// With no override at all, config.workers (a heterogeneous fleet) is used
// as-is.
function buildHomogeneousWorkers ({ deviceCount, workerCount, type = DEFAULT_WORKER_TYPE, model = DEFAULT_MODEL }) {
  const base = Math.floor(deviceCount / workerCount)
  const extra = deviceCount % workerCount
  return Array.from({ length: workerCount }, (_, i) => ({
    type,
    model,
    devices: base + (i < extra ? 1 : 0),
    simulateMocks: true
  }))
}

// Priority: --workers-json (scenarios/benchmark.js's combination sweep —
// every config.workers entry simultaneously, each at that combination's own
// device count) > --devices/--workers (a single ad-hoc family, all of it on
// one Worker unless --workers says otherwise) > config.workers as-is (each
// entry at its own ceiling.maxDeviceCount, or ceiling.startDeviceCount if
// that's 0/uncapped, since there's no static device count to boot at
// otherwise). --id/--sweep only label the run's output files.
function resolveProfileSpec () {
  const id = arg('--id')
  const workersJsonArg = arg('--workers-json')
  const devicesArg = arg('--devices')
  const workersArg = arg('--workers')
  const typeArg = arg('--type')
  const modelArg = arg('--model')
  const sweep = arg('--sweep', 'custom')

  let workers
  if (workersJsonArg) {
    workers = JSON.parse(workersJsonArg)
  } else if (devicesArg != null || workersArg != null) {
    workers = buildHomogeneousWorkers({
      deviceCount: Number(devicesArg || 10),
      workerCount: Number(workersArg || 1),
      type: typeArg,
      model: modelArg
    })
  } else {
    workers = config.workers.map(({ ceiling, ...spec }) => ({ ...spec, devices: ceiling.maxDeviceCount || ceiling.startDeviceCount }))
  }

  const deviceCount = workers.reduce((sum, w) => sum + w.devices, 0)
  const workerCount = workers.length
  const profileId = id || `cap-${deviceCount}devices-${workerCount}workers`
  return { profileId, sweep, workers, deviceCount, workerCount }
}

// --- child-process roles (mocks/Kernel/each Worker run as their own OS process) --
// mocks/worker read the device plan the `profile` role already computed and
// wrote to <root>/device-plan.json — recomputing it independently per process
// isn't safe once ports are randomly picked, since each process would pick
// different ones.

async function runMocksRole () {
  const root = arg('--root')
  const { workers } = loadDevicePlan(root)
  const mockSpecs = workers.filter((w) => w.simulateMocks).map((w) => ({ port: w.port, type: w.model, password: w.password }))
  const { ready, close } = startMocks(mockSpecs)
  await ready
  fs.writeFileSync(path.join(root, '.mocks-pid'), String(process.pid))
  const stop = () => { close(); process.exit(0) }
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
  console.log('MDK_READY mocks workers=%d pid=%d', mockSpecs.length, process.pid)
}

async function runKernelRole () {
  const root = arg('--root')
  fs.mkdirSync(root, { recursive: true })
  const kernel = await bootKernel({ root, mode: 'local' })
  const kernelKey = kernel.getPublicKey().toString('hex')
  fs.writeFileSync(path.join(root, '.kernel-key'), kernelKey, 'utf8')
  fs.writeFileSync(path.join(root, '.kernel-pid'), String(process.pid))
  console.log('MDK_READY kernel key=%s pid=%d', kernelKey, process.pid)
}

async function runWorkerRole () {
  const root = arg('--root')
  const workerIndex = Number(arg('--worker-index', 0))
  const { workers } = loadDevicePlan(root)
  const w = workers[workerIndex]
  const handle = await bootWorker({ workerId: w.workerId, type: w.type, model: w.model, kernel: null, root, mode: 'local', devices: w.devices })
  fs.writeFileSync(path.join(root, `.worker-${workerIndex}-pid`), String(process.pid))
  console.log('MDK_READY worker id=%s devices=%d pid=%d', w.workerId, handle.services.provisioning.listDeviceIds().length, process.pid)
}

// Reads the Kernel key the kernel role already wrote (same pattern as
// runWorkerRole reading the device plan) — the Gateway just needs a key to
// connect its own MDK client to, never an in-process Kernel handle, since
// it's always its own OS process here.
async function runGatewayRole () {
  const root = arg('--root')
  const port = Number(arg('--port'))
  const kernelKey = fs.readFileSync(path.join(root, '.kernel-key'), 'utf8').trim()
  const gateway = await bootGateway({ root, port, kernelKey })
  fs.writeFileSync(path.join(root, '.gateway-pid'), String(process.pid))
  const stop = () => { gateway.stop(() => process.exit(0)) }
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)
  console.log('MDK_READY gateway port=%d pid=%d', port, process.pid)
}

// --- profile role: runs the actual measurement checklist -------------------

function spawnRole (role, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [__filename, '--role', role, ...args], { stdio: ['ignore', 'pipe', 'pipe'] })
    console.log(`[spawn] role=${role} pid=${proc.pid} args=${JSON.stringify(args)}`)
    let settled = false
    proc.stdout.on('data', (chunk) => {
      const line = chunk.toString()
      process.stdout.write(`[${role}] ${line}`)
      if (!settled && line.includes('MDK_READY')) { settled = true; console.log(`[spawn] role=${role} pid=${proc.pid} ready`); resolve(proc) }
    })
    proc.stderr.on('data', (chunk) => process.stderr.write(`[${role}] ${chunk}`))
    proc.once('exit', (code, signal) => {
      console.log(`[spawn] role=${role} pid=${proc.pid} exited code=${code} signal=${signal}`)
      if (!settled) reject(new Error(`ERR_ROLE_EXITED_EARLY: ${role} exited with code ${code} before MDK_READY`))
    })
    proc.once('error', reject)
  })
}

async function stopChild (proc) {
  if (!proc || proc.exitCode !== null) return
  proc.kill('SIGTERM')
  await new Promise((resolve) => proc.once('exit', resolve))
}

// Real kill+restart/outage induction, run once after the steady-state
// checklist finishes (never during — a killed process mid-checklist would
// contaminate the capacity numbers the rest of the report depends on).
// RSS/FD slope per process come from resourceSamplers directly (see
// renderFailureBehaviour in lib/report.js) — no drill needed for those two.
async function runFailureDrills ({ client, devicePlan, allDeviceIds, commonArgs, procs }) {
  const rr = RUN_REPRODUCIBILITY
  const workerRestart = await drillWorkerRestart({ client, devicePlan, commonArgs, procs, timeoutMs: rr.workerRestartTimeoutMs, servingTimeoutMs: rr.restartServingTimeoutMs })
  const kernelRestart = await drillKernelRestart({ client, commonArgs, procs, timeoutMs: rr.kernelRestartTimeoutMs, sampleDeviceId: allDeviceIds[0], servingTimeoutMs: rr.restartServingTimeoutMs })
  const unreachableDevice = await drillDeviceOutage({
    client,
    allDeviceIds,
    commonArgs,
    procs,
    detectTimeoutMs: rr.outageDetectTimeoutMs,
    recoveryTimeoutMs: rr.outageRecoveryTimeoutMs,
    timeoutBudgetMs: MINER_DEVICE_TIMEOUT_MS,
    concurrency: DEFAULT_THING_RTD_CONCURRENCY
  })
  return { workerRestart, kernelRestart, unreachableDevice }
}

function replaceChild (procs, oldProc, newProc) {
  const i = procs.children.indexOf(oldProc)
  if (i !== -1) procs.children[i] = newProc
  else procs.children.push(newProc)
}

// Polls `check` every recoveryPollIntervalMs until it returns true or the
// absolute `deadline` (a Date.now() value) passes.
async function pollUntil (check, deadline) {
  while (Date.now() < deadline) {
    if (await check()) return true
    await new Promise((resolve) => setTimeout(resolve, RUN_REPRODUCIBILITY.recoveryPollIntervalMs))
  }
  return false
}

function readServed (client, deviceId) {
  return client.pullTelemetry(deviceId, 'metrics').then(assertTelemetry).then(() => true).catch(() => false)
}

// Kills worker-0, respawns it against the same root/device-plan, and polls
// until the Kernel's registry shows it READY again with its full device
// count restored, then until one of its devices answers a real read (READY
// is not the same as serving). A Worker's identity (like the Kernel's) is
// derived from its own on-disk store, so it persists across restarts, and
// the Kernel/local-discovery re-registers a worker that republishes the
// same key. Both times and both deadlines count from the kill.
async function drillWorkerRestart ({ client, devicePlan, commonArgs, procs, timeoutMs, servingTimeoutMs }) {
  const idx = 0
  const workerId = devicePlan.workers[idx].workerId
  const expectedDeviceCount = devicePlan.workers[idx].devices.length
  const oldProc = procs.workerProcs[idx]

  const t0 = Date.now()
  await stopChild(oldProc)
  const newProc = await spawnRole('worker', [...commonArgs, '--worker-index', String(idx)])
  procs.workerProcs[idx] = newProc
  replaceChild(procs, oldProc, newProc)

  let sampleDeviceId = null
  const recovered = await pollUntil(() => client.getStatus({ retries: 1 }).then((s) => {
    const w = s.workers.find((w) => w.workerId === workerId)
    const ok = !!(w && w.state === 'READY' && (w.deviceIds || []).length === expectedDeviceCount)
    if (ok) sampleDeviceId = w.deviceIds[0]
    return ok
  }).catch(() => false), t0 + timeoutMs)
  const ms = Date.now() - t0

  const servingRestored = recovered && await pollUntil(() => readServed(client, sampleDeviceId), t0 + servingTimeoutMs)
  return { workerId, deviceCount: expectedDeviceCount, recovered, ms, servingRestored, servingMs: servingRestored ? Date.now() - t0 : null }
}

// Kills the Kernel, respawns it against the same root (same on-disk
// identity, confirmed empirically), and polls the already-connected client
// until it answers again. Then keeps polling a real device read: a Kernel
// that answers getStatus has not necessarily rediscovered its Workers yet,
// so "READY" and "serving device reads again" are reported separately. Both
// times and both deadlines count from the kill.
async function drillKernelRestart ({ client, commonArgs, procs, timeoutMs, sampleDeviceId, servingTimeoutMs }) {
  const oldProc = procs.kernelProc
  const t0 = Date.now()
  await stopChild(oldProc)
  const newProc = await spawnRole('kernel', commonArgs)
  procs.kernelProc = newProc
  replaceChild(procs, oldProc, newProc)

  const recovered = await pollUntil(() => client.getStatus({ retries: 1 }).then(() => true).catch(() => false), t0 + timeoutMs)
  const ms = Date.now() - t0

  const servingRestored = recovered && await pollUntil(() => readServed(client, sampleDeviceId), t0 + servingTimeoutMs)
  return { recovered, ms, servingRestored, servingMs: servingRestored ? Date.now() - t0 : null }
}

// mocks runs every device behind one shared process (one server per
// worker — see startMocks in lib/site.js), so this can only make the whole
// fleet unreachable at once, never a single device in isolation — scoped
// and labeled that way rather than mislabeled "one device". A killed mocks
// process refuses the connection immediately (ECONNREFUSED), so a failed
// read is fast, not timeout-bound. analyticalEffectMs is the complementary
// worst-case number for a genuinely hung (not refused) device, computed
// from the Worker's own configured timeout/concurrency —
// timeout × ceil(unreachableCount / concurrency).
//
// After the kill it reads one device repeatedly and records two times from
// the kill: until a read first fails (assertTelemetry, so a failed live
// `snap` counts) and until every channel fails (the cached channels keep
// returning the last values until the miner's fetchDeviceData cache
// expires). Then it restarts the mocks and records how long reads take to
// succeed again.
async function drillDeviceOutage ({ client, allDeviceIds, commonArgs, procs, detectTimeoutMs, recoveryTimeoutMs, timeoutBudgetMs, concurrency }) {
  const sampleDeviceId = allDeviceIds[0]
  const timedRead = async () => {
    const t0 = process.hrtime.bigint()
    let res = null
    let error = null
    try {
      res = await client.pullTelemetry(sampleDeviceId, 'metrics')
      assertTelemetry(res)
    } catch (err) {
      error = err
    }
    return { ms: Number(process.hrtime.bigint() - t0) / 1e6, res, error }
  }
  const everyChannelFailed = (res) => !res || !!res.error ||
    (!!res.metrics && Object.values(res.metrics).every((v) => v && (v.error || v.success === false)))

  const baseline = await timedRead()

  const oldProc = procs.mocksProc
  const tKill = Date.now()
  await stopChild(oldProc)

  let firstFailure = null
  let detectedMs = null
  let allChannelsFailedMs = null
  await pollUntil(async () => {
    const read = await timedRead()
    if (read.error && !firstFailure) {
      firstFailure = read
      detectedMs = Date.now() - tKill
    }
    if (read.error && everyChannelFailed(read.res)) {
      allChannelsFailedMs = Date.now() - tKill
      return true
    }
    return false
  }, tKill + detectTimeoutMs)

  const newProc = await spawnRole('mocks', commonArgs)
  procs.mocksProc = newProc
  replaceChild(procs, oldProc, newProc)
  const tBack = Date.now()
  const recovered = await pollUntil(async () => !(await timedRead()).error, tBack + recoveryTimeoutMs)

  const unreachableCount = allDeviceIds.length
  const analyticalEffectMs = Math.ceil(unreachableCount / concurrency) * timeoutBudgetMs

  return {
    scope: 'all devices — mocks run one shared process per worker, so a single device can\'t be isolated',
    unreachableCount,
    timeoutBudgetMs,
    concurrency,
    analyticalEffectMs,
    measured: {
      baselineMs: baseline.ms,
      baselineFailed: !!baseline.error,
      detectedMs,
      failedReadMs: firstFailure ? firstFailure.ms : null,
      firstFailureCode: firstFailure ? errorCode(firstFailure.error) : null,
      allChannelsFailedMs,
      recovered,
      recoveredMs: recovered ? Date.now() - tBack : null
    }
  }
}

// Up to `n` ids spread evenly across `ids` (every Worker's devices, not just
// the first Worker's), in their original order.
function sampleEvenly (ids, n) {
  if (ids.length <= n) return ids
  return Array.from({ length: n }, (_, i) => ids[Math.floor(i * ids.length / n)])
}

// Every device must answer a real metrics pull before anything is measured.
// A device whose connect() failed at Worker boot is held offline and answers
// every request with a fast ERR_DEVICE_UNAVAILABLE payload, so without this a
// misconfigured fleet would benchmark that error path and still report green.
async function assertDevicesReachable ({ client, allDeviceIds }) {
  const failures = []
  await mapWithConcurrency(allDeviceIds, DEFAULT_THING_RTD_CONCURRENCY, async (id) => {
    try {
      assertTelemetry(await client.pullTelemetry(id, 'metrics'))
    } catch (err) {
      failures.push(`${id}: ${err.message}`)
    }
  })
  if (failures.length) {
    throw new Error(`ERR_BENCH_DEVICES_UNREACHABLE: ${failures.length}/${allDeviceIds.length} devices failed a metrics pull before measurement (first: ${failures[0]})`)
  }
}

// Runs the measurement checklist from capacity-metrics-template.md (steps
// 4-13) against an already-booted, already-connected site. Scope: read path
// (single + aggregate), Gateway request latency (through the harness's own
// generic plugin), cycle headroom, sustained read throughput, command submit
// latency, device baseline (approximate), resource + RSS-slope sampling,
// alert-visible-via-Kernel latency (see alertPoll / pollAlerts in lib/load.js).
// Not covered: full action approve/vote/e2e workflow as distinct steps (all
// shipped workers whitelist writes at a single required vote, so submit and
// execute collapse into one step — see README), alert generation latency
// in isolation, Gateway/fan-out/history alert delivery.
async function runChecklist ({ client, devicePlan, workerDeviceMap, allDeviceIds, alertPoll, alertGatewayPoll, resourceSamplers, gatewayPort, gatewayAuth, root, profileId, sweep, deviceCount, workerCount, mode, startedUtc, storeSizesAtStartBytes }) {
  const rr = RUN_REPRODUCIBILITY

  const deviceBaselineRecorder = new LatencyRecorder('deviceBaseline')
  await measureDeviceBaseline({ devices: devicePlan.devices, recorder: deviceBaselineRecorder, sampleSize: Math.min(20, devicePlan.devices.length) })

  const telemetrySingleRecorder = new LatencyRecorder('telemetrySingle')
  // Separate from telemetrySingleRecorder on purpose: runReadLoad drives
  // rr.readLoadConcurrency (deliberately >> WORKER_CONF_DEFAULTS.thingQueryConcurrency)
  // concurrent readers, so its per-call latency includes real queue wait
  // under induced saturation — a different thing from the sequential,
  // uncontended single-request latency the "Telemetry read (single device)"
  // row measures. Folding the two into one recorder would let saturation
  // queueing masquerade as ordinary read latency.
  const readLoadRecorder = new LatencyRecorder('readLoadSaturation')
  const statusRecorder = new LatencyRecorder('status')
  const actionSubmitRecorder = new LatencyRecorder('actionSubmit')
  const gatewayRequestRecorder = new LatencyRecorder('gatewayRequest')
  const gatewayTelemetrySingleRecorder = new LatencyRecorder('gatewayTelemetrySingle')
  const gatewayActionSubmitRecorder = new LatencyRecorder('gatewayActionSubmit')

  // Capped like every other sequential single-request loop below (rr.n can
  // be 1000+ for a real capacity run — at one real round trip per iteration,
  // uncapped this alone was blowing a profile's wall-clock time out past 5
  // minutes without adding proportionally useful percentile resolution).
  for (let i = 0; i < Math.min(rr.n, 50); i++) {
    const id = allDeviceIds[i % allDeviceIds.length]
    await telemetrySingleRecorder.time(async () => assertTelemetry(await client.pullTelemetry(id, 'metrics')))
  }
  for (let i = 0; i < Math.min(rr.n, 50); i++) {
    await statusRecorder.time(() => client.getStatus())
  }
  for (let i = 0; i < Math.min(rr.n, 50); i++) {
    await gatewayRequestRecorder.time(async () => {
      const res = await fetch(`http://127.0.0.1:${gatewayPort}${GATEWAY_DEFAULTS.requestPath}`, { headers: await authHeaders(gatewayAuth) })
      if (!res.ok) throw new Error(`ERR_GATEWAY_REQUEST_FAILED: status ${res.status}`)
      return res.json()
    })
  }
  // Same round trip as telemetrySingleRecorder above, but through the
  // Gateway (fleet.device.telemetry route) instead of the Client dialing
  // the Kernel directly — the "Gateway → Kernel → Worker → Gateway"
  // boundary the read-path template row asks for.
  for (let i = 0; i < Math.min(rr.n, 50); i++) {
    const id = allDeviceIds[i % allDeviceIds.length]
    await gatewayTelemetrySingleRecorder.time(async () => {
      const res = await fetch(`http://127.0.0.1:${gatewayPort}${GATEWAY_DEFAULTS.deviceTelemetryPath(id)}`, { headers: await authHeaders(gatewayAuth) })
      if (!res.ok) throw new Error(`ERR_GATEWAY_DEVICE_TELEMETRY_FAILED: status ${res.status}`)
      return assertTelemetry(await res.json())
    })
  }
  // Same operation as actionSubmitRecorder below (client.sendCommand), but
  // through the Gateway (fleet.device.action route) — the "Client → Gateway
  // → Kernel accept" boundary the write-path template row asks for. Uses
  // the harness's own configured action/params so it's the same real write
  // every other action measurement in this checklist performs.
  for (let i = 0; i < Math.min(rr.n, 50); i++) {
    const id = allDeviceIds[i % allDeviceIds.length]
    await gatewayActionSubmitRecorder.time(async () => {
      const res = await fetch(`http://127.0.0.1:${gatewayPort}${GATEWAY_DEFAULTS.deviceActionPath(id)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(await authHeaders(gatewayAuth)) },
        body: JSON.stringify({ action: rr.actionType, params: rr.actionParams })
      })
      if (!res.ok) throw new Error(`ERR_GATEWAY_DEVICE_ACTION_FAILED: status ${res.status}`)
      return assertCommand(await res.json())
    })
  }

  const byWorker = await measureCycleHeadroom({
    client,
    workerDeviceMap,
    concurrency: DEFAULT_THING_RTD_CONCURRENCY,
    rounds: 3,
    recorder: telemetrySingleRecorder
  })
  const worstWorkerId = Object.entries(byWorker).sort((a, b) => b[1].avgCycleMs - a[1].avgCycleMs)[0][0]
  const cycleHeadroomWorst = byWorker[worstWorkerId]
  const headroomRatio = cycleHeadroomWorst.avgCycleMs / WORKER_CONF_DEFAULTS.collectSnapsItvMs

  const throughput = await runReadLoad({
    client,
    deviceIds: allDeviceIds,
    durationMs: rr.readLoadDurationMs,
    concurrency: rr.readLoadConcurrency,
    recorder: readLoadRecorder
  })

  const actionLoad = await runActionLoad({
    client,
    deviceIds: allDeviceIds,
    durationMs: rr.actionLoadDurationMs,
    ratePerSec: rr.actionLoadRatePerSec,
    recorder: actionSubmitRecorder,
    actionType: rr.actionType,
    actionParams: rr.actionParams
  })

  await alertPoll.stop()
  await alertGatewayPoll.stop()

  const endedUtc = new Date().toISOString()

  const resourceSummary = {}
  for (const [label, sampler] of Object.entries(resourceSamplers)) resourceSummary[label] = sampler.sampleFdNow().summary()
  const rssSlopeMiBPerHour = Math.max(
    ...Object.values(resourceSamplers).map((s) => Math.abs(s.rssSlopeMiBPerHour() || 0))
  ) * (Object.values(resourceSamplers).some((s) => (s.rssSlopeMiBPerHour() || 0) < 0) ? -1 : 1)

  // One rule per induced worker type in play (see ALERT_INDUCTION in
  // lib/constants.js) — real, not a placeholder, now that alerts are
  // actually configured and evaluated.
  const inducedTypes = new Set(devicePlan.workers.map((w) => w.type).filter((t) => ALERT_INDUCTION[t]))
  const alerts = {
    rulesCount: inducedTypes.size,
    devicesWithAlerts: alertPoll.seenDeviceIds.size,
    deviceCount: allDeviceIds.length,
    byName: alertPoll.byName,
    visibleViaKernel: alertPoll.recorder.summary(),
    visibleViaGateway: alertGatewayPoll.recorder.summary()
  }

  // Feeds capacity-metrics-template.md's "Workers" and "Storage breakdown"
  // tables — real per-worker device counts and on-disk paths, not just the
  // deviceCount/workerCount totals.
  const workersBreakdown = devicePlan.workers.map((w) => ({ workerId: w.workerId, type: w.type, model: w.model, deviceCount: w.devices.length }))
  const storePaths = {
    kernelStore: path.join(root, 'kernel-db'),
    workerStores: devicePlan.workers.map((w) => ({ workerId: w.workerId, type: w.type, model: w.model, path: workerStoreDir(root, w.workerId), startSizeBytes: storeSizesAtStartBytes[w.workerId] || 0 })),
    gatewayStore: path.join(root, 'gateway')
  }
  const configArtifact = {
    path: 'config/benchmark.config.json',
    hash: crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex').slice(0, 12)
  }

  return {
    profileId,
    sweep,
    mode,
    deviceCount,
    workerCount,
    workersBreakdown,
    storePaths,
    configArtifact,
    hardware: config.hardware,
    operatingParameters: {
      kernelTelemetryPullMs: KERNEL_DEFAULTS.telemetryPullMs,
      kernelHealthPingMs: KERNEL_DEFAULTS.healthPingMs,
      kernelStatePullMs: KERNEL_DEFAULTS.statePullMs,
      workerCollectSnapsItvMs: WORKER_CONF_DEFAULTS.collectSnapsItvMs,
      workerStoreSnapItvMs: WORKER_CONF_DEFAULTS.storeSnapItvMs,
      workerConcurrency: DEFAULT_THING_RTD_CONCURRENCY,
      // thing.miner.timeout, the per-device RPC timeout; collectSnapTimeoutMs
      // only bounds the Worker's periodic snap collection.
      deviceRequestTimeoutMs: MINER_DEVICE_TIMEOUT_MS,
      collectSnapTimeoutMs: WORKER_CONF_DEFAULTS.collectSnapTimeoutMs,
      alertRulesCount: alerts.rulesCount
    },
    runReproducibility: rr,
    timestamps: { startUtc: startedUtc, endUtc: endedUtc },
    resourceSummary,
    rssSlopeMiBPerHour,
    deviceBaseline: deviceBaselineRecorder.summary(),
    cycleHeadroomByWorker: byWorker,
    cycleHeadroomWorst: { workerId: worstWorkerId, ...cycleHeadroomWorst },
    headroomRatio,
    throughput,
    actionLoad,
    alerts,
    latencies: {
      telemetrySingle: telemetrySingleRecorder.summary(),
      // Saturation-phase latency (see readLoadRecorder above) — not one of
      // the template's own rows, so renderLatency doesn't put it in the
      // Read path table; it's here for the "Throughput under load" caveat
      // in renderThroughput and for anyone diffing the raw JSON.
      readLoadSaturation: readLoadRecorder.summary(),
      status: statusRecorder.summary(),
      actionSubmit: actionSubmitRecorder.summary(),
      gatewayRequest: gatewayRequestRecorder.summary(),
      gatewayTelemetrySingle: gatewayTelemetrySingleRecorder.summary(),
      gatewayActionSubmit: gatewayActionSubmitRecorder.summary(),
      alertVisibleViaKernel: alerts.visibleViaKernel,
      alertVisibleViaGateway: alerts.visibleViaGateway
    },
    thresholds: THRESHOLDS
  }
}

async function runMainProfile ({ profileId, sweep, workers, root, usedPorts }) {
  const devicePlan = makeDevicePlan({ workers, usedPorts })
  saveDevicePlan(root, devicePlan)
  const deviceCount = devicePlan.devices.length
  const workerCount = devicePlan.workers.length

  const commonArgs = ['--root', root]

  // One try/finally around every spawn, not just the checklist: a role that
  // fails to boot partway through (mocks up, kernel up, gateway's corestore
  // lock fails, say) must still tear down everything already spawned —
  // otherwise a failed run leaks mocks/kernel/worker processes that hold
  // ports and file locks a later run then collides with.
  const children = []
  let client
  let resourceSamplers
  let alertPoll
  let alertGatewayPoll
  try {
    let mocksProc = await spawnRole('mocks', commonArgs)
    children.push(mocksProc)
    let kernelProc = await spawnRole('kernel', commonArgs)
    children.push(kernelProc)
    const workerProcs = []
    for (let i = 0; i < workerCount; i++) {
      const proc = await spawnRole('worker', [...commonArgs, '--worker-index', String(i)])
      workerProcs.push(proc)
      children.push(proc)
    }
    const gatewayProc = await spawnRole('gateway', [...commonArgs, '--port', String(devicePlan.gatewayPort)])
    children.push(gatewayProc)

    const kernelKey = fs.readFileSync(path.join(root, '.kernel-key'), 'utf8').trim()
    // The Kernel is fail-closed: dial with a published (admitted) identity,
    // and give its trusted-keys watcher a few warmup rounds to pick it up.
    client = createMdkClient({ kernelKey, ...harnessClientConfig(root) })
    await client.connect({ warmup: true, warmupRetries: 10 })
    await client.waitForWorkers({ count: workerCount, timeoutMs: 30000 })

    const gatewayAuth = gatewayTokenSource(root, `http://127.0.0.1:${devicePlan.gatewayPort}`)

    const status = await client.getStatus()
    const workerDeviceMap = {}
    for (const w of status.workers) workerDeviceMap[w.workerId] = w.deviceIds
    const allDeviceIds = status.workers.flatMap((w) => w.deviceIds)
    if (!allDeviceIds.length) throw new Error('ERR_NO_DEVICES_REGISTERED')
    await assertDevicesReachable({ client, allDeviceIds })

    resourceSamplers = {
      mocks: new ResourceSampler({ pid: mocksProc.pid, intervalMs: RUN_REPRODUCIBILITY.resourceSampleIntervalMs, label: 'mocks' }).start(),
      kernel: new ResourceSampler({ pid: kernelProc.pid, intervalMs: RUN_REPRODUCIBILITY.resourceSampleIntervalMs, label: 'kernel' }).start(),
      gateway: new ResourceSampler({ pid: gatewayProc.pid, intervalMs: RUN_REPRODUCIBILITY.resourceSampleIntervalMs, label: 'gateway' }).start()
    }
    workerProcs.forEach((proc, i) => {
      resourceSamplers[`worker-${i}`] = new ResourceSampler({ pid: proc.pid, intervalMs: RUN_REPRODUCIBILITY.resourceSampleIntervalMs, label: `worker-${i}`, warmupMs: WORKER_LOG_CACHE_WARMUP_MS }).start()
    })

    // Starts here (before the soak wait), not inside runChecklist, so the
    // observation window covers the full soak + checklist duration — the
    // best approximation of "since boot" this coordinator can give without
    // touching the Worker's own (never-overridden) snap cadence.
    alertPoll = pollAlerts({ client, workerDeviceMap })
    alertGatewayPoll = pollAlertsViaGateway({
      allDeviceIds: sampleEvenly(allDeviceIds, GATEWAY_DEFAULTS.alertSampleSize),
      fetchDeviceAlerts: async (deviceId) => {
        const res = await fetch(`http://127.0.0.1:${devicePlan.gatewayPort}${GATEWAY_DEFAULTS.deviceAlertsPath(deviceId)}`, { headers: await authHeaders(gatewayAuth) })
        if (!res.ok) throw new Error(`ERR_GATEWAY_DEVICE_ALERTS_FAILED: status ${res.status}`)
        const body = await res.json()
        return body.alerts
      }
    })

    // Snapshotted at the same instant as startedUtc, before the soak/checklist
    // write anything more — the "at time zero" side of the growth/day
    // calculation in renderStorageBreakdown (lib/report.js re-measures the
    // "now" side at report-render time).
    const storeSizesAtStartBytes = {}
    for (const w of devicePlan.workers) {
      storeSizesAtStartBytes[w.workerId] = dirSizeBytes(workerStoreDir(root, w.workerId))
    }

    const startedUtc = new Date().toISOString()
    await new Promise((resolve) => setTimeout(resolve, RUN_REPRODUCIBILITY.soakMs))

    const result = await runChecklist({
      client,
      devicePlan,
      workerDeviceMap,
      allDeviceIds,
      alertPoll,
      alertGatewayPoll,
      resourceSamplers,
      gatewayPort: devicePlan.gatewayPort,
      gatewayAuth,
      root,
      profileId,
      sweep,
      deviceCount,
      workerCount,
      mode: 'multi-process',
      startedUtc,
      storeSizesAtStartBytes
    })

    // Runs after the steady-state checklist, never during — a killed/
    // restarted process mid-checklist would contaminate the capacity
    // numbers the rest of the report depends on.
    let failureBehaviour = null
    if (RUN_REPRODUCIBILITY.runFailureDrills) {
      const procs = { mocksProc, kernelProc, workerProcs, children }
      failureBehaviour = await runFailureDrills({ client, devicePlan, allDeviceIds, commonArgs, procs })
      mocksProc = procs.mocksProc
      kernelProc = procs.kernelProc
    }

    return { ...result, failureBehaviour }
  } finally {
    if (alertPoll) await alertPoll.stop()
    if (alertGatewayPoll) await alertGatewayPoll.stop()
    if (resourceSamplers) Object.values(resourceSamplers).forEach((s) => s.stop())
    if (client) await client.close()
    await Promise.all(children.map(stopChild))
  }
}

// Same Kernel + Gateway + one idle Worker per configured type/model (0
// owned devices each), booted and sampled the same way as the real run, so
// renderZeroDeviceBaseline() can subtract it from the real run's numbers to
// get a per-device marginal cost. No mocks role — nothing to simulate with
// zero devices. Runs under root/zero-baseline so it's cleaned up by the
// same fs.rmSync as the rest of the profile, and shares `usedPorts` with
// the real run's device plan since both boot concurrently on the same host.
async function runZeroDeviceBaseline ({ workers, root, usedPorts }) {
  const zeroRoot = path.join(root, 'zero-baseline')
  fs.mkdirSync(zeroRoot, { recursive: true })

  const zeroSpecs = workers.map((w) => ({ type: w.type, model: w.model, devices: 0, simulateMocks: w.simulateMocks }))
  const devicePlan = makeDevicePlan({ workers: zeroSpecs, workerIdPrefix: 'bench-worker-zero', usedPorts })
  saveDevicePlan(zeroRoot, devicePlan)
  const workerCount = devicePlan.workers.length
  const commonArgs = ['--root', zeroRoot]

  const children = []
  let resourceSamplers
  try {
    const kernelProc = await spawnRole('kernel', commonArgs)
    children.push(kernelProc)
    const workerProcs = []
    for (let i = 0; i < workerCount; i++) {
      const proc = await spawnRole('worker', [...commonArgs, '--worker-index', String(i)])
      workerProcs.push(proc)
      children.push(proc)
    }
    const gatewayProc = await spawnRole('gateway', [...commonArgs, '--port', String(devicePlan.gatewayPort)])
    children.push(gatewayProc)

    resourceSamplers = {
      kernel: new ResourceSampler({ pid: kernelProc.pid, intervalMs: RUN_REPRODUCIBILITY.resourceSampleIntervalMs, label: 'kernel' }).start(),
      gateway: new ResourceSampler({ pid: gatewayProc.pid, intervalMs: RUN_REPRODUCIBILITY.resourceSampleIntervalMs, label: 'gateway' }).start()
    }
    workerProcs.forEach((proc, i) => {
      resourceSamplers[`worker-${i}`] = new ResourceSampler({ pid: proc.pid, intervalMs: RUN_REPRODUCIBILITY.resourceSampleIntervalMs, label: `worker-${i}` }).start()
    })

    await new Promise((resolve) => setTimeout(resolve, RUN_REPRODUCIBILITY.soakMs))

    const resourceSummary = {}
    for (const [label, sampler] of Object.entries(resourceSamplers)) resourceSummary[label] = sampler.sampleFdNow().summary()
    return { resourceSummary }
  } finally {
    if (resourceSamplers) Object.values(resourceSamplers).forEach((s) => s.stop())
    await Promise.all(children.map(stopChild))
  }
}

async function runProfile (spec) {
  const { profileId, sweep, workers } = spec
  const root = profileRoot(profileId)
  fs.rmSync(root, { recursive: true, force: true })
  fs.mkdirSync(root, { recursive: true })
  const usedPorts = new Set()

  const [result, zeroDeviceBaseline] = await Promise.all([
    runMainProfile({ profileId, sweep, workers, root, usedPorts }),
    runZeroDeviceBaseline({ workers, root, usedPorts })
  ])

  return { ...result, zeroDeviceBaseline }
}

async function runProfileRole () {
  const spec = resolveProfileSpec()
  console.log('running profile %s (devices=%d workers=%d, mocks/kernel/%d worker process(es)/gateway)', spec.profileId, spec.deviceCount, spec.workerCount, spec.workerCount)
  console.log('don\'t close while tests are running..')

  const result = await runProfile(spec)
  const { jsonPath, mdPath, verdict } = writeReport(result, { resultsDir: RESULTS_DIR })
  console.log('MDK_READY profile %s status=%s', spec.profileId, verdict.overall)
  console.log('report: %s', mdPath)
  console.log('data:   %s', jsonPath)
  return { result, verdict }
}

const ROLES = {
  mocks: runMocksRole,
  kernel: runKernelRole,
  worker: runWorkerRole,
  gateway: runGatewayRole,
  profile: runProfileRole
}

async function main () {
  const role = arg('--role', 'profile')
  const run = ROLES[role]
  if (!run) throw new Error(`ERR_UNKNOWN_ROLE: --role must be one of ${Object.keys(ROLES).join(', ')}`)
  return run()
}

if (require.main === module) {
  main().then((res) => {
    if (arg('--role', 'profile') === 'profile') process.exit(res.verdict.overall === 'red' ? 1 : 0)
  }).catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

module.exports = { resolveProfileSpec, runProfile, runChecklist, loadConfig }
