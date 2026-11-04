'use strict'

const test = require('brittle')
const { execFileSync } = require('node:child_process')
const path = require('node:path')

const exampleDir = path.join(__dirname, '..', '..')

// The controller reads config/site.deploy.json at load — seed local config
// from the *.example files first (no-op when it already exists).
execFileSync('node', [path.join(exampleDir, 'deploy', 'setup-config.js')])

const controller = require('../../backend/gateway-plugins/site/controllers/pools')
const deploy = require('../../config/site.deploy.json')

function makeServices (result = { commandId: 'cmd-1', status: 'PENDING' }) {
  const calls = []
  return {
    calls,
    services: {
      mdkClient: {
        sendCommand: async (deviceId, command, params) => {
          calls.push({ deviceId, command, params })
          return result
        }
      }
    }
  }
}

test('pools controller - requires mdkClient', async (t) => {
  await t.exception(controller({ params: { deviceId: 'd1' } }, {}), /ERR_MDK_CLIENT_UNAVAILABLE/)
})

test('pools controller - requires deviceId', async (t) => {
  const { services } = makeServices()
  await t.exception(controller({ params: {} }, services), /ERR_DEVICE_ID_REQUIRED/)
})

test('pools controller - rejects pool without worker_name', async (t) => {
  const { services } = makeServices()
  const req = { params: { deviceId: 'd1' }, body: { pools: [{ url: 'stratum+tcp://p:1' }] } }
  await t.exception(controller(req, services), /ERR_INVALID_POOLS/)
})

test('pools controller - rejects more than 3 pools', async (t) => {
  const { services } = makeServices()
  const pool = { url: 'stratum+tcp://p:1', worker_name: 'w' }
  const req = { params: { deviceId: 'd1' }, body: { pools: [pool, pool, pool, pool] } }
  await t.exception(controller(req, services), /ERR_INVALID_POOLS/)
})

test('pools controller - dispatches body pools', async (t) => {
  const { services, calls } = makeServices()
  const pools = [{ url: 'stratum+tcp://p:1', worker_name: 'acct.w', worker_password: 'x' }]
  const res = await controller({ params: { deviceId: 'd1' }, body: { pools } }, services)

  t.is(calls.length, 1)
  t.is(calls[0].deviceId, 'd1')
  t.is(calls[0].command, 'setupPools')
  t.alike(calls[0].params, { pools })
  t.alike(res.pools, ['stratum+tcp://p:1'])
  t.is(res.status, 'PENDING')
})

test('pools controller - falls back to config worker.pools', async (t) => {
  const { services, calls } = makeServices()
  const res = await controller({ params: { deviceId: 'd1' }, body: {} }, services)

  t.alike(calls[0].params.pools, deploy.worker.pools)
  t.alike(res.pools, deploy.worker.pools.map((p) => p.url))
})

test('pools controller - a rejected command answers 404 with the Kernel error', async (t) => {
  const { services } = makeServices({ status: 'REJECTED', error: 'ERR_DEVICE_NOT_FOUND' })
  const pools = [{ url: 'stratum+tcp://p:1', worker_name: 'w' }]
  try {
    await controller({ params: { deviceId: 'nope' }, body: { pools } }, services)
    t.fail('expected a rejection')
  } catch (err) {
    t.is(err.message, 'ERR_DEVICE_NOT_FOUND')
    t.is(err.statusCode, 404)
  }
})

test('pools controller - passes appendId false through', async (t) => {
  const { services, calls } = makeServices()
  const pools = [{ url: 'stratum+tcp://p:1', worker_name: 'w' }]
  await controller({ params: { deviceId: 'd1' }, body: { pools, appendId: false } }, services)

  t.is(calls[0].params.appendId, false)
})
