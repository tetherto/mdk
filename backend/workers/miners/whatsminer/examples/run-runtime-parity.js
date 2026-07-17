'use strict'

// Whatsminer WorkerRuntime parity E2E.
//
// Proves every legacy operator flow of the manager-based whatsminer worker
// round-trips through the Kernel with the plugin + services + runtime stack:
// metrics, named telemetry channel, device command, logs + historical_logs,
// stats, saveComment read-back, saveSettings → settings, write.calls.request
// (Kernel action-approver flow) and provisioning (register → restart → 3
// devices).
//
// Usage: node backend/workers/miners/whatsminer/examples/run-runtime-parity.js

const path = require('path')
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')

const { getKernel, waitForDiscovery, shutdown } = require('../../../../core/mdk')
const { createMdkClient } = require('../../../../core/client')
const wmMock = require('../mock/server')
const { startWhatsminerWorker } = require('../plugin/boot')

const ROOT = path.join(os.tmpdir(), 'wm-runtime-parity')
const WORKER_ID = 'whatsminer-rack-1'
const MOCKS = [
  { serial: 'WM-001', port: 15201 },
  { serial: 'WM-002', port: 15202 }
]

const WORKER_OPTS = {
  workerId: WORKER_ID,
  model: 'm30sp',
  storeDir: path.join(ROOT, 'worker-store'),
  conf: {
    thing: {
      allowDuplicateIPs: true,
      collectSnapsItvMs: 1500,
      storeSnapItvMs: 0,
      collectSnapTimeoutMs: 10000,
      statsRtdItvMs: 2000,
      alerts: { 'miner-wm-m30sp': {} }
    }
  }
}

const results = []
function check (name, cond, detail) {
  results.push([name, !!cond])
  console.log(`${cond ? '  ✓' : '  ✗'} ${name}${detail ? ` — ${detail}` : ''}`)
}

function sleep (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function pollUntil (fn, { timeoutMs = 20000, intervalMs = 1000 } = {}) {
  const start = Date.now()
  let last
  while (Date.now() - start < timeoutMs) {
    last = await fn().catch(() => undefined)
    if (last) return last
    await sleep(intervalMs)
  }
  return last
}

function startMock ({ serial, port }) {
  return wmMock.createServer({ port, host: '127.0.0.1', type: 'm30sp', serial, password: 'admin' })
}

async function main () {
  fs.rmSync(ROOT, { recursive: true, force: true })

  // -- mock devices -------------------------------------------------------
  const mocks = MOCKS.map(startMock)
  await Promise.all(mocks.map((m) => m.ready))
  console.log('mock whatsminers up:', MOCKS.map((m) => `${m.serial}@${m.port}`).join(', '))

  // -- services + runtime (one process, one HRPC channel) ------------------
  let worker = await startWhatsminerWorker({
    ...WORKER_OPTS,
    seedDevices: MOCKS.map((m, i) => ({
      id: m.serial,
      opts: { address: '127.0.0.1', port: m.port, password: 'admin' },
      info: { container: 'ctn-1', pos: String(i + 1), serialNum: m.serial }
    }))
  })
  console.log('worker runtime up: %s hosting %d devices', WORKER_ID, MOCKS.length)

  // -- kernel + discovery ---------------------------------------------------
  const kernel = await getKernel({
    root: ROOT,
    topic: crypto.randomBytes(32).toString('hex'),
    keyFile: path.join(ROOT, 'kernel-key'),
    actionIntvlMs: 500
  })
  await kernel.registerWorker(worker.runtime.getPublicKey())
  await waitForDiscovery(kernel)
  console.log('kernel discovered:', kernel.registry.listWorkers()
    .map((w) => `${w.workerId} [${w.state}] devices=${(w.deviceIds || []).join(',')}`).join('; '))

  const client = createMdkClient({ hrpc: { key: kernel.getPublicKey() } })
  await client.connect({ warmup: true })

  // 1. metrics pull ---------------------------------------------------------
  const metrics = await client.pullTelemetry('WM-001', 'metrics')
  check('metrics pull', metrics.metrics && metrics.metrics.hashrate_avg > 0 && metrics.metrics.snap.success,
    `hashrate_avg=${metrics.metrics?.hashrate_avg} TH/s power=${metrics.metrics?.power} W status=${metrics.metrics?.status}`)

  // 2. named telemetry channel ---------------------------------------------
  const channel = await client.pullTelemetry('WM-002', 'power_mode')
  check('named channel pull (power_mode)', channel.name === 'power_mode' && channel.value === 'normal',
    `value=${channel.value}`)

  // 3. device command via kernel (observable effect on the mock) ------------
  const led = await client.sendCommand('WM-002', 'setLED', { enabled: true })
  const ledOn = await pollUntil(async () => {
    const snap = await client.pullTelemetry('WM-002', 'snap')
    return snap.value && snap.value.config.led_status === true
  })
  check('device command (setLED via kernel)', led.commandId && ledOn, `commandId=${led.commandId} led_status=true`)

  // 4. logs (snap history written by SnapsService) ---------------------------
  const logsRes = await pollUntil(async () => {
    const res = await client.pullTelemetry('WM-001', { type: 'logs', key: 'thing-5m', tag: 'WM-001', limit: 3 })
    return Array.isArray(res.logs) && res.logs.length ? res : undefined
  })
  check('logs pull (thing-5m tail)', logsRes && logsRes.logs[0].snap && logsRes.logs[0].snap.stats.status,
    `entries=${logsRes?.logs?.length} latest status=${logsRes?.logs?.[0]?.snap?.stats?.status}`)

  // 5. historical_logs (info history from provisioning updates) -------------
  await client.sendWorkerCommand(WORKER_ID, null, 'updateThing', { id: 'WM-001', info: { pos: '1A' } })
  const hist = await client.pullTelemetry('WM-001', { type: 'historical_logs', logType: 'info', limit: 10 })
  const posChange = (hist.logs || []).find((e) => e.changes && e.changes.pos)
  check('historical_logs pull (info history)', posChange && posChange.changes.pos.newValue === '1A',
    `pos ${posChange?.changes?.pos?.oldValue} → ${posChange?.changes?.pos?.newValue}`)

  // 6. stats (aggregated over both devices with the whatsminer stat specs) ---
  const stats = await client.pullTelemetry('WM-001', { type: 'stats', deviceIds: ['WM-001', 'WM-002'] })
  const statKeys = Object.keys(stats.stats || {})
  check('stats pull (aggrStats)', statKeys.length > 0 && stats.stats.online_or_minor_error_miners_cnt === 2,
    `online=${stats.stats?.online_or_minor_error_miners_cnt}/2 keys=[${statKeys.slice(0, 5).join(',')}...]`)

  // 7. saveComment → read-back ----------------------------------------------
  await client.sendCommand('WM-001', 'saveComment', { comment: 'parity check', user: 'op-1' })
  const cfg = await pollUntil(async () => {
    const res = await client.pullTelemetry('WM-001', 'thing_config')
    return (res.config?.comments || []).some((c) => c.comment === 'parity check') ? res : undefined
  })
  check('saveComment → thing_config read-back', !!cfg,
    `comments=${JSON.stringify(cfg?.config?.comments?.map((c) => c.comment))}`)

  // 8. saveSettings → settings ----------------------------------------------
  await client.sendCommand('WM-001', 'saveSettings', { maxTempC: 85 })
  const settings = await pollUntil(async () => {
    const res = await client.pullTelemetry('WM-001', 'settings')
    return res.settings?.maxTempC === 85 ? res : undefined
  })
  check('saveSettings → settings pull', !!settings, `settings=${JSON.stringify(settings?.settings)}`)

  // 9. write.calls.request via the Kernel action-approver flow --------------
  const pushed = await client.pushAction({
    query: {},
    action: 'setPowerMode',
    params: ['low'],
    voter: 'op-1',
    authPerms: ['miner:rw']
  })
  const actionEntry = (await client.getActionsBatch({ ids: [pushed.id] }))[0]
  const calls = actionEntry?.action?.targets?.[WORKER_ID]?.calls || []
  check('write.calls.request (action targets)', pushed.id && calls.length === 2,
    `action=${pushed.id} calls=[${calls.map((c) => c.id).join(',')}]`)

  if (actionEntry?.type === 'voting') {
    await client.voteAction({ id: pushed.id, voter: 'op-2', approve: true, authPerms: ['miner:rw'] })
  }
  const lowMode = await pollUntil(async () => {
    const a = await client.pullTelemetry('WM-001', 'power_mode')
    const b = await client.pullTelemetry('WM-002', 'power_mode')
    return a.value === 'low' && b.value === 'low'
  })
  check('approved action executes on every targeted device', !!lowMode, 'power_mode=low on WM-001 and WM-002')

  // 10. provisioning: register → restart → 3 devices -------------------------
  const reg = await client.sendWorkerCommand(WORKER_ID, null, 'registerThing', {
    id: 'WM-003',
    opts: { address: '127.0.0.1', port: 15203, password: 'admin' },
    info: { container: 'ctn-1', pos: '3', serialNum: 'WM-003' }
  })
  check('registerThing persists a device config', reg.payload?.status === 'SUCCESS',
    `status=${reg.payload?.status}`)

  const mock3 = startMock({ serial: 'WM-003', port: 15203 })
  await mock3.ready
  mocks.push(mock3)

  await worker.stop()
  worker = await startWhatsminerWorker(WORKER_OPTS) // no seeds: devices come from the store
  await kernel.registerWorker(worker.runtime.getPublicKey())

  const rediscovered = await pollUntil(async () => {
    const { workers } = await client.getStatus({ retries: 1 })
    const w = workers.find((x) => x.workerId === WORKER_ID)
    return w && w.state === 'READY' && w.deviceIds.length === 3 ? w : undefined
  }, { timeoutMs: 30000 })
  check('restart picks up the provisioned device set', rediscovered && rediscovered.deviceIds.includes('WM-003'),
    `devices=[${rediscovered?.deviceIds?.join(',')}]`)

  const m3 = await pollUntil(async () => {
    const res = await client.pullTelemetry('WM-003', 'metrics')
    return res.metrics && res.metrics.hashrate_avg > 0 ? res : undefined
  })
  check('new device serves telemetry after restart', !!m3, `WM-003 hashrate_avg=${m3?.metrics?.hashrate_avg} TH/s`)

  // -- verdict ---------------------------------------------------------------
  const failed = results.filter(([, ok]) => !ok)
  console.log(failed.length
    ? `\nPARITY E2E FAILED — ${failed.length}/${results.length} flows broken: ${failed.map(([n]) => n).join('; ')}`
    : `\nPARITY E2E OK — all ${results.length} legacy flows round-trip through kernel → runtime → services/plugin`)

  await client.close()
  await shutdown(kernel)
  await worker.stop()
  for (const mock of mocks) mock.exit()
  process.exit(failed.length ? 1 : 0)
}

main().catch((err) => { console.error(err); process.exit(1) })
