'use strict'

const fs = require('fs')
const path = require('path')

const { startAvalonWorker } = require('../../../../../../workers/miners/avalon')

const { ACTION_TYPES, runFixtureTests } = require('../actions-flow.helpers')

const makeActions = () => [
  { query: {}, action: ACTION_TYPES.REBOOT, params: [{}], voter: 'testing-agent', authPerms: ['miner:w'] },
  { query: {}, action: ACTION_TYPES.SET_POWER_MODE, params: ['normal'], voter: 'testing-agent', authPerms: ['miner:w'] },
  { query: {}, action: ACTION_TYPES.SET_LED, params: [true], voter: 'testing-agent', authPerms: ['miner:w'] },
  {
    query: {},
    action: ACTION_TYPES.SETUP_POOLS,
    params: [{ pools: [{ url: 'stratum+tcp://pool.example.com:3333', user: 'worker1', pass: 'x' }] }],
    voter: 'testing-agent',
    authPerms: ['miner:w']
  },
  (workerId, deviceId) => ({
    query: {},
    action: ACTION_TYPES.UPDATE_THING,
    params: [{ workerId, id: deviceId, info: { location: 'Row-B Slot-2' } }],
    voter: 'testing-agent',
    authPerms: ['miner:w']
  }),
  (workerId) => ({
    query: {},
    action: ACTION_TYPES.REGISTER_THING,
    params: [{ workerId, info: { serialNum: 'AV-E2E-002', container: 'e2e-site' }, opts: { address: '127.0.0.2', port: 4028, password: 'admin' } }],
    voter: 'testing-agent',
    authPerms: ['miner:w']
  }),
  (workerId, deviceId) => ({
    query: {},
    action: ACTION_TYPES.FORGET_THINGS,
    params: [{ workerId, query: { id: deviceId } }],
    voter: 'testing-agent',
    authPerms: ['miner:w']
  })
]

// Runtime-hosted fixture: startAvalonWorker (plugin + services +
// WorkerRuntime) replaces startWorker(managerClass); the seeded device
// config replaces manager.registerThing.
const fixtures = [
  {
    name: 'AV_A1346',
    workerId: 'avalon-a1346-e2e',
    actions: makeActions(),
    createWorker: async ({ root, kernel, bootstrap }) => {
      const workerId = 'avalon-a1346-e2e'
      const storeDir = path.join(root, 'workers', workerId, 'store')
      fs.mkdirSync(storeDir, { recursive: true })

      const handle = await startAvalonWorker({
        workerId,
        model: 'a1346',
        storeDir,
        bootstrap,
        seedDevices: [{
          info: { serialNum: 'AV-E2E-001', container: 'e2e-site' },
          opts: { address: '127.0.0.1', port: 58001, password: 'admin' }
        }]
      })
      await kernel.registerWorker(handle.runtime.getPublicKey())

      const deviceId = handle.services.provisioning.listDevices({ limit: 10 })
        .find((d) => d.info?.serialNum === 'AV-E2E-001')?.id

      return { workerId, deviceId, stop: () => handle.stop() }
    }
  }
]

runFixtureTests(fixtures)
