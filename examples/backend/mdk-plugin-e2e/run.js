'use strict'

const path = require('path')
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')
const { getKernel, startGateway, waitForDiscovery, shutdown } = require('../../../backend/core/mdk')
const { WorkerRuntime } = require('../../../backend/core/mdk-worker')
const SimMinerMock = require('./mock-device/device.mock')
const plugin = require('./worker-plugin')

const ROOT = path.join(os.tmpdir(), 'mdk-e2e-worker-runtime')
const TOPIC = crypto.randomBytes(32).toString('hex')
const HTTP_PORT = 3210

const SIMS = [
  { port: 15101, serial: 'SIM-001', hashrateThs: 100, powerW: 3000 },
  { port: 15102, serial: 'SIM-002', hashrateThs: 140, powerW: 3200 }
]

function waitListening (server) {
  return new Promise((resolve) => {
    if (server.listening) return resolve()
    server.once('listening', resolve)
  })
}

async function main () {
  fs.rmSync(ROOT, { recursive: true, force: true })

  const sims = SIMS.map((spec) => SimMinerMock.create({ host: '127.0.0.1', ...spec }))
  await Promise.all(sims.map((sim) => waitListening(sim.server)))
  console.log('mock devices up:', SIMS.map((s) => `${s.serial}@${s.port} (${s.hashrateThs} TH/s, ${s.powerW} W)`).join(', '))

  // One runtime = one plugin type, N devices, one RPC channel to the Kernel.
  const runtime = new WorkerRuntime(plugin, {
    workerId: 'sim-rack-1',
    kernelTopic: TOPIC,
    devices: SIMS.map((s) => ({ deviceId: s.serial, config: { host: '127.0.0.1', port: s.port } }))
  })
  await runtime.start()
  console.log('worker runtime hosting %d devices behind one RPC channel', SIMS.length)

  const kernel = await getKernel({ root: ROOT, topic: TOPIC })
  // Topic rendezvous on the public DHT can take a while; registering by key is
  // the deterministic same-process path (it triggers the same identity /
  // capability pulls the topic announce would).
  await kernel.registerWorker(runtime.getPublicKey())
  await waitForDiscovery(kernel)
  console.log('kernel discovered:', kernel.registry.listWorkers()
    .map((w) => `${w.workerId} [${w.state}] devices=${(w.deviceIds || []).join(',')}`).join('; '))

  await startGateway({
    kernel,
    noAuth: true,
    port: HTTP_PORT,
    root: path.join(ROOT, 'gateway'),
    tmpdir: path.join(ROOT, 'gateway'),
    extraPluginDirs: [path.join(__dirname, 'gateway-plugin')]
  })

  const res = await fetch(`http://127.0.0.1:${HTTP_PORT}/api/fleet/summary`)
  const summary = await res.json()
  console.log('\nGET /api/fleet/summary →', JSON.stringify(summary, null, 2))

  const expectedHashrate = SIMS.reduce((sum, s) => sum + s.hashrateThs, 0)
  const expectedPower = SIMS.reduce((sum, s) => sum + s.powerW, 0)
  const ok = summary.deviceCount === SIMS.length &&
    summary.totalHashrateThs === expectedHashrate &&
    summary.totalPowerW === expectedPower
  console.log(ok
    ? `\nE2E OK — aggregate combines ${SIMS.length} devices: ${summary.totalHashrateThs} TH/s = ${SIMS.map((s) => s.hashrateThs).join(' + ')}, ${summary.totalPowerW} W = ${SIMS.map((s) => s.powerW).join(' + ')}`
    : '\nE2E FAILED — aggregate does not match device telemetry')

  await shutdown(kernel)
  await runtime.stop()
  for (const sim of sims) sim.exit()
  process.exit(ok ? 0 : 1)
}

main().catch((err) => { console.error(err); process.exit(1) })
