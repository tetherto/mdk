'use strict'

const test = require('brittle')
const { execFileSync } = require('node:child_process')
const path = require('node:path')

const exampleDir = path.join(__dirname, '..', '..')

// Seed local config from the *.example files first (no-op when it already exists).
execFileSync('node', [path.join(exampleDir, 'deploy', 'setup-config.js')])

const command = require('../../backend/gateway-plugins/site/controllers/command')
const overview = require('../../backend/gateway-plugins/site/controllers/overview')

const commandCtx = (result) => ({ mdkClient: { sendCommand: async () => result } })
const commandReq = (deviceId) => ({ params: { deviceId }, body: { mode: 'low' } })

test('command controller - returns a queued command', async (t) => {
  const res = await command(commandReq('WM-001'), commandCtx({ commandId: 'cmd-1', status: 'QUEUED' }))
  t.is(res.status, 'QUEUED')
  t.is(res.commandId, 'cmd-1')
})

test('command controller - an unknown device answers 404 with the Kernel error', async (t) => {
  try {
    await command(commandReq('NOPE-1'), commandCtx({ status: 'REJECTED', error: 'ERR_DEVICE_NOT_FOUND' }))
    t.fail('expected a rejection')
  } catch (err) {
    t.is(err.message, 'ERR_DEVICE_NOT_FOUND')
    t.is(err.statusCode, 404)
  }
})

test('command controller - other refusals answer 422 with the Kernel error', async (t) => {
  try {
    await command(commandReq('WM-001'), commandCtx({ status: 'REJECTED', error: 'ERR_WORKER_NOT_ROUTABLE' }))
    t.fail('expected a rejection')
  } catch (err) {
    t.is(err.message, 'ERR_WORKER_NOT_ROUTABLE')
    t.is(err.statusCode, 422)
  }
})

test('command controller - a refusal with no error code still fails', async (t) => {
  await t.exception(command(commandReq('WM-001'), commandCtx({ status: 'REJECTED' })), /ERR_COMMAND_REJECTED/)
})

test('overview - a dead Worker is reported in unavailableWorkers, not silently dropped', async (t) => {
  const mdkClient = {
    listWorkers: async () => ({
      workers: [
        { workerId: 'whatsminer-worker', healthState: 'DEAD', deviceIds: ['WM-001'] },
        { workerId: 'old-worker', state: 'TERMINATED', deviceIds: [] }
      ]
    })
  }
  const res = await overview({}, { mdkClient })

  t.alike(res.miners, [], 'no miners can be read')
  t.alike(res.unavailableWorkers, [
    { workerId: 'old-worker', reason: 'TERMINATED' },
    { workerId: 'whatsminer-worker', reason: 'DEAD' }
  ], 'both Workers are reported with their state')
})

test('overview - a contract Worker that does not answer is reported', async (t) => {
  const mdkClient = {
    listWorkers: async () => ({ workers: [{ workerId: 'vendor-worker', deviceIds: ['V-1'] }] }),
    // No worker-infra config: the Worker is classified by its contract, and that call fails.
    pullTelemetry: async () => ({}),
    getCapabilities: async () => { throw Object.assign(new Error('ERR_WORKER_UNAVAILABLE: channel closed'), { code: 'ERR_WORKER_UNAVAILABLE' }) }
  }
  const res = await overview({}, { mdkClient })

  t.alike(res.miners, [])
  t.alike(res.unavailableWorkers, [{ workerId: 'vendor-worker', reason: 'ERR_WORKER_UNAVAILABLE' }])
})

test('overview - a healthy site reports no unavailable Workers', async (t) => {
  const mdkClient = { listWorkers: async () => ({ workers: [] }) }
  const res = await overview({}, { mdkClient })
  t.alike(res.unavailableWorkers, [])
})
