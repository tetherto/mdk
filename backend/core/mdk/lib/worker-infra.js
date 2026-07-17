'use strict'

const debug = require('debug')('mdk:worker-infra')
const StoreFacility = require('@tetherto/hp-svc-facs-store')
const LogsService = require('./services/logs.service')
const LogHistoryService = require('./services/log-history.service')
const SettingsService = require('./services/settings.service')
const CommentsService = require('./services/comments.service')
const AlertsService = require('./services/alerts.service')
const StatsService = require('./services/stats.service')
const SnapsService = require('./services/snaps.service')
const ActionsService = require('./services/actions.service')
const DeviceProvisioningService = require('./services/provisioning.service')
const gLibStats = require('../../lib-stats')

const THING_CONF_DEFAULTS = {
  collectSnapsItvMs: 60000,
  rotateLogsItvMs: 120000,
  refreshLogsCacheItvMs: 60000,
  statsRtdItvMs: 30000,
  thingQueryConcurrency: 25,
  storeSnapItvMs: 300000,
  collectSnapTimeoutMs: 120000,
  logKeepCount: 3
}

const TF_MS = { m: 60000, h: 3600000, D: 86400000 }

function _timeframeIntervals () {
  return gLibStats.defaults.timeframes.map(([tf]) => {
    const n = parseInt(tf, 10)
    const unit = tf.slice(String(n).length)
    return [tf, n * (TF_MS[unit] || 60000)]
  })
}

/**
 * Builds the injectable service set for a runtime-hosted worker:
 * store → provisioning (+ one-time seeding) → logs/settings/comments/
 * alerts/stats/log-history/actions/snaps.
 *
 * Device access is late-bound: services capture deviceCall(), which routes
 * through the accessor installed by bindRuntime(runtime) once the
 * WorkerRuntime exists. Boot order is therefore
 *   createWorkerInfra → new WorkerRuntime({ services }) → bindRuntime →
 *   runtime.start → startTimers
 * and teardown is stop({ runtime }).
 *
 * opts:
 *   storeDir     (required) persistent store directory
 *   deviceType   (required) e.g. miner-wm-m56s
 *   deviceTags   provisioning tags, e.g. ['whatsminer']
 *   specTags     alert/stat spec lookup tags, e.g. ['miner']
 *   baseType     stats base type, e.g. 'miner'
 *   alertsLib    worker alerts template ({ specs })
 *   statsLib     worker stats template ({ conf, specs })
 *   thingConf    cadence/behavior overrides merged over THING_CONF_DEFAULTS
 *   provisioningConf  extra provisioning conf (pools, ...)
 *   seedDevices  registerThing payloads applied once when the store is empty
 *   writeActions whitelist entries [[action, votes], ...]
 *   addlStats    extra stat cadences [[tf, itvMs], ...];
 *                defaults to [['rtd', thingConf.statsRtdItvMs]]
 */
async function createWorkerInfra (opts) {
  if (!opts || !opts.storeDir) throw new Error('ERR_STORE_DIR_REQUIRED')
  if (!opts.deviceType) throw new Error('ERR_DEVICE_TYPE_REQUIRED')

  const thingConf = { ...THING_CONF_DEFAULTS, ...opts.thingConf }

  const store = new StoreFacility({}, { storeDir: opts.storeDir }, {})
  await new Promise((resolve, reject) => store.start((err) => (err ? reject(err) : resolve())))

  const db = await store.getBee({ name: 'main' }, { keyEncoding: 'utf-8' })
  await db.ready()

  let _getDeviceContext = null
  function deviceCall (deviceId, fn) {
    if (!_getDeviceContext) throw new Error('ERR_RUNTIME_NOT_BOUND')
    const ctx = _getDeviceContext(deviceId)
    if (!ctx) throw new Error(`ERR_DEVICE_UNAVAILABLE: ${deviceId}`)
    return fn(ctx.device)
  }

  const logs = new LogsService({
    store,
    metaLogs: db.sub('meta_logs_00'),
    conf: thingConf
  })

  const provisioning = new DeviceProvisioningService({
    db: db.sub('things'),
    logs,
    deviceType: opts.deviceType,
    deviceTags: opts.deviceTags || [],
    conf: { allowDuplicateIPs: thingConf.allowDuplicateIPs, ...opts.provisioningConf }
  })
  await provisioning.init()

  let seeded = 0
  if (!provisioning.listDeviceIds().length && Array.isArray(opts.seedDevices)) {
    for (const seed of opts.seedDevices) {
      await provisioning.registerThing(seed)
      seeded++
    }
  }

  const settings = new SettingsService({ settingsDb: db.sub('settings') })

  const comments = new CommentsService({
    loadThing: (req) => provisioning.loadThing(req),
    saveThing: (dev) => provisioning.saveThing(dev),
    checkThingExists: (req) => provisioning.checkThingExists(req),
    generateId: () => provisioning.generateId()
  })

  const specTags = opts.specTags || []

  // snaps ↔ alerts are mutually recursive (alerts persist what snaps collect,
  // snaps evaluate alerts per snapshot) — resolved via this late binding.
  let snaps = null

  const alerts = new AlertsService({
    logs,
    lib: opts.alertsLib,
    conf: { thing: thingConf },
    specTags,
    listDevices: () => (snaps ? snaps.listLast() : [])
  })

  const stats = new StatsService({
    lib: opts.statsLib,
    specTags,
    baseType: opts.baseType,
    listDeviceIds: () => provisioning.listDeviceIds(),
    getDeviceMeta: (id) => provisioning.getDeviceMeta(id),
    getLast: (id) => (snaps ? snaps.getLast(id) : undefined),
    getRealtimeData: (id) => deviceCall(id, (device) => device.getRealtimeData()),
    processAlerts: (dev) => alerts.processThingAlerts(dev),
    logs,
    conf: thingConf
  })

  const logHistory = new LogHistoryService({
    logs,
    getDeviceInfo: (id) => provisioning.getDevice(id),
    statTimeframes: gLibStats.defaults.timeframes,
    conf: thingConf
  })

  const actions = new ActionsService({
    listDevices: () => provisioning.listDevices({ limit: 100000 }),
    validateWriteAction: (dev, action, params) =>
      deviceCall(dev.id, (device) => device.validateWriteAction(action, ...params))
  })
  if (Array.isArray(opts.writeActions)) actions.whitelistActions(opts.writeActions)

  snaps = new SnapsService({
    listDeviceIds: () => provisioning.listDeviceIds(),
    getDeviceMeta: (id) => provisioning.getDeviceMeta(id),
    collectSnap: (id) => deviceCall(id, (device) => device.getSnap()),
    processAlerts: (dev) => alerts.processThingAlerts(dev),
    saveAlerts: () => alerts.saveAlerts(),
    logs,
    conf: thingConf
  })

  const services = { logs, logHistory, settings, comments, alerts, stats, snaps, actions, provisioning }

  const addlStats = opts.addlStats || [['rtd', thingConf.statsRtdItvMs]]
  const timers = []

  return {
    store,
    db,
    services,
    seeded,
    thingConf,
    deviceCall,
    bindRuntime (runtime) {
      _getDeviceContext = (deviceId) => runtime.getDeviceContext(deviceId)
    },
    startTimers () {
      snaps.start()
      timers.push(
        setInterval(() => { logs.rotateLogs().catch((e) => debug('rotateLogs: %s', e.message)) }, thingConf.rotateLogsItvMs),
        setInterval(() => { logs.refreshLogsCache().catch((e) => debug('refreshLogsCache: %s', e.message)) }, thingConf.refreshLogsCacheItvMs)
      )
      for (const [tf, itvMs] of addlStats) {
        timers.push(setInterval(() => {
          Promise.resolve(stats.buildStats(`stat-${tf}`)).catch((e) => debug('stat-%s: %s', tf, e.message))
        }, itvMs))
      }
      for (const [tf, ms] of _timeframeIntervals()) {
        timers.push(setInterval(() => {
          Promise.resolve(stats.buildStats(`stat-${tf}`, new Date())).catch((e) => debug('stat-%s: %s', tf, e.message))
        }, ms))
      }
      for (const timer of timers) timer.unref()
    },
    async stop ({ runtime } = {}) {
      snaps.stop()
      for (const timer of timers) clearInterval(timer)
      timers.length = 0
      if (runtime) await runtime.stop()
      await new Promise((resolve) => store.stop(() => resolve()))
    }
  }
}

module.exports = { createWorkerInfra, THING_CONF_DEFAULTS }
