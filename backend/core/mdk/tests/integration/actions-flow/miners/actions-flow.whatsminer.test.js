'use strict'

const fs = require('fs')
const path = require('path')

const { startWhatsminerWorker } = require('../../../../../../workers/miners/whatsminer')

const { ACTION_TYPES, runFixtureTests } = require('../actions-flow.helpers')

const makeActions = () => [
  { query: {}, action: ACTION_TYPES.REBOOT, params: [{}], voter: 'testing-agent', authPerms: ['miner:w'] },
  {
    query: {},
    action: ACTION_TYPES.SET_POWER_MODE,
    params: ['low'],
    voter: 'testing-agent',
    authPerms: ['miner:w']
  },
  { query: {}, action: ACTION_TYPES.SET_LED, params: [true], voter: 'testing-agent', authPerms: ['miner:w'] },
  { query: {}, action: ACTION_TYPES.SET_POWER_PCT, params: [{ pct: 80 }], voter: 'testing-agent', authPerms: ['miner:w'] },
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
    params: [{ workerId, id: deviceId, info: { location: 'Row-A Slot-1' } }],
    voter: 'testing-agent',
    authPerms: ['miner:w']
  }),
  (workerId) => ({
    query: {},
    action: ACTION_TYPES.REGISTER_THING,
    params: [{ workerId, info: { serialNum: 'WM-E2E-002', container: 'e2e-site' }, opts: { address: '127.0.0.2', port: 4028, password: 'admin' } }],
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

const makeM63Actions = () => {
  const actions = makeActions()
  return [
    ...actions.slice(0, -2),
    {
      query: {},
      action: ACTION_TYPES.SETUP_FREQUENCY_SPEED,
      params: [10],
      voter: 'testing-agent',
      authPerms: ['miner:w'],
      extraVoters: [{ voter: 'testing-agent-2', authPerms: ['miner:w'] }]
    },
    ...actions.slice(-2)
  ]
}

// Runtime-hosted fixture: startWhatsminerWorker (plugin + services +
// WorkerRuntime) replaces startWorker(managerClass); the seeded device
// config replaces manager.registerThing.
const makeFixture = ({ name, model, actions }) => {
  const workerId = `whatsminer-${model}-e2e`
  return {
    name,
    workerId,
    actions,
    createWorker: async ({ root, kernel, bootstrap }) => {
      const storeDir = path.join(root, 'workers', workerId, 'store')
      fs.mkdirSync(storeDir, { recursive: true })

      const handle = await startWhatsminerWorker({
        workerId,
        model,
        storeDir,
        bootstrap,
        seedDevices: [{
          info: { serialNum: 'WM-E2E-001', container: 'e2e-site' },
          opts: { address: '127.0.0.1', port: 58000, password: 'admin' }
        }]
      })
      await kernel.registerWorker(handle.runtime.getPublicKey())

      const deviceId = handle.services.provisioning.listDevices({ limit: 10 })
        .find((d) => d.info?.serialNum === 'WM-E2E-001')?.id

      return { workerId, deviceId, stop: () => handle.stop() }
    }
  }
}

const fixtures = [
  makeFixture({ name: 'WM_M56S', model: 'm56s', actions: makeActions() }),
  makeFixture({ name: 'WM_M30SP', model: 'm30sp', actions: makeActions() }),
  makeFixture({ name: 'WM_M30SPP', model: 'm30spp', actions: makeActions() }),
  makeFixture({ name: 'WM_M53S', model: 'm53s', actions: makeActions() }),
  makeFixture({ name: 'WM_M63', model: 'm63', actions: makeM63Actions() })
]

runFixtureTests(fixtures)
