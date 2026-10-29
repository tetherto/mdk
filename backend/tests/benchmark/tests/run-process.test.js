'use strict'

const test = require('brittle')
const fs = require('fs')
const os = require('os')
const path = require('path')
const http = require('http')
const { spawn } = require('child_process')

const { DEFAULT_WORKER_TYPE, DEFAULT_MODEL, RUN_REPRODUCIBILITY, THRESHOLDS, GATEWAY_DEFAULTS } = require('../lib/constants')
const { makeDevicePlan, config } = require('../lib/site')
const { ResourceSampler } = require('../lib/metrics')
const { pollAlerts, pollAlertsViaGateway } = require('../lib/load')
const { resolveProfileSpec, runChecklist, loadConfig } = require('../processes/run-process')

function withArgv (t, args) {
  const original = process.argv
  process.argv = [process.execPath, 'run-process.js', ...args]
  t.teardown(() => { process.argv = original })
}

test('resolveProfileSpec: config.workers as-is by default', (t) => {
  withArgv(t, [])
  const spec = resolveProfileSpec()
  t.is(loadConfig(), config)
  t.is(spec.sweep, 'custom')
  t.is(spec.workerCount, config.workers.length)
  t.alike(spec.workers.map((w) => w.devices), config.workers.map((w) => w.ceiling.maxDeviceCount || w.ceiling.startDeviceCount))
  t.is(spec.profileId, `cap-${spec.deviceCount}devices-${spec.workerCount}workers`)
})

test('resolveProfileSpec: --devices/--workers splits one family across workers', (t) => {
  withArgv(t, ['--devices', '7', '--workers', '3', '--sweep', 'ceiling', '--id', 'my-run'])
  const spec = resolveProfileSpec()
  t.is(spec.profileId, 'my-run')
  t.is(spec.sweep, 'ceiling')
  t.alike(spec.workers.map((w) => w.devices), [3, 2, 2])
  t.ok(spec.workers.every((w) => w.type === DEFAULT_WORKER_TYPE && w.model === DEFAULT_MODEL && w.simulateMocks))
  t.is(spec.deviceCount, 7)
})

test('resolveProfileSpec: --workers alone defaults to 10 devices; --type/--model pin the family', (t) => {
  withArgv(t, ['--workers', '2', '--type', 'mdk-worker-x', '--model', 'm1'])
  const spec = resolveProfileSpec()
  t.alike(spec.workers.map((w) => w.devices), [5, 5])
  t.ok(spec.workers.every((w) => w.type === 'mdk-worker-x' && w.model === 'm1'))
})

test('resolveProfileSpec: --devices alone runs on one worker', (t) => {
  withArgv(t, ['--devices', '4'])
  t.alike(resolveProfileSpec().workers.map((w) => w.devices), [4])
})

test('resolveProfileSpec: --workers-json wins over every other flag', (t) => {
  const workers = [{ type: DEFAULT_WORKER_TYPE, model: DEFAULT_MODEL, devices: 2, simulateMocks: true }, { type: DEFAULT_WORKER_TYPE, model: DEFAULT_MODEL, devices: 3, simulateMocks: true }]
  withArgv(t, ['--workers-json', JSON.stringify(workers), '--devices', '99'])
  const spec = resolveProfileSpec()
  t.alike(spec.workers, workers)
  t.is(spec.profileId, 'cap-5devices-2workers')
})

// The Kernel client surface runChecklist drives; both devices report an
// induced alert.
function fakeClient () {
  return {
    async pullTelemetry (id, query) {
      if (query && query.type === 'list') return { things: ['d-0', 'd-1'].map((thingId) => ({ id: thingId, last: { alerts: [{ name: 'chips_temp_critical' }] } })) }
      return { metrics: { hashrate_avg: 1 } }
    },
    async getStatus () {
      return { workers: [{ workerId: 'bench-worker-0', state: 'READY', deviceIds: ['d-0', 'd-1'] }] }
    },
    async sendCommand () {
      return { ok: true }
    }
  }
}

// The fleet app's routes as the Gateway serves them. Every other request (or
// one without the bearer token) fails, which runChecklist records as errors.
function fakeGateway (t, { token }) {
  const seen = { authorized: 0, unauthorized: 0 }
  const server = http.createServer((req, res) => {
    if (req.headers.authorization !== `Bearer ${token}`) {
      seen.unauthorized++
      res.writeHead(401).end()
      return
    }
    seen.authorized++
    const reply = (body) => res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body))
    if (req.url === GATEWAY_DEFAULTS.requestPath) return reply({ deviceCount: 2 })
    if (req.url === GATEWAY_DEFAULTS.deviceTelemetryPath('d-0')) return reply({ metrics: {} })
    if (req.url === GATEWAY_DEFAULTS.deviceActionPath('d-0') && req.method === 'POST') return reply({ ok: true })
    if (req.url === GATEWAY_DEFAULTS.deviceAlertsPath('d-1')) return reply({ alerts: [{ name: 'chips_temp_critical' }] })
    res.writeHead(500).end()
  })
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      t.teardown(() => new Promise((resolve) => server.close(resolve)))
      resolve({ port: server.address().port, seen })
    })
  })
}

test('runChecklist: measures every row against a fake Kernel client and Gateway', { timeout: 30000 }, async (t) => {
  const originalRR = { ...RUN_REPRODUCIBILITY }
  Object.assign(RUN_REPRODUCIBILITY, { n: 4, readLoadDurationMs: 50, readLoadConcurrency: 2, actionLoadDurationMs: 50, actionLoadRatePerSec: 50 })
  t.teardown(() => Object.assign(RUN_REPRODUCIBILITY, originalRR))

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-bench-checklist-'))
  t.teardown(() => fs.rmSync(root, { recursive: true, force: true }))

  const token = 'unit-token'
  const { port, seen } = await fakeGateway(t, { token })
  const client = fakeClient()
  const devicePlan = makeDevicePlan({ workers: [{ type: DEFAULT_WORKER_TYPE, model: DEFAULT_MODEL, devices: 2 }] })
  const allDeviceIds = ['d-0', 'd-1']
  const workerDeviceMap = { 'bench-worker-0': allDeviceIds }

  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' })
  t.teardown(() => child.kill('SIGKILL'))
  await new Promise((resolve) => child.once('spawn', resolve))
  const resourceSamplers = {
    kernel: new ResourceSampler({ pid: child.pid, intervalMs: 20, label: 'kernel' }).start(),
    'worker-0': new ResourceSampler({ pid: child.pid, intervalMs: 20, label: 'worker-0' }).start()
  }
  t.teardown(() => Object.values(resourceSamplers).forEach((s) => s.stop()))

  const alertPoll = pollAlerts({ client, workerDeviceMap, intervalMs: 10 })
  const alertGatewayPoll = pollAlertsViaGateway({
    allDeviceIds,
    intervalMs: 10,
    fetchDeviceAlerts: async (id) => {
      const res = await fetch(`http://127.0.0.1:${port}${GATEWAY_DEFAULTS.deviceAlertsPath(id)}`, { headers: { authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(`status ${res.status}`)
      return (await res.json()).alerts
    }
  })
  await new Promise((resolve) => setTimeout(resolve, 60))

  const result = await runChecklist({
    client,
    devicePlan,
    workerDeviceMap,
    allDeviceIds,
    alertPoll,
    alertGatewayPoll,
    resourceSamplers,
    gatewayPort: port,
    gatewayAuth: { getToken: async () => token },
    root,
    profileId: 'unit-profile',
    sweep: 'unit',
    deviceCount: 2,
    workerCount: 1,
    mode: 'multi-process',
    startedUtc: new Date().toISOString(),
    storeSizesAtStartBytes: {}
  })

  t.is(result.profileId, 'unit-profile')
  t.is(result.deviceCount, 2)
  t.is(result.configArtifact.hash.length, 12)
  t.alike(Object.keys(result.resourceSummary).sort(), ['kernel', 'worker-0'])
  t.ok(Number.isFinite(result.rssSlopeMiBPerHour))
  t.is(result.cycleHeadroomWorst.workerId, 'bench-worker-0')
  t.ok(result.headroomRatio >= 0)
  t.is(result.storePaths.workerStores[0].startSizeBytes, 0)

  const lat = result.latencies
  t.is(lat.telemetrySingle.errors, 0)
  t.is(lat.status.n, 4)
  t.is(lat.gatewayRequest.n, 4, 'every Gateway call carried the bearer token')
  t.is(lat.gatewayRequest.errors, 0)
  t.is(lat.gatewayTelemetrySingle.n, 2, 'd-0 answers; d-1 has no telemetry route here')
  t.is(lat.gatewayTelemetrySingle.errors, 2)
  t.is(lat.gatewayActionSubmit.n, 2)
  t.is(lat.gatewayActionSubmit.errors, 2)
  t.ok(lat.actionSubmit.n > 0)
  t.is(seen.unauthorized, 0)

  t.is(result.alerts.rulesCount, 1)
  t.alike(result.alerts.byName, { chips_temp_critical: 2 })
  t.is(result.alerts.devicesWithAlerts, 2)
  t.is(result.alerts.visibleViaGateway.n, 1)
  t.is(result.thresholds, THRESHOLDS)
})

test('runChecklist: Gateway calls without a token source go out unauthenticated', { timeout: 30000 }, async (t) => {
  const originalRR = { ...RUN_REPRODUCIBILITY }
  Object.assign(RUN_REPRODUCIBILITY, { n: 2, readLoadDurationMs: 20, readLoadConcurrency: 1, actionLoadDurationMs: 20, actionLoadRatePerSec: 50 })
  t.teardown(() => Object.assign(RUN_REPRODUCIBILITY, originalRR))

  const { port, seen } = await fakeGateway(t, { token: 'unit-token' })
  const client = fakeClient()
  const noop = { stop: async () => {}, seenDeviceIds: new Set(), byName: {}, recorder: { summary: () => null } }
  // A non-induced worker type: no alert rules counted.
  const devicePlan = { devices: [], workers: [{ workerId: 'w', type: 'mdk-worker-other', model: 'x', devices: [] }] }

  const result = await runChecklist({
    client,
    devicePlan,
    workerDeviceMap: { w: ['d-0'] },
    allDeviceIds: ['d-0'],
    alertPoll: noop,
    alertGatewayPoll: noop,
    resourceSamplers: {},
    gatewayPort: port,
    root: os.tmpdir(),
    profileId: 'unit-noauth',
    deviceCount: 1,
    workerCount: 1,
    mode: 'multi-process',
    startedUtc: new Date().toISOString(),
    storeSizesAtStartBytes: { w: 10 }
  })

  t.is(result.latencies.gatewayRequest.errors, 2)
  t.is(seen.authorized, 0)
  t.ok(seen.unauthorized >= 6)
  t.is(result.alerts.rulesCount, 0)
  t.is(result.storePaths.workerStores[0].startSizeBytes, 10)
  t.is(result.deviceBaseline.n, 0)
})
