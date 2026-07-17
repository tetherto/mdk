'use strict'

const debug = require('debug')('mdk:worker:whatsminer:boot')
const WorkerRuntime = require('../../../../core/mdk-worker/lib/worker-runtime')
const { createWorkerInfra } = require('../../../../core/mdk/lib/worker-infra')
const alertsLib = require('../lib/templates/alerts')
const statsLib = require('../lib/templates/stats')
const plugin = require('.')

const MODELS = ['m30sp', 'm30spp', 'm53s', 'm56s', 'm63']

const WRITE_ACTIONS = [
  ['reboot', 1],
  ['setPowerMode', 1],
  ['setLED', 1],
  ['setupPools', 1],
  ['setPowerPct', 1],
  ['registerThing', 1],
  ['updateThing', 1],
  ['forgetThings', 1]
]

/**
 * Boots a whatsminer worker on the WorkerRuntime: store → provisioning →
 * services → runtime. The runtime's device list is built from the persisted
 * provisioning store; registerThing/updateThing/forgetThings only mutate that
 * store, so device-set changes require stop() + startWhatsminerWorker again
 * (the supervisor's restart).
 *
 * opts:
 *   workerId    (required) one runtime process = one workerId
 *   model       (required) m30sp | m30spp | m53s | m56s | m63
 *   storeDir    (required) persistent store directory
 *   kernelTopic    Kernel discovery topic (hex); omit to register by key
 *   bootstrap   DHT bootstrap override for hermetic tests
 *   conf        { thing: { alerts, miner, ...intervals }, pools, allowDuplicateIPs }
 *   seedDevices registerThing payloads applied once when the store is empty
 */
async function startWhatsminerWorker (opts) {
  if (!opts || !opts.workerId) throw new Error('ERR_WORKER_ID_REQUIRED')
  if (!MODELS.includes(opts.model)) throw new Error(`ERR_MODEL_INVALID: ${opts.model}`)
  if (!opts.storeDir) throw new Error('ERR_STORE_DIR_REQUIRED')

  const deviceType = `miner-wm-${opts.model}`
  const conf = opts.conf || {}

  // M63 is the only model with extra spec tags and write actions, mirroring
  // its legacy type manager (getSpecTags + setUpfreqSpeed whitelist).
  const specTags = opts.model === 'm63' ? ['miner', deviceType] : ['miner']
  const writeActions = opts.model === 'm63'
    ? [...WRITE_ACTIONS, ['setUpfreqSpeed', 2]]
    : WRITE_ACTIONS

  const infra = await createWorkerInfra({
    storeDir: opts.storeDir,
    deviceType,
    deviceTags: ['whatsminer'],
    specTags,
    baseType: 'miner',
    alertsLib,
    statsLib,
    thingConf: { allowDuplicateIPs: conf.allowDuplicateIPs, ...conf.thing },
    provisioningConf: { pools: conf.pools },
    seedDevices: opts.seedDevices,
    writeActions
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
    // fresh store: boot empty, take registerThing writes, restart with them
    allowEmptyDevices: true,
    devices: provisioning.buildRuntimeDevices().map((dev) => ({
      deviceId: dev.deviceId,
      config: {
        ...dev.config,
        conf: minerConf,
        nominalEfficiencyWThs: minerConf.nominalEfficiencyWThs?.[deviceType]
      }
    }))
  })
  infra.bindRuntime(runtime)

  await runtime.start()
  infra.startTimers()

  debug('whatsminer worker %s up: %d devices (type %s)', opts.workerId, provisioning.listDeviceIds().length, deviceType)

  return {
    runtime,
    services,
    store,
    seeded,
    stop: () => infra.stop({ runtime })
  }
}

module.exports = { startWhatsminerWorker }
