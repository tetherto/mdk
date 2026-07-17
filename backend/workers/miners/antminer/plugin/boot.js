'use strict'

const debug = require('debug')('mdk:worker:antminer:boot')
const WorkerRuntime = require('../../../../core/mdk-worker/lib/worker-runtime')
const { createWorkerInfra } = require('../../../../core/mdk/lib/worker-infra')
const alertsLib = require('../lib/templates/alerts')
const statsLib = require('../lib/templates/stats')
const plugin = require('.')

const MODELS = ['s19xp', 's19xp_h', 's21', 's21pro']

const WRITE_ACTIONS = [
  ['reboot', 1],
  ['setPowerMode', 1],
  ['setLED', 1],
  ['setupPools', 1],
  ['registerThing', 1],
  ['updateThing', 1],
  ['forgetThings', 1]
]

/**
 * Boots an antminer worker on the WorkerRuntime. Same lifecycle model as the
 * whatsminer boot: provisioning commands mutate the persisted store and take
 * effect on the next stop() + start.
 *
 * opts:
 *   workerId    (required) one runtime process = one workerId
 *   model       (required) s19xp | s19xp_h | s21 | s21pro
 *   storeDir    (required) persistent store directory
 *   kernelTopic    Kernel discovery topic (hex); omit to register by key
 *   bootstrap   DHT bootstrap override for hermetic tests
 *   conf        { thing: { alerts, miner, ...intervals }, pools, allowDuplicateIPs }
 *   seedDevices registerThing payloads applied once when the store is empty
 */
async function startAntminerWorker (opts) {
  if (!opts || !opts.workerId) throw new Error('ERR_WORKER_ID_REQUIRED')
  if (!MODELS.includes(opts.model)) throw new Error(`ERR_MODEL_INVALID: ${opts.model}`)
  if (!opts.storeDir) throw new Error('ERR_STORE_DIR_REQUIRED')

  const deviceType = `miner-am-${opts.model}`
  const conf = opts.conf || {}

  const infra = await createWorkerInfra({
    storeDir: opts.storeDir,
    deviceType,
    deviceTags: ['antminer'],
    specTags: ['miner'],
    baseType: 'miner',
    alertsLib,
    statsLib,
    thingConf: { allowDuplicateIPs: conf.allowDuplicateIPs, ...conf.thing },
    provisioningConf: { pools: conf.pools },
    seedDevices: opts.seedDevices,
    writeActions: WRITE_ACTIONS
  })
  const { services, store, seeded, thingConf } = infra
  const { provisioning } = services

  const minerConf = thingConf.miner || {}
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
        conf: minerConf,
        type: deviceType
      }
    }))
  })
  infra.bindRuntime(runtime)

  await runtime.start()
  infra.startTimers()

  debug('antminer worker %s up: %d devices (type %s)', opts.workerId, provisioning.listDeviceIds().length, deviceType)

  return {
    runtime,
    services,
    store,
    seeded,
    stop: () => infra.stop({ runtime })
  }
}

module.exports = { startAntminerWorker }
