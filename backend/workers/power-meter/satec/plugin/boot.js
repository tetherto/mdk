'use strict'

const debug = require('debug')('mdk:worker:satec:boot')
const WorkerRuntime = require('../../../../core/mdk-worker/lib/worker-runtime')
const { createWorkerInfra } = require('../../../../core/mdk/lib/worker-infra')
const alertsLib = require('../lib/templates/alerts')
const statsLib = require('../lib/templates/stats')
const plugin = require('.')

const MODELS = ['pm180']

const WRITE_ACTIONS = [
  ['registerThing', 1],
  ['updateThing', 1],
  ['forgetThings', 1]
]

/**
 * Boots a SATEC power-meter worker on the WorkerRuntime. Read-only device:
 * the only write actions are the provisioning builtins.
 *
 * opts:
 *   workerId    (required) one runtime process = one workerId
 *   model       (required) pm180
 *   storeDir    (required) persistent store directory
 *   kernelTopic    Kernel discovery topic (hex); omit to register by key
 *   bootstrap   DHT bootstrap override for hermetic tests
 *   conf        { thing: { alerts, powermeter, ...intervals }, allowDuplicateIPs }
 *   seedDevices registerThing payloads applied once when the store is empty
 */
async function startSatecWorker (opts) {
  if (!opts || !opts.workerId) throw new Error('ERR_WORKER_ID_REQUIRED')
  if (!MODELS.includes(opts.model)) throw new Error(`ERR_MODEL_INVALID: ${opts.model}`)
  if (!opts.storeDir) throw new Error('ERR_STORE_DIR_REQUIRED')

  const deviceType = 'powermeter-satec-pm180'
  const conf = opts.conf || {}

  const infra = await createWorkerInfra({
    storeDir: opts.storeDir,
    deviceType,
    deviceTags: ['satec'],
    specTags: ['powermeter'],
    baseType: 'powermeter',
    alertsLib,
    statsLib,
    // legacy PowerMeterManager rtd cadence is */5s
    thingConf: { statsRtdItvMs: 5000, allowDuplicateIPs: conf.allowDuplicateIPs, ...conf.thing },
    seedDevices: opts.seedDevices,
    writeActions: WRITE_ACTIONS
  })
  const { services, store, seeded, thingConf } = infra
  const { provisioning } = services

  const powermeterConf = thingConf.powermeter || {}
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
        conf: powermeterConf,
        collectSnapsItvMs: thingConf.collectSnapsItvMs,
        type: deviceType
      }
    }))
  })
  infra.bindRuntime(runtime)

  await runtime.start()
  infra.startTimers()

  debug('satec worker %s up: %d devices (type %s)', opts.workerId, provisioning.listDeviceIds().length, deviceType)

  return {
    runtime,
    services,
    store,
    seeded,
    stop: () => infra.stop({ runtime })
  }
}

module.exports = { startSatecWorker }
