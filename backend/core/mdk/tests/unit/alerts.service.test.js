'use strict'

const test = require('brittle')
const AlertsService = require('../../lib/services/alerts.service')
const LogsService = require('../../lib/services/logs.service')
const { createTestStore, createTestBee } = require('../helpers/store')

const TYPE = 'miner-wm'
const CONF = {
  thing: {
    alerts: {
      [TYPE]: {
        overheat: { name: 'overheat', code: 'overheat', description: 'too hot', severity: 'high' }
      }
    }
  }
}

const LIB = {
  specs: {
    miner: {
      overheat: {
        valid: (ctx, snap) => !!snap.stats,
        probe: (ctx, snap) => snap.stats.temperature > 90
      }
    }
  }
}

function makeDevice (last) {
  return { id: 'dev-1', type: TYPE, info: { container: 'c1' }, last }
}

function createService (opts = {}) {
  return new AlertsService({
    logs: opts.logs || { getBeeTimeLog: async () => null, releaseBeeTimeLog: async () => {} },
    lib: opts.lib === undefined ? LIB : opts.lib,
    conf: opts.conf === undefined ? CONF : opts.conf,
    specTags: ['miner'],
    listDevices: opts.listDevices || (() => [])
  })
}

test('processThingAlerts returns null without lib or per-type config', (t) => {
  t.is(createService({ lib: null }).processThingAlerts(makeDevice({})), null)
  t.is(createService({ conf: {} }).processThingAlerts(makeDevice({})), null)
})

test('processThingAlerts emits error_snap when there is no snap', (t) => {
  const svc = createService()
  const alerts = svc.processThingAlerts(makeDevice({ err: 'ERR_READ_FAILED' }))
  t.is(alerts.length, 1)
  t.is(alerts[0].name, 'error_snap')
  t.is(alerts[0].description, 'ERR_READ_FAILED')
})

test('processThingAlerts probes specs and applies alert config', (t) => {
  const svc = createService()

  const hot = svc.processThingAlerts(makeDevice({ snap: { stats: { temperature: 95 } } }))
  t.is(hot.length, 1)
  t.is(hot[0].name, 'overheat')
  t.is(hot[0].severity, 'high')

  const cool = svc.processThingAlerts(makeDevice({ snap: { stats: { temperature: 50 } } }))
  t.is(cool, null)
})

test('processThingAlerts includes raw_errors from the snap', (t) => {
  const svc = createService()
  const alerts = svc.processThingAlerts(makeDevice({
    snap: { stats: { temperature: 20 }, raw_errors: [{ name: 'psu_fail', code: 200, message: 'Error code 200' }] }
  }))
  t.is(alerts.length, 1)
  t.is(alerts[0].name, 'psu_fail')
  t.is(alerts[0].severity, 'high')
  t.is(alerts[0].message, 'Error code 200')
})

test('processThingAlerts keeps createdAt/uuid of persisting alerts', (t) => {
  const svc = createService()
  const prev = svc.processThingAlerts(makeDevice({ snap: { stats: { temperature: 95 } } }))

  const next = svc.processThingAlerts(makeDevice({
    snap: { stats: { temperature: 96 } },
    alerts: prev
  }))
  t.is(next[0].uuid, prev[0].uuid)
  t.is(next[0].createdAt, prev[0].createdAt)
})

test('saveAlerts persists per-device alerts to the thing-alerts log', async (t) => {
  const { store, teardown } = await createTestStore()
  t.teardown(teardown)
  const db = await createTestBee(store, 'main')
  const logs = new LogsService({ store, metaLogs: db.sub('meta_logs_00'), conf: {} })

  const alert = { name: 'overheat', code: 'overheat', severity: 'high', createdAt: Date.now(), uuid: 'u-1' }
  const svc = createService({
    logs,
    listDevices: () => [{ id: 'dev-1', last: { alerts: [alert] } }]
  })

  await svc.saveAlerts()

  const log = await logs.getBeeTimeLog('thing-alerts', 0)
  const entries = []
  for await (const chunk of log.createReadStream({})) {
    entries.push(JSON.parse(chunk.value.toString()))
  }
  await logs.releaseBeeTimeLog(log)

  t.is(entries.length, 1)
  t.is(entries[0]['u-1'].name, 'overheat')
  t.is(entries[0]['u-1'].thingId, 'dev-1')
})

test('constructor applies defaults for optional collaborators', (t) => {
  const svc = new AlertsService({ logs: {} })
  t.is(svc.lib, null)
  t.alike(svc.conf, {})
  t.alike(svc.specTags, [])
  t.alike(svc.listDevices(), [])
})
