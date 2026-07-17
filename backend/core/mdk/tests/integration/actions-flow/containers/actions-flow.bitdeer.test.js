'use strict'

const fs = require('fs')
const path = require('path')

const { startBitdeerWorker } = require('../../../../../../workers/containers/bitdeer')
const { createServer: createBitdeerMock } = require('../../../../../../workers/containers/bitdeer/mock/server')

const { ACTION_TYPES, runFixtureTests } = require('../actions-flow.helpers')

const BROKER_BASE_PORT = 58103
const CONTAINER_ID = 'C024_D40_E2E_001'

const makeActions = () => [
  { query: {}, action: ACTION_TYPES.SET_TANK_ENABLED, params: [{ tankIndex: 1, status: true }], voter: 'testing-agent', authPerms: ['container:w'] },
  { query: {}, action: ACTION_TYPES.SET_AIR_EXHAUST_ENABLED, params: [{ status: true }], voter: 'testing-agent', authPerms: ['container:w'] },
  { query: {}, action: ACTION_TYPES.RESET_ALARM, params: [{}], voter: 'testing-agent', authPerms: ['container:w'] },
  { query: {}, action: ACTION_TYPES.SET_TEMPERATURE_SETTINGS, params: [{ settings: { coldOil: 25, hotOil: 55 } }], voter: 'testing-agent', authPerms: ['container:w'], extraVoters: [{ voter: 'testing-agent-2', authPerms: ['container:w'] }] },
  { query: {}, action: ACTION_TYPES.SWITCH_CONTAINER, params: [true], voter: 'testing-agent', authPerms: ['container:w'] },
  { query: {}, action: ACTION_TYPES.SWITCH_SOCKET, params: [[['0', '0', true]]], voter: 'testing-agent', authPerms: ['container:w'] },
  { query: {}, action: ACTION_TYPES.SWITCH_COOLING_SYSTEM, params: [true], voter: 'testing-agent', authPerms: ['container:w'] }
]

// Runtime-hosted fixtures: startBitdeerWorker owns the MQTT broker the mock
// container publishes into, so the mock must start AFTER the worker
// (mockTiming 'after') and target the fixture's broker port.
const makeFixture = ({ name, model, mockType }, index) => {
  const workerId = `bitdeer-${model}-e2e`
  const brokerPort = BROKER_BASE_PORT + index
  return {
    name,
    workerId,
    actions: makeActions(),
    mockFactory: () => createBitdeerMock({ host: '127.0.0.1', port: brokerPort, type: mockType, id: CONTAINER_ID }),
    createWorker: async ({ root, kernel, bootstrap }) => {
      const storeDir = path.join(root, 'workers', workerId, 'store')
      fs.mkdirSync(storeDir, { recursive: true })

      const handle = await startBitdeerWorker({
        workerId,
        model,
        storeDir,
        bootstrap,
        mqttPort: brokerPort,
        seedDevices: [{
          info: { serialNum: 'BD-E2E-001', container: 'e2e-container' },
          opts: { containerId: CONTAINER_ID }
        }]
      })
      await kernel.registerWorker(handle.runtime.getPublicKey())

      const deviceId = handle.services.provisioning.listDevices({ limit: 10 })
        .find((d) => d.info?.serialNum === 'BD-E2E-001')?.id

      return { workerId, deviceId, stop: () => handle.stop() }
    }
  }
}

const fixtures = [
  { name: 'BD_D40_M56', model: 'm56', mockType: 'D40_M56' },
  { name: 'BD_D40_A1346', model: 'a1346', mockType: 'D40_A1346' },
  { name: 'BD_D40_M30', model: 'm30', mockType: 'D40_M30' },
  { name: 'BD_D40_S19XP', model: 's19xp', mockType: 'D40_S19XP' }
].map(makeFixture)

// mockTiming 'after': mock must start after the worker so the MQTT broker is already listening.
// preActionDelay: wait for the mock MQTT client to publish initial state into the broker
// so lastMessageCache is populated before actions run.
runFixtureTests(fixtures, { mockTiming: 'after', preActionDelay: 2500 })
