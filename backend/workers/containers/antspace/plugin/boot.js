'use strict'

const debug = require('debug')('mdk:worker:antspace:boot')
const WorkerRuntime = require('../../../../core/mdk-worker/lib/worker-runtime')
const { createWorkerInfra } = require('../../../../core/mdk/lib/worker-infra')
const alertsLib = require('../lib/templates/alerts')
const statsLib = require('../lib/templates/stats')
const plugin = require('.')

const MODELS = ['hk3', 'immersion']

const WRITE_ACTIONS = [
  ['switchContainer', 1],
  ['switchSocket', 1],
  ['switchCoolingSystem', 1],
  ['resetCoolingSystem', 2],
  ['setLiquidSupplyTemperature', 2]
]

// Container stat cadences, mirroring the legacy ContainerManager
// scheduleAddlStatTfs crons (1m, 20s, rtd every 30s).
const ADDL_STATS = [
  ['1m', 60000],
  ['20s', 20000],
  ['rtd', 30000]
]

/**
 * Boots an antspace worker on the WorkerRuntime. Same lifecycle model as the
 * miner boots: provisioning commands mutate the persisted store and take
 * effect on the next stop() + start.
 *
 * opts:
 *   workerId    (required) one runtime process = one workerId
 *   model       (required) hk3 | immersion
 *   storeDir    (required) persistent store directory
 *   kernelTopic    Kernel discovery topic (hex); omit to register by key
 *   bootstrap   DHT bootstrap override for hermetic tests
 *   conf        { thing: { alerts, container, ...intervals }, allowDuplicateIPs }
 *   seedDevices registerThing payloads applied once when the store is empty
 */
async function startAntspaceWorker (opts) {
  if (!opts || !opts.workerId) throw new Error('ERR_WORKER_ID_REQUIRED')
  if (!MODELS.includes(opts.model)) throw new Error(`ERR_MODEL_INVALID: ${opts.model}`)
  if (!opts.storeDir) throw new Error('ERR_STORE_DIR_REQUIRED')

  const deviceType = `container-as-${opts.model}`
  const conf = opts.conf || {}

  const infra = await createWorkerInfra({
    storeDir: opts.storeDir,
    deviceType,
    deviceTags: ['antspace'],
    specTags: ['container'],
    baseType: 'container',
    alertsLib,
    statsLib,
    thingConf: { allowDuplicateIPs: conf.allowDuplicateIPs, ...conf.thing },
    seedDevices: opts.seedDevices,
    writeActions: WRITE_ACTIONS,
    addlStats: ADDL_STATS
  })
  const { services, store, seeded, thingConf } = infra
  const { provisioning } = services

  const containerConf = thingConf.container || {}
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
        conf: containerConf,
        model: opts.model,
        type: deviceType
      }
    }))
  })
  infra.bindRuntime(runtime)

  await runtime.start()
  infra.startTimers()

  debug('antspace worker %s up: %d devices (type %s)', opts.workerId, provisioning.listDeviceIds().length, deviceType)

  return {
    runtime,
    services,
    store,
    seeded,
    stop: () => infra.stop({ runtime })
  }
}

module.exports = { startAntspaceWorker }
