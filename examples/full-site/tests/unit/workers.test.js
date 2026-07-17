'use strict'

// Real-worker contract test: boots the runtime-hosted whatsminer worker (plugin
// + services from backend/workers) against the Whatsminer mock device server
// and asserts the snapshot shape the site plugin reads, plus single-device
// command targeting through the runtime's envelope dispatch.

const test = require('brittle')
const os = require('os')
const fs = require('fs')
const path = require('path')

const net = require('net')

const WORKERS = path.join(__dirname, '..', '..', '..', '..', 'backend', 'workers')
const { startWhatsminerWorker } = require(path.join(WORKERS, 'miners', 'whatsminer'))
const wmMock = require(path.join(WORKERS, 'miners', 'whatsminer', 'mock', 'server'))

function freePort () {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.once('error', reject)
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address()
      s.close(() => resolve(port))
    })
  })
}

function stopMock (mock) {
  if (!mock) return
  const fn = mock.stop || mock.exit
  if (typeof fn === 'function') fn.call(mock)
}

function commandEnvelope (deviceId, command, params) {
  return {
    id: 'req-1',
    version: '0.1.0',
    type: 'request',
    action: 'command.request',
    sender: 'kernel:test',
    target: null,
    deviceId,
    timestamp: Date.now(),
    payload: { commandId: 'cmd-1', command, params }
  }
}

async function bootWorker (t, seeds) {
  const root = path.join(os.tmpdir(), `wm-runtime-contract-${Date.now()}-${process.pid}`)
  const handle = await startWhatsminerWorker({
    workerId: 'wm-contract-test',
    model: 'm56s',
    storeDir: path.join(root, 'store'),
    conf: { thing: { allowDuplicateIPs: true, collectSnapsItvMs: 1000, storeSnapItvMs: 1000 } },
    seedDevices: seeds
  })
  t.teardown(async () => {
    await handle.stop()
    try { fs.rmSync(root, { recursive: true, force: true }) } catch {}
  })
  return handle
}

function getSnap (handle, deviceId) {
  return handle.runtime.getDeviceContext(deviceId).device.getSnap()
}

test('real whatsminer worker serves the telemetry the site plugin reads', async (t) => {
  const port = await freePort()
  const mock = wmMock.createServer({ host: '127.0.0.1', port, type: 'm56s', serial: 'WM-T1', password: 'admin' })
  t.teardown(() => stopMock(mock))

  const handle = await bootWorker(t, [
    { id: 'miner-0', info: { container: 'c1', pos: '1_1' }, opts: { address: '127.0.0.1', port, password: 'admin' } }
  ])

  const snap = await getSnap(handle, 'miner-0')
  t.is(snap.success, true, 'snap collected from the mock')
  t.ok(typeof snap.stats.status === 'string', 'stats.status present')
  t.ok(snap.stats.power_w >= 0, 'stats.power_w present')
  t.ok(snap.stats.hashrate_mhs && typeof snap.stats.hashrate_mhs.t_5m === 'number', 'hashrate_mhs.t_5m present')
  t.ok(snap.stats.temperature_c && typeof snap.stats.temperature_c.avg === 'number', 'temperature_c.avg present')
  t.ok(typeof snap.config.power_mode === 'string', 'config.power_mode present')
})

test('setPowerMode targets only the addressed miner', async (t) => {
  const [portA, portB] = await Promise.all([freePort(), freePort()])
  const mockA = wmMock.createServer({ host: '127.0.0.1', port: portA, type: 'm56s', serial: 'WM-A', password: 'admin' })
  const mockB = wmMock.createServer({ host: '127.0.0.1', port: portB, type: 'm56s', serial: 'WM-B', password: 'admin' })
  t.teardown(() => { stopMock(mockA); stopMock(mockB) })

  const handle = await bootWorker(t, [
    { id: 'miner-a', info: {}, opts: { address: '127.0.0.1', port: portA, password: 'admin' } },
    { id: 'miner-b', info: {}, opts: { address: '127.0.0.1', port: portB, password: 'admin' } }
  ])

  // The runtime routes command.request by envelope deviceId — the addressed
  // miner's context only, no fan-out.
  const res = await handle.runtime.handleRequest(commandEnvelope('miner-a', 'setPowerMode', { mode: 'high' }))
  t.is(res.payload.status, 'SUCCESS', 'command dispatched to the addressed miner')

  const a = await getSnap(handle, 'miner-a')
  const b = await getSnap(handle, 'miner-b')
  t.is(a.config.power_mode, 'high', 'addressed miner switched to high')
  t.is(b.config.power_mode, 'normal', 'sibling miner unchanged')
})
