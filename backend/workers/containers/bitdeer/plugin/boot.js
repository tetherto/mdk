'use strict'

const net = require('net')
const tls = require('tls')
const { Aedes } = require('aedes')
const debug = require('debug')('mdk:worker:bitdeer:boot')
const WorkerRuntime = require('@tetherto/mdk-worker/lib/worker-runtime')
const { createWorkerInfra } = require('@tetherto/mdk-core/lib/worker-infra')
const { DEFAULT_MQTT_PORT } = require('../lib/utils/constants')
const { secureBroker, validateCredentials } = require('../lib/broker-auth')
const Bitdeer = require('../lib/bitdeer')
const alertsLib = require('../lib/templates/alerts')
const statsLib = require('../lib/templates/stats')
const plugin = require('.')

const MODELS = ['a1346', 'm30', 'm56', 's19xp']

const WRITE_ACTIONS = [
  ['switchContainer', 1],
  ['switchSocket', 1],
  ['switchCoolingSystem', 1],
  ['setTankEnabled', 1],
  ['setAirExhaustEnabled', 1],
  ['resetAlarm', 1],
  ['setTemperatureSettings', 2]
]

// Container stat cadences, mirroring the legacy ContainerManager
// scheduleAddlStatTfs crons (1m, 20s, rtd every 30s).
const ADDL_STATS = [
  ['1m', 60000],
  ['20s', 20000],
  ['rtd', 30000]
]

/**
 * Boots a bitdeer worker on the WorkerRuntime. This worker EMBEDS the MQTT
 * broker (aedes) the containers publish into — one broker per worker process,
 * started before the runtime and injected into every device config as
 * config.server. Device specs are keyed by containerId (no address/port).
 *
 * opts:
 *   workerId    (required) one runtime process = one workerId
 *   model       (required) a1346 | m30 | m56 | s19xp (the miner type inside the D40)
 *   storeDir    (required) persistent store directory
 *   mqttPort    broker port (default 10883)
 *   mqttHost    broker bind address (default 0.0.0.0)
 *   mqttCredentials  { [containerId]: { username, password } }; when set,
 *               every client must log in and is bound to that container
 *   mqttTls     tls.createServer options ({ key, cert, ... }); serves MQTTS
 *   kernelTopic    Kernel discovery topic (hex); omit to register by key
 *   bootstrap   DHT bootstrap list (a private network, or hermetic tests)
 *   dhtHost     interface the DHT node binds (e.g. 127.0.0.1)
 *   allowedKeys RPC caller keys the worker accepts (the Kernel's
 *               kernel.getClientPublicKey()); required unless allowAll
 *   allowAll    admit every RPC caller (development only)
 *   conf        { thing: { alerts, container, ...intervals } }
 *   seedDevices registerThing payloads applied once when the store is empty
 */
async function startBitdeerWorker (opts) {
  if (!opts || !opts.workerId) throw new Error('ERR_WORKER_ID_REQUIRED')
  if (!MODELS.includes(opts.model)) throw new Error(`ERR_MODEL_INVALID: ${opts.model}`)
  if (!opts.storeDir) throw new Error('ERR_STORE_DIR_REQUIRED')
  validateCredentials(opts.mqttCredentials)

  const deviceType = `container-bd-d40-${opts.model}`
  const conf = opts.conf || {}

  // One aedes instance per worker. svc-facs-mqtt kept a single module-level
  // aedes shared by every facility in the process: the first worker's stop()
  // closed it, silently killing every later worker's broker (clients never
  // get CONNACK and reconnect-loop forever, holding the event loop open).
  const aedes = await Aedes.createBroker()
  // Clients are confined to the containers registered below (filled once the
  // device list is built); see lib/broker-auth.js.
  const containerIds = new Set()
  secureBroker(aedes, {
    containerIds,
    credentials: opts.mqttCredentials,
    telemetryTopics: Bitdeer.TELEMETRY_TOPICS,
    commandTopics: Bitdeer.COMMAND_TOPICS
  })
  if (!opts.mqttCredentials) {
    debug('bitdeer worker %s: MQTT broker accepts anonymous clients; set mqttCredentials to require login', opts.workerId)
  }
  const server = opts.mqttTls
    ? tls.createServer(opts.mqttTls, aedes.handle)
    : net.createServer(aedes.handle)
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen({ host: opts.mqttHost || '0.0.0.0', port: opts.mqttPort || DEFAULT_MQTT_PORT }, resolve)
  })

  const infra = await createWorkerInfra({
    storeDir: opts.storeDir,
    deviceType,
    deviceTags: ['bitdeer'],
    specTags: ['container'],
    baseType: 'container',
    alertsLib,
    statsLib,
    thingConf: { ...conf.thing },
    seedDevices: opts.seedDevices,
    writeActions: WRITE_ACTIONS,
    addlStats: ADDL_STATS
  })
  const { services, store, seeded, thingConf } = infra
  const { provisioning } = services

  const containerConf = thingConf.container || {}
  const runtimeDevices = provisioning.buildRuntimeDevices()
  for (const dev of runtimeDevices) {
    if (dev.config.containerId) containerIds.add(dev.config.containerId)
  }
  const runtime = new WorkerRuntime(plugin, {
    workerId: opts.workerId,
    kernelTopic: opts.kernelTopic || null,
    bootstrap: opts.bootstrap || null,
    dhtHost: opts.dhtHost || null,
    allowedKeys: opts.allowedKeys || [],
    allowAll: opts.allowAll === true,
    store,
    services,
    allowEmptyDevices: true,
    devices: runtimeDevices.map((dev) => ({
      deviceId: dev.deviceId,
      config: {
        ...dev.config,
        conf: containerConf,
        server: aedes,
        model: opts.model,
        type: opts.model
      }
    }))
  })
  infra.bindRuntime(runtime)

  await runtime.start()
  infra.startTimers()

  debug('bitdeer worker %s up: %d devices (type %s, broker :%d)', opts.workerId, provisioning.listDeviceIds().length, deviceType, opts.mqttPort || DEFAULT_MQTT_PORT)

  return {
    runtime,
    services,
    store,
    seeded,
    mqtt: { aedes, server },
    stop: async () => {
      await infra.stop({ runtime })
      await new Promise((resolve) => aedes.close(() => resolve()))
      await new Promise((resolve) => server.close(() => resolve()))
    }
  }
}

module.exports = { startBitdeerWorker }
