'use strict'

const os = require('os')
const path = require('path')
const fs = require('fs')
const WorkerRuntime = require('../../../backend/core/mdk-worker/lib/worker-runtime')
const { plugin, openDb } = require('../../../backend/workers/samples/demo-worker')
const demoMock = require('../../../backend/workers/samples/demo-worker/mock/server')

// This is the "caller": the demo-worker package ships only a Worker Plugin
// ({ contract, dir, connect }) and its own SQLite helper — it never touches
// WorkerRuntime. Hosting the plugin (constructing WorkerRuntime, owning its
// lifecycle, and running the sampler loop against the live runtime) is
// entirely this caller's job. The worker keeps its own SQLite file under
// storeDir and this sampler loop writes a telemetry row per device on a
// fixed cadence (served back via the `history` channel).
//
// seedDevices uses the same { id, opts } shape as the other worker seeds;
// opts is this plugin's own config ({ host, port }).
async function startDemoWorker ({ workerId, storeDir, kernelTopic, seedDevices, sampleItvMs }) {
  fs.mkdirSync(storeDir, { recursive: true })
  const dbPath = path.join(storeDir, 'demo-worker.db')
  const db = openDb(dbPath)

  const devices = (seedDevices || []).map((d) => ({
    deviceId: d.id,
    config: { ...d.opts, dbPath }
  }))
  const deviceIds = devices.map((d) => d.deviceId)

  const runtime = new WorkerRuntime(plugin, {
    workerId,
    kernelTopic: kernelTopic || null,
    devices
  })
  await runtime.start()

  let sampling = false
  const sample = async () => {
    if (sampling) return
    sampling = true
    try {
      for (const deviceId of deviceIds) {
        const ctx = runtime.getDeviceContext(deviceId)
        if (!ctx) continue
        db.recordSample(deviceId, await ctx.device.getSummary())
      }
    } catch (err) {
      console.error(`[demo-worker-caller] sample error: ${err.message}`)
    } finally {
      sampling = false
    }
  }
  const sampler = setInterval(sample, sampleItvMs || 5000)
  sampler.unref()

  return {
    runtime,
    db,
    dbPath,
    deviceIds,
    seeded: 0,
    async stop () {
      clearInterval(sampler)
      await runtime.stop()
      db.close()
    }
  }
}

// Manual runner: boots real firmware v3 mocks, hosts the demo-worker plugin
// on WorkerRuntime against them (via startDemoWorker above), and polls
// telemetry on an interval.

const READ_ITV_MS = 3000
const SAMPLE_ITV_MS = 1000
const MOCKS = [
  { id: 'v3-0', port: 18080, serial: 'WM3-DEMO-0', hashrateThs: 200, powerW: 3500 },
  { id: 'v3-1', port: 18081, serial: 'WM3-DEMO-1', hashrateThs: 180, powerW: 3300 }
]

function envelope (deviceId, action, payload) {
  return {
    id: `req-${deviceId}-${Date.now()}`,
    version: '0.1.0',
    type: 'request',
    action,
    sender: 'demo-worker-caller:run',
    target: null,
    deviceId,
    timestamp: Date.now(),
    payload
  }
}

async function readDevice (runtime, deviceId) {
  const metricsRes = await runtime.handleRequest(envelope(deviceId, 'telemetry.pull', { query: { type: 'metrics' } }))
  const historyRes = await runtime.handleRequest(envelope(deviceId, 'telemetry.pull', { query: { type: 'history', limit: 3 } }))
  const m = metricsRes.payload.metrics
  const history = historyRes.payload.value
  console.log(
    `[${new Date().toISOString()}] ${deviceId} ` +
    `hashrate=${m.hashrate_rt.toFixed(1)}THs power=${m.power.toFixed(0)}W ` +
    `temp=${m.temperature.toFixed(1)}C mode=${m.power_mode} history_rows=${history.length}`
  )
}

async function main () {
  const root = path.join(os.tmpdir(), `demo-worker-run-${process.pid}`)
  fs.rmSync(root, { recursive: true, force: true })

  const mocks = MOCKS.map((d) => demoMock.createServer({
    host: '127.0.0.1', port: d.port, serial: d.serial, hashrateThs: d.hashrateThs, powerW: d.powerW
  }))

  const handle = await startDemoWorker({
    workerId: 'demo-worker-run',
    storeDir: path.join(root, 'store'),
    seedDevices: MOCKS.map((d) => ({ id: d.id, opts: { host: '127.0.0.1', port: d.port } })),
    sampleItvMs: SAMPLE_ITV_MS
  })

  console.log(`demo-worker running (workerId=demo-worker-run, devices=${handle.deviceIds.join(', ')})`)
  console.log(`sampling every ${SAMPLE_ITV_MS}ms, reading every ${READ_ITV_MS}ms — Ctrl+C to stop\n`)

  const reader = setInterval(() => {
    for (const deviceId of handle.deviceIds) {
      readDevice(handle.runtime, deviceId).catch((err) => {
        console.error(`[${deviceId}] read error: ${err.message}`)
      })
    }
  }, READ_ITV_MS)

  const shutdown = async () => {
    clearInterval(reader)
    await handle.stop()
    for (const mock of mocks) mock.exit()
    fs.rmSync(root, { recursive: true, force: true })
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

module.exports = { startDemoWorker }

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
