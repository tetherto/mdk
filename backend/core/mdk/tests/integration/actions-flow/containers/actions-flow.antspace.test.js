'use strict'

const fs = require('fs')
const path = require('path')

const { startAntspaceWorker } = require('../../../../../../workers/containers/antspace')

const { ACTION_TYPES, runFixtureTests, verifyProvisioned } = require('../actions-flow.helpers')

const PROVISIONED_ID = 'AS-E2E-PROV'
// Routable, non-loopback: the remote address policy refuses 127.0.0.1.
const PROVISIONED_OPTS = { address: '10.0.0.5', port: 58005 }

const makeActions = () => [
  { query: {}, action: ACTION_TYPES.SWITCH_CONTAINER, params: [true], voter: 'testing-agent' },
  { query: {}, action: ACTION_TYPES.SWITCH_SOCKET, params: [[['0', '0', true]]], voter: 'testing-agent' },
  { query: {}, action: ACTION_TYPES.SWITCH_COOLING_SYSTEM, params: [true], voter: 'testing-agent' },
  { query: {}, action: ACTION_TYPES.RESET_COOLING_SYSTEM, params: [], voter: 'testing-agent', extraVoters: [{ voter: 'testing-agent-2' }] },
  { query: {}, action: ACTION_TYPES.SET_LIQUID_SUPPLY_TEMPERATURE, params: [{ temperature: 36 }], voter: 'testing-agent', extraVoters: [{ voter: 'testing-agent-2' }] },
  // Provisioning through the Kernel: rack actions addressed by params[0].workerId,
  // persisted to the Worker's store (picked up on restart, no hot-add).
  (workerId) => ({
    query: {},
    action: ACTION_TYPES.REGISTER_THING,
    params: [{ workerId: 'not-this-worker', id: PROVISIONED_ID, info: { serialNum: PROVISIONED_ID }, opts: PROVISIONED_OPTS }],
    voter: 'testing-agent',
    expectNoTarget: true
  }),
  (workerId) => ({
    query: {},
    action: ACTION_TYPES.REGISTER_THING,
    params: [{ workerId, id: PROVISIONED_ID, info: { serialNum: PROVISIONED_ID, container: 'e2e-container-2' }, opts: PROVISIONED_OPTS }],
    voter: 'testing-agent',
    verify: verifyProvisioned(PROVISIONED_ID, (dev) => dev.info.container === 'e2e-container-2' && dev.opts.address === PROVISIONED_OPTS.address)
  }),
  (workerId) => ({
    query: {},
    action: ACTION_TYPES.UPDATE_THING,
    params: [{ workerId, id: PROVISIONED_ID, info: { serialNum: PROVISIONED_ID, container: 'e2e-container-3' }, opts: PROVISIONED_OPTS }],
    voter: 'testing-agent',
    verify: verifyProvisioned(PROVISIONED_ID, (dev) => dev.info.container === 'e2e-container-3')
  }),
  (workerId) => ({
    query: {},
    action: ACTION_TYPES.FORGET_THINGS,
    params: [{ workerId, query: { id: PROVISIONED_ID } }],
    voter: 'testing-agent',
    verify: verifyProvisioned(PROVISIONED_ID, null)
  })
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
    createWorker: async ({ root, kernel, bootstrap, dhtHost }) => {
      const storeDir = path.join(root, 'workers', workerId, 'store')
      fs.mkdirSync(storeDir, { recursive: true })

      const handle = await startAntspaceWorker({
        workerId,
        model,
        storeDir,
        bootstrap,
        dhtHost,
        allowedKeys: [kernel.getClientPublicKey()],
        seedDevices: [{
          info: { serialNum: 'AS-E2E-001', container: 'e2e-container' },
          opts: { address: '127.0.0.1', port: 58004 }
        }]
      })
      await kernel.registerWorker(handle.runtime.getPublicKey())

      const deviceId = handle.services.provisioning.listDevices({ limit: 10 })
        .find((d) => d.info?.serialNum === 'AS-E2E-001')?.id

      return { workerId, deviceId, handle, stop: () => handle.stop() }
    }
  }
}

const fixtures = [
  makeFixture('hk3'),
  makeFixture('immersion')
]

runFixtureTests(fixtures)
