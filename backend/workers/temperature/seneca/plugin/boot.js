'use strict'

const debug = require('debug')('mdk:worker:seneca:boot')
const WorkerRuntime = require('../../../../core/mdk-worker/lib/worker-runtime')
const { createWorkerInfra } = require('../../../../core/mdk/lib/worker-infra')
const alertsLib = require('../lib/templates/alerts')
const statsLib = require('../lib/templates/stats')
const plugin = require('.')

const WRITE_ACTIONS = [
  ['registerThing', 1],
  ['updateThing', 1],
  ['forgetThings', 1]
]

/**
 * Boots a Seneca temperature-sensor worker on the WorkerRuntime. Read-only
 * device: the only write actions are the provisioning builtins. Device specs
 * require unitId AND register in addition to address/port.
 *
 * opts:
 *   workerId    (required) one runtime process = one workerId
 *   storeDir    (required) persistent store directory
 *   kernelTopic    Kernel discovery topic (hex); omit to register by key
 *   bootstrap   DHT bootstrap override for hermetic tests
 *   conf        { thing: { alerts, sensor, ...intervals }, allowDuplicateIPs }
 *   seedDevices registerThing payloads applied once when the store is empty
 */
async function startSenecaWorker (opts) {
  if (!opts || !opts.workerId) throw new Error('ERR_WORKER_ID_REQUIRED')
  if (!opts.storeDir) throw new Error('ERR_STORE_DIR_REQUIRED')

  // the legacy type-manager chain appends the suffix twice — kept for
  // store/config compatibility with provisioned fleets
  const deviceType = 'sensor-temp-seneca-temp-seneca'
  const conf = opts.conf || {}

  const infra = await createWorkerInfra({
    storeDir: opts.storeDir,
    deviceType,
    deviceTags: ['temp', 'seneca'],
    specTags: ['sensor'],
    baseType: 'sensor',
    alertsLib,
    statsLib,
    // legacy SensorManger rtd cadence is */10s
    thingConf: { statsRtdItvMs: 10000, allowDuplicateIPs: conf.allowDuplicateIPs, ...conf.thing },
    seedDevices: opts.seedDevices,
    writeActions: WRITE_ACTIONS
  })
  const { services, store, seeded, thingConf } = infra
  const { provisioning } = services

  const sensorConf = thingConf.sensor || {}
  const runtime = new WorkerRuntime(plugin, {
    workerId: opts.workerId,
    kernelTopic: opts.kernelTopic || null,
    bootstrap: opts.bootstrap || null,
    store,
    services,
    allowEmptyDevices: true,
    devices: provisioning.buildRuntimeDevices().map((dev) => ({
      deviceId: dev.deviceId,
      config: {
        ...dev.config,
        conf: sensorConf,
        type: deviceType
      }
    }))
  })
  infra.bindRuntime(runtime)

  await runtime.start()
  infra.startTimers()

  debug('seneca worker %s up: %d devices (type %s)', opts.workerId, provisioning.listDeviceIds().length, deviceType)

  return {
    runtime,
    services,
    store,
    seeded,
    stop: () => infra.stop({ runtime })
  }
}

module.exports = { startSenecaWorker }
