'use strict'

const fs = require('fs')
const path = require('path')

const { startAntspaceWorker } = require('../../../../../../workers/containers/antspace')

const { ACTION_TYPES, runFixtureTests } = require('../actions-flow.helpers')

const makeActions = () => [
  { query: {}, action: ACTION_TYPES.SWITCH_CONTAINER, params: [true], voter: 'testing-agent', authPerms: ['container:w'] },
  { query: {}, action: ACTION_TYPES.SWITCH_SOCKET, params: [[['0', '0', true]]], voter: 'testing-agent', authPerms: ['container:w'] },
  { query: {}, action: ACTION_TYPES.SWITCH_COOLING_SYSTEM, params: [true], voter: 'testing-agent', authPerms: ['container:w'] },
  { query: {}, action: ACTION_TYPES.RESET_COOLING_SYSTEM, params: [], voter: 'testing-agent', authPerms: ['container:w'], extraVoters: [{ voter: 'testing-agent-2', authPerms: ['container:w'] }] },
  { query: {}, action: ACTION_TYPES.SET_LIQUID_SUPPLY_TEMPERATURE, params: [{ temperature: 36 }], voter: 'testing-agent', authPerms: ['container:w'], extraVoters: [{ voter: 'testing-agent-2', authPerms: ['container:w'] }] }
]

// Runtime-hosted fixtures: startAntspaceWorker (plugin + services +
// WorkerRuntime) replaces startWorker(managerClass); the seeded device
// config replaces manager.registerThing.
const makeFixture = (model) => {
  const workerId = `antspace-${model}-e2e`
  return {
    name: model === 'hk3' ? 'AS_HK3' : 'AS_IMM',
    workerId,
    actions: makeActions(),
    createWorker: async ({ root, kernel, bootstrap }) => {
      const storeDir = path.join(root, 'workers', workerId, 'store')
      fs.mkdirSync(storeDir, { recursive: true })

      const handle = await startAntspaceWorker({
        workerId,
        model,
        storeDir,
        bootstrap,
        seedDevices: [{
          info: { serialNum: 'AS-E2E-001', container: 'e2e-container' },
          opts: { address: '127.0.0.1', port: 58004 }
        }]
      })
      await kernel.registerWorker(handle.runtime.getPublicKey())

      const deviceId = handle.services.provisioning.listDevices({ limit: 10 })
        .find((d) => d.info?.serialNum === 'AS-E2E-001')?.id

      return { workerId, deviceId, stop: () => handle.stop() }
    }
  }
}

const fixtures = [
  makeFixture('hk3'),
  makeFixture('immersion')
]

runFixtureTests(fixtures)
