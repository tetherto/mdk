'use strict'

const test = require('brittle')
const { HRPCGateway } = require('../../../ork/lib/transport/hrpc-gateway')
const { createMdkClient } = require('../../index')

function createMockModules () {
  const workers = [
    { workerId: 'worker-1', deviceIds: ['wm001', 'wm002'], state: 'READY', healthState: 'HEALTHY' }
  ]
  return {
    dispatcher: {
      async dispatch (envelope) {
        return { commandId: 'cmd-1', status: 'QUEUED', deviceId: envelope.deviceId, command: envelope.payload.command }
      }
    },
    telemetryCollector: {
      async pull (deviceId, query) {
        return { deviceId, metrics: { stats: { hashrate_mhs: { avg: 90 } } }, queryType: query && query.type }
      }
    },
    registry: {
      listWorkers () { return workers },
      getCapabilities (deviceId) { return { commands: [{ name: 'setPowerMode' }] } }
    }
  }
}

async function startGateway (t) {
  const gateway = new HRPCGateway({ ...createMockModules(), whitelist: [] })
  const { publicKey } = await gateway.start()
  t.teardown(() => gateway.stop())
  return { gateway, publicKey }
}

test('hrpc client - createMdkClient over HRPC exposes the full method surface', async (t) => {
  const { publicKey } = await startGateway(t)

  const client = createMdkClient({ hrpc: { key: publicKey } })
  await client.connect()
  t.teardown(() => client.close())

  for (const m of ['connect', 'close', 'listWorkers', 'getCapabilities', 'pullTelemetry', 'pullState', 'sendCommand', 'terminateWorker']) {
    t.is(typeof client[m], 'function', `has ${m}()`)
  }
})

test('hrpc client - worker.list round-trips through the RPC gateway', async (t) => {
  const { publicKey } = await startGateway(t)

  const client = createMdkClient({ hrpc: { key: publicKey.toString('hex') } })
  await client.connect()
  t.teardown(() => client.close())

  const res = await client.listWorkers()
  t.ok(res.workers, 'response has workers')
  t.is(res.workers.length, 1)
  t.is(res.workers[0].workerId, 'worker-1')
})

test('hrpc client - telemetry pull and command request carry payload + deviceId', async (t) => {
  const { publicKey } = await startGateway(t)

  const client = createMdkClient({ hrpc: { key: publicKey } })
  await client.connect()
  t.teardown(() => client.close())

  const tel = await client.pullTelemetry('wm001', 'metrics')
  t.is(tel.deviceId, 'wm001', 'deviceId routed')
  t.is(tel.queryType, 'metrics', 'query.type forwarded')

  const cmd = await client.sendCommand('wm001', 'setPowerMode', { mode: 'eco' })
  t.is(cmd.status, 'QUEUED')
  t.is(cmd.deviceId, 'wm001')
  t.is(cmd.command, 'setPowerMode', 'command name forwarded in payload')
})

test('hrpc client - concurrent requests all resolve correctly', async (t) => {
  const { publicKey } = await startGateway(t)

  const client = createMdkClient({ hrpc: { key: publicKey } })
  await client.connect()
  t.teardown(() => client.close())

  const results = await Promise.all([
    client.listWorkers(),
    client.pullTelemetry('wm002', 'metrics'),
    client.listWorkers()
  ])
  t.is(results[0].workers.length, 1)
  t.is(results[1].deviceId, 'wm002')
  t.is(results[2].workers.length, 1)
})

test('hrpc client - missing key throws ERR_MDK_CLIENT_HRPC_KEY_REQUIRED', (t) => {
  t.exception(() => createMdkClient({ hrpc: {} }), /ERR_MDK_CLIENT_HRPC_KEY_REQUIRED/)
})

test('hrpc client - no transport throws ERR_MDK_CLIENT_TRANSPORT_REQUIRED', (t) => {
  t.exception(() => createMdkClient({}), /ERR_MDK_CLIENT_TRANSPORT_REQUIRED/)
})
