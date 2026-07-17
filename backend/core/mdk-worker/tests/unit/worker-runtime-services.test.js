'use strict'

const test = require('brittle')
const { WorkerRuntime } = require('../..')
const simPlugin = require('../fixtures/sim-plugin')
const { ACTIONS, MESSAGE_TYPES, PROTOCOL_VERSION } = require('../../../kernel/lib/protocol/actions')

const DEVICES = [
  { deviceId: 'SIM-001', config: { hashrate: 100, power: 3000 } },
  { deviceId: 'SIM-002', config: { hashrate: 140, power: 3200 } }
]

// Call-recording stub for the full services surface the built-ins dispatch to.
function createServicesStub () {
  const calls = []
  const record = (name, ret) => (req) => { calls.push([name, req]); return ret }
  return {
    calls,
    logHistory: {
      tailLog: record('tailLog', [{ ts: 1, n: 0 }]),
      getHistoricalLogs: record('getHistoricalLogs', [{ ts: 1, changes: {} }])
    },
    settings: {
      getSettings: record('getSettings', { a: 1 }),
      saveSettingsEntries: record('saveSettingsEntries', { a: 1, b: 2 })
    },
    stats: {
      aggrStats: (deviceIds, opts) => { calls.push(['aggrStats', { deviceIds, opts }]); return { hashrate_total: 240 } }
    },
    comments: {
      saveThingComment: record('saveThingComment', 1),
      editThingComment: record('editThingComment', 1),
      deleteThingComment: record('deleteThingComment', 1)
    },
    provisioning: {
      registerThing: record('registerThing', 1),
      updateThing: record('updateThing', 1),
      forgetThings: record('forgetThings', 1),
      getThingConf: record('getThingConf', { id: 'SIM-001', opts: { address: '127.0.0.1' } }),
      listDeviceIds: () => ['SIM-001', 'SIM-002'],
      listDevices: (req) => {
        calls.push(['listDevices', req])
        return [
          { id: 'SIM-001', code: 'SIM-0001', type: 'miner-sim', tags: ['t-miner'], info: { container: 'c1', pos: '1' }, comments: [], opts: { address: '127.0.0.1', port: 1 } },
          { id: 'SIM-002', code: 'SIM-0002', type: 'miner-sim', tags: ['t-miner'], info: { container: 'c1', pos: '2' }, comments: [], opts: { address: '127.0.0.1', port: 2 } }
        ]
      }
    },
    snaps: {
      getLast: (id) => ({ snap: { stats: { status: 'mining', power_w: 3000 }, config: { power_mode: 'normal' } }, ts: 1 })
    },
    actions: {
      getWriteCalls: record('getWriteCalls', { reqVotes: 1, calls: [{ id: 'SIM-001', tags: [] }] })
    }
  }
}

async function createRuntime (services) {
  const runtime = new WorkerRuntime(simPlugin, { workerId: 'sim-rack-1', devices: DEVICES, services })
  await runtime._openContexts()
  return runtime
}

function req (action, payload = {}, deviceId = null) {
  return {
    id: 'req-1',
    version: PROTOCOL_VERSION,
    type: MESSAGE_TYPES.REQUEST,
    action,
    sender: 'kernel:kernel:test',
    target: null,
    deviceId,
    timestamp: Date.now(),
    payload
  }
}

function telemetry (query, deviceId = null) {
  return req(ACTIONS.TELEMETRY_PULL, { query }, deviceId)
}

function command (name, params = {}, deviceId = null) {
  return req(ACTIONS.COMMAND_REQUEST, { commandId: 'cmd-1', command: name, params }, deviceId)
}

test('ctx.services exposes the injected services to handlers', async (t) => {
  const services = createServicesStub()
  const runtime = await createRuntime(services)

  const ctx = runtime.getDeviceContext('SIM-001')
  t.is(ctx.services, services)
  t.is(ctx.deviceId, 'SIM-001')

  t.is(runtime.getDeviceContext('SIM-404'), null)
})

test('without services the ctx carries services: null and write calls stay unknown', async (t) => {
  const runtime = await createRuntime(undefined)
  t.is(runtime.getDeviceContext('SIM-001').services, null)

  const res = await runtime.handleRequest(req(ACTIONS.WRITE_CALLS_REQUEST, { query: {}, action: 'reboot', params: [] }))
  t.ok(res.payload.error.startsWith('ERR_UNKNOWN_ACTION'))
})

test('capability pull merges built-in command entries when services are present', async (t) => {
  const runtime = await createRuntime(createServicesStub())
  const res = await runtime.handleRequest(req(ACTIONS.CAPABILITY_REQUEST))

  const names = res.payload.contract.capabilities.commands.map((c) => c.name)
  t.alike(names.slice(0, 3), ['setPowerLimit', 'reboot', 'explode'], 'plugin commands first')
  for (const builtin of ['registerThing', 'updateThing', 'forgetThings', 'saveSettings', 'saveComment', 'editComment', 'deleteComment']) {
    t.ok(names.includes(builtin), `${builtin} advertised`)
  }

  // the plugin's own published contract is not mutated
  t.alike(simPlugin.contract.capabilities.commands.map((c) => c.name), ['setPowerLimit', 'reboot', 'explode'])
})

test('partial services only activate their own built-ins', async (t) => {
  const services = createServicesStub()
  delete services.comments
  const runtime = await createRuntime(services)

  const res = await runtime.handleRequest(req(ACTIONS.CAPABILITY_REQUEST))
  const names = res.payload.contract.capabilities.commands.map((c) => c.name)
  t.ok(names.includes('saveSettings'))
  t.absent(names.includes('saveComment'))

  const cmd = await runtime.handleRequest(command('saveComment', { comment: 'x' }, 'SIM-001'))
  t.is(cmd.payload.status, 'FAILED')
  t.ok(cmd.payload.error.startsWith('ERR_UNKNOWN_COMMAND'))
})

test('logs query dispatches to logHistory.tailLog with thingId', async (t) => {
  const services = createServicesStub()
  const runtime = await createRuntime(services)

  const res = await runtime.handleRequest(telemetry({ type: 'logs', key: 'thing-5m', tag: 'SIM-001' }, 'SIM-001'))
  t.is(res.action, ACTIONS.TELEMETRY_RESPONSE)
  t.alike(res.payload.logs, [{ ts: 1, n: 0 }])
  t.alike(services.calls[0], ['tailLog', { thingId: 'SIM-001', key: 'thing-5m', tag: 'SIM-001' }])
})

test('historical_logs dispatches to getHistoricalLogs', async (t) => {
  const services = createServicesStub()
  const runtime = await createRuntime(services)

  const res = await runtime.handleRequest(telemetry({ type: 'historical_logs', logType: 'info' }, 'SIM-001'))
  t.alike(res.payload.logs, [{ ts: 1, changes: {} }])
  t.alike(services.calls[0], ['getHistoricalLogs', { thingId: 'SIM-001', logType: 'info' }])
})

test('logs_multi fans out over hosted devices when none are named', async (t) => {
  const services = createServicesStub()
  const runtime = await createRuntime(services)

  const res = await runtime.handleRequest(telemetry({ type: 'logs_multi', key: 'thing-5m', tag: 'x' }))
  t.is(res.payload.logs.length, 2, 'one entry per hosted device')
  t.alike(services.calls.map((c) => c[1].thingId), ['SIM-001', 'SIM-002'])
})

test('logs_multi skips devices whose logs fail', async (t) => {
  const services = createServicesStub()
  services.logHistory.tailLog = async (req) => {
    if (req.thingId === 'SIM-001') throw new Error('ERR_LOG_NOTFOUND')
    return [{ ts: 2 }]
  }
  const runtime = await createRuntime(services)

  const res = await runtime.handleRequest(telemetry({ type: 'logs_multi', key: 'thing-5m', tag: 'x' }))
  t.alike(res.payload.logs, [{ ts: 2 }])
})

test('settings and stats queries work without a deviceId', async (t) => {
  const services = createServicesStub()
  const runtime = await createRuntime(services)

  const settings = await runtime.handleRequest(telemetry({ type: 'settings' }))
  t.alike(settings.payload.settings, { a: 1 })

  const stats = await runtime.handleRequest(telemetry({ type: 'stats', deviceIds: ['SIM-001', 'SIM-002'] }))
  t.alike(stats.payload.stats, { hashrate_total: 240 })
  t.alike(services.calls[1], ['aggrStats', { deviceIds: ['SIM-001', 'SIM-002'], opts: {} }])
})

test('legacy list query returns provisioned things with snapshots', async (t) => {
  const services = createServicesStub()
  const runtime = await createRuntime(services)

  const res = await runtime.handleRequest(telemetry({ type: 'list', status: true }))
  t.is(res.payload.things.length, 2)
  const thg = res.payload.things[0]
  t.is(thg.id, 'SIM-001')
  t.is(thg.code, 'SIM-0001')
  t.is(thg.info.container, 'c1')
  t.is(thg.rack, 'sim-rack-1')
  t.is(thg.last.snap.stats.status, 'mining')
  t.is(thg.last.snap.config.power_mode, 'normal')
  t.alike(services.calls[0], ['listDevices', { status: true, offset: 0, limit: 100 }])

  // without status: true the snapshot is omitted
  const bare = await runtime.handleRequest(telemetry({ type: 'list' }))
  t.is(bare.payload.things[0].last, undefined)
})

test('count and config queries answer the adapter-era shapes', async (t) => {
  const runtime = await createRuntime(createServicesStub())

  const count = await runtime.handleRequest(telemetry({ type: 'count' }, 'SIM-001'))
  t.is(count.payload.count, 2)

  const config = await runtime.handleRequest(telemetry({ type: 'config' }, 'SIM-001'))
  t.is(config.payload.config.workerId, 'sim-rack-1')
  t.is(config.payload.config.contract.deviceFamily, simPlugin.contract.metadata.deviceFamily)
})

test('without services list stays the bare device list and count/config stay unknown', async (t) => {
  const runtime = await createRuntime(undefined)

  const list = await runtime.handleRequest(telemetry({ type: 'list' }))
  t.alike(list.payload.devices.map((d) => d.deviceId), ['SIM-001', 'SIM-002'])
  t.is(list.payload.things, undefined)

  const count = await runtime.handleRequest(telemetry({ type: 'count' }, 'SIM-001'))
  t.ok(count.payload.error.startsWith('ERR_UNKNOWN_QUERY_TYPE'))
})

test('ext_data dispatches to pool.getWrkExtData with the query', async (t) => {
  const services = createServicesStub()
  let seen
  services.pool = {
    getWrkExtData: async (req) => { seen = req.query; return { stats: [{ poolType: 'ocean-btc' }] } }
  }
  const runtime = await createRuntime(services)

  const res = await runtime.handleRequest(telemetry({ type: 'ext_data', key: 'stats' }))
  t.is(seen.key, 'stats')
  t.is(res.payload.extData.stats[0].poolType, 'ocean-btc')

  const noPool = await createRuntime(createServicesStub())
  const miss = await noPool.handleRequest(telemetry({ type: 'ext_data', key: 'stats' }))
  t.ok(miss.payload.error, 'ext_data without pool service errors')
})

test('thing_config dispatches to provisioning.getThingConf', async (t) => {
  const services = createServicesStub()
  const runtime = await createRuntime(services)

  const res = await runtime.handleRequest(telemetry({ type: 'thing_config' }, 'SIM-001'))
  t.is(res.payload.config.id, 'SIM-001')
  t.alike(services.calls[0], ['getThingConf', { thingId: 'SIM-001' }])
})

test('builtin telemetry errors come back inside the payload', async (t) => {
  const services = createServicesStub()
  services.logHistory.tailLog = async () => { throw new Error('ERR_LOG_NOTFOUND') }
  const runtime = await createRuntime(services)

  const res = await runtime.handleRequest(telemetry({ type: 'logs', key: 'k', tag: 't' }, 'SIM-001'))
  t.is(res.payload.error, 'ERR_LOG_NOTFOUND')
})

test('unknown query types still error when services are present', async (t) => {
  const runtime = await createRuntime(createServicesStub())
  const res = await runtime.handleRequest(telemetry({ type: 'ext_data' }, 'SIM-001'))
  t.ok(res.payload.error.startsWith('ERR_UNKNOWN_QUERY_TYPE'))
})

test('comment commands route to the comments service with thingId', async (t) => {
  const services = createServicesStub()
  const runtime = await createRuntime(services)

  const res = await runtime.handleRequest(command('saveComment', { comment: 'hello', user: 'op' }, 'SIM-001'))
  t.is(res.payload.status, 'SUCCESS')
  t.is(res.payload.result, 1)
  t.alike(services.calls[0], ['saveThingComment', { thingId: 'SIM-001', comment: 'hello', user: 'op' }])

  await runtime.handleRequest(command('editComment', { id: 'c1', comment: 'v2', user: 'op' }, 'SIM-001'))
  await runtime.handleRequest(command('deleteComment', { id: 'c1', user: 'op' }, 'SIM-001'))
  t.alike(services.calls.map((c) => c[0]), ['saveThingComment', 'editThingComment', 'deleteThingComment'])
})

test('provisioning commands work worker-scoped (no deviceId)', async (t) => {
  const services = createServicesStub()
  const runtime = await createRuntime(services)

  const reg = await runtime.handleRequest(command('registerThing', { id: 'SIM-003', opts: { address: '10.0.0.3' } }))
  t.is(reg.payload.status, 'SUCCESS')
  t.alike(services.calls[0], ['registerThing', { id: 'SIM-003', opts: { address: '10.0.0.3' } }])

  const upd = await runtime.handleRequest(command('updateThing', { id: 'SIM-001', info: { pos: '2' } }))
  t.is(upd.payload.status, 'SUCCESS')
  t.alike(services.calls[1], ['updateThing', { id: 'SIM-001', info: { pos: '2' } }])

  const forget = await runtime.handleRequest(command('forgetThings', { query: { id: 'SIM-003' } }))
  t.is(forget.payload.status, 'SUCCESS')
  t.alike(forget.payload.result, { removed: 1 })
})

test('saveSettings routes to the settings service', async (t) => {
  const services = createServicesStub()
  const runtime = await createRuntime(services)

  const res = await runtime.handleRequest(command('saveSettings', { b: 2 }))
  t.is(res.payload.status, 'SUCCESS')
  t.alike(res.payload.result, { a: 1, b: 2 })
})

test('builtin command failures return FAILED with the error string', async (t) => {
  const services = createServicesStub()
  services.comments.saveThingComment = async () => { throw new Error('ERR_THING_NOTFOUND') }
  const runtime = await createRuntime(services)

  const res = await runtime.handleRequest(command('saveComment', { comment: 'x' }, 'SIM-404'))
  t.is(res.payload.status, 'FAILED')
  t.is(res.payload.error, 'ERR_THING_NOTFOUND')
})

test('device commands still dispatch to plugin handlers when services are present', async (t) => {
  const runtime = await createRuntime(createServicesStub())

  const res = await runtime.handleRequest(command('setPowerLimit', { limit_watts: 3300 }, 'SIM-001'))
  t.is(res.payload.status, 'SUCCESS')
  t.is(res.payload.result.watts, 3300)
})

test('positional action-approver params map onto contract-declared names', async (t) => {
  const runtime = await createRuntime(createServicesStub())

  // single positional arg — the action caller's { value: x } form
  const single = await runtime.handleRequest(command('setPowerLimit', { value: 3400 }, 'SIM-001'))
  t.is(single.payload.status, 'SUCCESS')
  t.is(single.payload.result.watts, 3400)

  // multi-arg { args: [...] } and raw array forms
  const args = await runtime.handleRequest(command('setPowerLimit', { args: [3500] }, 'SIM-001'))
  t.is(args.payload.result.watts, 3500)
  const arr = await runtime.handleRequest(command('setPowerLimit', [3600], 'SIM-001'))
  t.is(arr.payload.result.watts, 3600)

  // named params pass through untouched
  const named = await runtime.handleRequest(command('setPowerLimit', { limit_watts: 3700 }, 'SIM-001'))
  t.is(named.payload.result.watts, 3700)
})

test('allowEmptyDevices boots a zero-device runtime for provisioning-first bootstrap', async (t) => {
  const services = createServicesStub()
  const runtime = new WorkerRuntime(simPlugin, { workerId: 'sim-rack-1', devices: [], allowEmptyDevices: true, services })
  await runtime._openContexts()

  const identity = await runtime.handleRequest(req(ACTIONS.IDENTITY_REQUEST))
  t.alike(identity.payload.devices, [])

  // provisioning commands (worker-scoped) still work so devices can be registered
  const reg = await runtime.handleRequest(command('registerThing', { id: 'SIM-001', opts: {} }))
  t.is(reg.payload.status, 'SUCCESS')

  // without the flag an empty list is still an error
  t.exception(() => new WorkerRuntime(simPlugin, { workerId: 'w', devices: [] }), /ERR_DEVICES_REQUIRED/)
})

test('write.calls.request answers from the actions service', async (t) => {
  const services = createServicesStub()
  const runtime = await createRuntime(services)

  const res = await runtime.handleRequest(req(ACTIONS.WRITE_CALLS_REQUEST, { query: {}, action: 'reboot', params: [] }))
  t.is(res.action, ACTIONS.WRITE_CALLS_RESPONSE)
  t.alike(res.payload.calls, [{ id: 'SIM-001', tags: [] }])
  t.is(res.payload.reqVotes, 1)
  t.alike(services.calls[0], ['getWriteCalls', { query: {}, action: 'reboot', params: [] }])
})
