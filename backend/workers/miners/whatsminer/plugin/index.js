'use strict'

const debug = require('debug')('mdk:worker:whatsminer')
const TcpFacility = require('@tetherto/svc-facs-tcp')
const WhatsminerApiV2Client = require('../lib/whatsminer-api-v2-client')
const WhatsminerApiV3Client = require('../lib/whatsminer-api-v3-client')
const { ApiHandlerFactory, API_VERSIONS } = require('../lib/protocols')
const { DEFAULT_NOMINAL_EFFICIENCY_WTHS } = require('../lib/utils/constants')

// getRPC is stateless — one facility serves every device context.
const tcpFac = new TcpFacility({}, {}, {})

// Worker Plugin: contract + connect/disconnect. The WorkerRuntime builds one
// context per device from connect() and dispatches contract handlers against
// it. connect() performs one cheap read probe by default so unreachable miners
// are held offline by WorkerRuntime instead of failing every telemetry pull.
module.exports = {
  contract: require('./mdk-contract.json'),
  dir: __dirname,

  connect: async (config, { deviceId }) => {
    if (!config.address || !config.password) {
      throw new Error('ERR_DEVICE_CONFIG_INVALID')
    }
    if (config.apiVersion && !ApiHandlerFactory.isVersionSupported(config.apiVersion)) {
      throw new Error(`ERR_UNSUPPORTED_API_VERSION: ${config.apiVersion}`)
    }

    const type = config.type || 'miner-wm'
    const createDevice = ({ port, apiVersion }) => {
      const opts = {
        ...config,
        port,
        apiVersion,
        conf: config.conf || {},
        id: deviceId,
        nominalEfficiencyWThs: config.nominalEfficiencyWThs || DEFAULT_NOMINAL_EFFICIENCY_WTHS[type] || 0,
        type
      }
      const device = ApiHandlerFactory.getMajorVersion(apiVersion) === 3
        ? new WhatsminerApiV3Client(opts)
        : new WhatsminerApiV2Client({
          ...opts,
          socketer: {
            readStrategy: TcpFacility.TCP_READ_STRATEGY.ON_END,
            rpc: (opts) => tcpFac.getRPC(opts)
          }
        })

      device.on('error', (e) => {
        debug('device %s error: %s', deviceId, e.message)
      })
      return device
    }

    if (config.probe === false) {
      const apiVersion = config.apiVersion ||
        (config.port === 4028 ? API_VERSIONS.V2 : config.port === 4433 || !config.port ? API_VERSIONS.V3 : undefined)
      if (!apiVersion) throw new Error('ERR_API_VERSION_REQUIRED_FOR_CUSTOM_PORT')
      const port = config.port || ApiHandlerFactory.getDefaultPort(apiVersion)
      return createDevice({ port, apiVersion })
    }

    let candidates
    if (config.apiVersion) {
      candidates = [{
        port: config.port || ApiHandlerFactory.getDefaultPort(config.apiVersion),
        apiVersion: config.apiVersion
      }]
    } else if (!config.port) {
      candidates = [
        { port: 4433, apiVersion: API_VERSIONS.V3 },
        { port: 4028, apiVersion: API_VERSIONS.V2 }
      ]
    } else if (config.port === 4433) {
      candidates = [{ port: config.port, apiVersion: API_VERSIONS.V3 }]
    } else if (config.port === 4028) {
      candidates = [{ port: config.port, apiVersion: API_VERSIONS.V2 }]
    } else {
      candidates = [
        { port: config.port, apiVersion: API_VERSIONS.V3 },
        { port: config.port, apiVersion: API_VERSIONS.V2 }
      ]
    }

    let lastError
    for (const candidate of candidates) {
      const device = createDevice(candidate)
      try {
        await device.getVersion()
        return device
      } catch (error) {
        lastError = error
        debug('device %s API %s probe on port %d failed: %s',
          deviceId, candidate.apiVersion, candidate.port, error.message)
        await device.close().catch(() => {})
      }
    }

    throw lastError
  },

  disconnect: async (device) => {
    await device.close()
  }
}
