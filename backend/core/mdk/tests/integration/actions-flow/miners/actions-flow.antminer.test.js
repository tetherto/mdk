'use strict'

const fs = require('fs')
const path = require('path')

const { startAntminerWorker } = require('../../../../../../workers/miners/antminer')
const { createServer: createAntminerMock } = require('../../../../../../workers/miners/antminer/mock/server')

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
    params: [{ workerId, id: deviceId, info: { location: 'Row-C Slot-3' } }],
    voter: 'testing-agent',
    authPerms: ['miner:w']
  }),
  (workerId) => ({
    query: {},
    action: ACTION_TYPES.REGISTER_THING,
    params: [{ workerId, info: { serialNum: 'AM-E2E-002', container: 'e2e-site' }, opts: { address: '127.0.0.2', port: 4028, username: 'root', password: 'root' } }],
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

// Runtime-hosted fixture: startAntminerWorker (plugin + services +
// WorkerRuntime) replaces startWorker(managerClass); the seeded device
// config replaces manager.registerThing.
const makeFixture = ({ name, model }) => {
  const workerId = `antminer-${model}-e2e`
  return {
    name,
    workerId,
    actions: makeActions(),
    mockFactory: () => createAntminerMock({ host: '127.0.0.1', port: 58002, type: model, password: 'root' }),
    createWorker: async ({ root, kernel, bootstrap }) => {
      const storeDir = path.join(root, 'workers', workerId, 'store')
      fs.mkdirSync(storeDir, { recursive: true })

      const handle = await startAntminerWorker({
        workerId,
        model,
        storeDir,
        bootstrap,
        seedDevices: [{
          info: { serialNum: 'AM-E2E-001', container: 'e2e-site' },
          opts: { address: '127.0.0.1', port: 58002, username: 'root', password: 'root' }
        }]
      })
      await kernel.registerWorker(handle.runtime.getPublicKey())

      const deviceId = handle.services.provisioning.listDevices({ limit: 10 })
        .find((d) => d.info?.serialNum === 'AM-E2E-001')?.id

      return { workerId, deviceId, stop: () => handle.stop() }
    }
  }
}

const fixtures = [
  makeFixture({ name: 'AM_S19XP', model: 's19xp' }),
  makeFixture({ name: 'AM_S19XPH', model: 's19xp_h' }),
  makeFixture({ name: 'AM_S21', model: 's21' }),
  makeFixture({ name: 'AM_S21PRO', model: 's21pro' })
]

runFixtureTests(fixtures)
