'use strict'

const test = require('brittle')
const net = require('net')

const { LatencyRecorder } = require('../lib/latency')
const {
  assertTelemetry, assertCommand, mapWithConcurrency, measureCycleHeadroom, runReadLoad, runActionLoad,
  measureDeviceBaseline, tcpConnectLatencyMs, pollAlerts, pollAlertsViaGateway
} = require('../lib/load')

// pullTelemetry / sendCommand stand-ins: device ids starting with `timeout`
// fail with a timeout, `reject` with any other error, `offline` answer with an
// error payload (as a Worker does for a device it holds offline), everything
// else answers.
function fakeClient ({ things = () => [] } = {}) {
  const fail = (id) => {
    if (id.startsWith('timeout')) throw new Error('ERR_TIMEOUT: device timeout')
    if (id.startsWith('reject')) throw new Error('ERR_REFUSED')
  }
  return {
    async pullTelemetry (id, query) {
      await new Promise((resolve) => setImmediate(resolve))
      if (query && query.type === 'list') {
        if (id.startsWith('down')) throw new Error('ERR_UNREACHABLE')
        return { things: things(id) }
      }
      fail(id)
      if (id.startsWith('offline')) return { deviceId: id, error: `ERR_DEVICE_UNAVAILABLE: ${id}` }
      return { metrics: {} }
    },
    async sendCommand (id) {
      await new Promise((resolve) => setImmediate(resolve))
      fail(id)
      if (id.startsWith('offline')) return { status: 'FAILED', error: `ERR_DEVICE_UNAVAILABLE: ${id}` }
      return { ok: true }
    }
  }
}

function listen (t) {
  return new Promise((resolve) => {
    const server = net.createServer((socket) => socket.destroy())
    server.listen(0, '127.0.0.1', () => {
      t.teardown(() => new Promise((resolve) => server.close(resolve)))
      resolve(server.address().port)
    })
  })
}

test('mapWithConcurrency: preserves order and caps in-flight work', async (t) => {
  const { results, peakInFlight } = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (x, i) => {
    await new Promise((resolve) => setTimeout(resolve, 5))
    return x * 10 + i
  })
  t.alike(results, [10, 21, 32, 43, 54])
  t.is(peakInFlight, 2)

  const empty = await mapWithConcurrency([], 4, async () => 1)
  t.alike(empty.results, [])
  t.is(empty.peakInFlight, 0)
})

test('measureCycleHeadroom: per-worker cycle times and failure tallies', async (t) => {
  const recorder = new LatencyRecorder('cycle')
  const byWorker = await measureCycleHeadroom({
    client: fakeClient(),
    workerDeviceMap: { w0: ['ok-1', 'ok-2'], w1: ['ok-3', 'timeout-1', 'reject-1'] },
    concurrency: 2,
    rounds: 2,
    recorder
  })
  t.is(byWorker.w0.deviceCount, 2)
  t.is(byWorker.w0.cycleMsSamples.length, 2)
  t.is(byWorker.w0.rejected, 0)
  t.is(byWorker.w1.timedOut, 2)
  t.is(byWorker.w1.rejected, 2)
  t.ok(byWorker.w1.maxCycleMs >= byWorker.w1.avgCycleMs)
  t.is(recorder.summary().n, 6)
  t.is(recorder.summary().errors, 4)
})

test('runReadLoad: sustained reads tally completed / rejected / timed out', async (t) => {
  const recorder = new LatencyRecorder('read')
  const res = await runReadLoad({ client: fakeClient(), deviceIds: ['ok-1', 'timeout-1', 'reject-1'], durationMs: 60, concurrency: 3, recorder })
  t.ok(res.completed > 0)
  t.ok(res.timedOut > 0)
  t.ok(res.rejected > 0)
  t.ok(res.peakQueueDepth <= 3)
  t.ok(res.readsPerSec > 0)
  t.is(recorder.summary().errors, res.rejected + res.timedOut)
})

test('assertTelemetry: error payloads and empty or all-failed metrics throw', (t) => {
  const ok = { metrics: { stats: { hashrate: 1 } } }
  t.is(assertTelemetry(ok), ok)
  t.is(assertTelemetry({ metrics: {} }).metrics.constructor, Object, 'no channels is not a failure')
  t.exception(() => assertTelemetry({ error: 'ERR_DEVICE_UNAVAILABLE: d1' }), /ERR_DEVICE_UNAVAILABLE/)
  t.exception(() => assertTelemetry({ deviceId: 'd1', metrics: null }), /ERR_BENCH_TELEMETRY_EMPTY/, 'Gateway route shape')
  t.exception(() => assertTelemetry({}), /ERR_BENCH_TELEMETRY_EMPTY/)
  t.exception(() => assertTelemetry({ metrics: { stats: { error: 'ERR_TELEMETRY_FAILED' } } }), /ERR_TELEMETRY_FAILED/)
  t.is(assertTelemetry({ metrics: { stats: { error: 'ERR_X' }, info: {} } }).metrics.info.constructor, Object, 'one answering channel is enough')
})

test('assertTelemetry: a failed live snap throws even while cached channels still answer', (t) => {
  const cached = { temperature: 36, status: 'mining' }
  t.ok(assertTelemetry({ metrics: { ...cached, snap: { success: true, stats: { status: 'mining' } } } }))
  t.exception(
    () => assertTelemetry({ metrics: { ...cached, snap: { success: false, stats: { status: 'error', errors: [{ msg: 'connect ECONNREFUSED 127.0.0.1:4999' }] } } } }),
    /ERR_BENCH_SNAP_FAILED: connect ECONNREFUSED/
  )
  t.exception(() => assertTelemetry({ metrics: { ...cached, snap: { success: false, stats: { status: 'offline' } } } }), /ERR_BENCH_SNAP_FAILED: offline/)
})

test('assertCommand: FAILED results throw, queued and successful ones pass', (t) => {
  t.ok(assertCommand({ commandId: 'c1', status: 'QUEUED' }))
  t.ok(assertCommand({ deviceId: 'd1', action: 'reboot', result: { status: 'SUCCESS' } }), 'Gateway route shape')
  t.exception(() => assertCommand({ status: 'FAILED', error: 'ERR_DEVICE_UNAVAILABLE: d1' }), /ERR_DEVICE_UNAVAILABLE/)
  t.exception(() => assertCommand({ result: { status: 'FAILED' } }), /ERR_BENCH_COMMAND_FAILED/)
})

test('runReadLoad / runActionLoad: an error payload counts as rejected, not completed', async (t) => {
  const readRecorder = new LatencyRecorder('read')
  const reads = await runReadLoad({ client: fakeClient(), deviceIds: ['offline-1'], durationMs: 40, concurrency: 2, recorder: readRecorder })
  t.is(reads.completed, 0)
  t.ok(reads.rejected > 0)
  t.is(readRecorder.summary().n, 0)

  const actionRecorder = new LatencyRecorder('action')
  const actions = await runActionLoad({ client: fakeClient(), deviceIds: ['offline-1'], durationMs: 40, ratePerSec: 200, recorder: actionRecorder, actionType: 'reboot' })
  t.is(actions.completed, 0)
  t.ok(actions.rejected > 0)
})

test('runActionLoad: open-loop submits tally outcomes', async (t) => {
  const recorder = new LatencyRecorder('action')
  const res = await runActionLoad({ client: fakeClient(), deviceIds: ['ok-1', 'timeout-1', 'reject-1'], durationMs: 80, ratePerSec: 200, recorder, actionType: 'reboot' })
  t.ok(res.completed > 0)
  t.ok(res.timedOut > 0)
  t.ok(res.rejected > 0)
  t.ok(res.peakInFlight >= 1)
  t.ok(res.actionsPerSec > 0)
  t.is(recorder.summary().n, res.completed)
})

test('tcpConnectLatencyMs: resolves against a listener, rejects on refusal and timeout', async (t) => {
  const port = await listen(t)
  t.ok(await tcpConnectLatencyMs('127.0.0.1', port) >= 0)

  const closedPort = await new Promise((resolve) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)) })
  })
  await t.exception(tcpConnectLatencyMs('127.0.0.1', closedPort), /ECONNREFUSED/)

  // TEST-NET-1 (RFC 5737) is never routed, so the connect hangs until the timeout.
  await t.exception(tcpConnectLatencyMs('192.0.2.1', 9, 20), /ERR_TIMEOUT|EHOSTUNREACH|ENETUNREACH/)
})

test('measureDeviceBaseline: samples devices and counts unreachable ones', async (t) => {
  const port = await listen(t)
  const closedPort = await new Promise((resolve) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)) })
  })
  const devices = [
    { opts: { address: '127.0.0.1', port } },
    { opts: { address: '127.0.0.1', port: closedPort } },
    { opts: { address: '127.0.0.1', port } }
  ]
  const summary = await measureDeviceBaseline({ devices, recorder: new LatencyRecorder('db'), sampleSize: 2 })
  t.is(summary.n, 1, 'sampleSize caps the devices probed')
  t.is(summary.errors, 1)
})

test('pollAlerts: records each device once, the first time it shows an alert', async (t) => {
  let round = 0
  const client = fakeClient({
    things: () => {
      round++
      if (round === 1) return [{ id: 'd1', last: { alerts: [] } }, { id: 'd2' }]
      return [
        { id: 'd1', last: { alerts: [{ name: 'temp' }, { name: 'fan' }] } },
        { id: 'd2', last: { alerts: [{ name: 'temp' }] } }
      ]
    }
  })
  const poll = pollAlerts({ client, workerDeviceMap: { w0: ['d1', 'd2'], w1: [], w2: ['down-1'] }, intervalMs: 5 })
  await new Promise((resolve) => setTimeout(resolve, 60))
  await poll.stop()

  t.alike([...poll.seenDeviceIds].sort(), ['d1', 'd2'])
  t.alike(poll.byName, { temp: 2, fan: 1 })
  t.is(poll.recorder.summary().n, 2)
})

test('pollAlertsViaGateway: per-device alerts through a caller-supplied fetch', async (t) => {
  let calls = 0
  const fetchDeviceAlerts = async (deviceId) => {
    calls++
    if (deviceId === 'broken') throw new Error('ERR_GATEWAY')
    if (deviceId === 'quiet') return []
    if (deviceId === 'odd') return null
    return [{ name: 'temp' }]
  }
  const poll = pollAlertsViaGateway({ fetchDeviceAlerts, allDeviceIds: ['d1', 'broken', 'quiet', 'odd'], intervalMs: 5 })
  await new Promise((resolve) => setTimeout(resolve, 40))
  await poll.stop()

  t.alike([...poll.seenDeviceIds], ['d1'])
  t.alike(poll.byName, { temp: 1 })
  t.ok(calls > 4, 'devices without alerts are polled again; seen ones are skipped')
})
