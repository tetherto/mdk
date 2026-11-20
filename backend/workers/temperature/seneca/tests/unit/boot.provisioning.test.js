'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { test } = require('brittle')
const { startSenecaWorker } = require('../../plugin/boot')

const WORKER_ID = 'seneca-provisioning'
const DEVICE_ID = 'SENECA-002'
// Routable, non-loopback: the remote address policy refuses 127.0.0.1.
const ADDRESS = '10.0.0.7'

// Envelopes as the Kernel sends them: ActionCaller.getWriteCalls sets
// rackActionId for the provisioning actions, and callTargets dispatches the
// approved action as a Worker-scoped command.request (deviceId null).
let seq = 0
const envelope = (action, payload) => ({
  id: `env-${++seq}`,
  version: '0.2.0',
  type: 'request',
  action,
  sender: 'kernel:test',
  target: WORKER_ID,
  deviceId: null,
  timestamp: Date.now(),
  payload
})
const writeCalls = (handle, action, params, rackActionId = null) =>
  handle.runtime.handleRequest(envelope('write.calls.request', { query: {}, action, params, rackActionId }))
const command = (handle, cmd, params) =>
  handle.runtime.handleRequest(envelope('command.request', {
    commandId: `cmd-${seq}`, command: cmd, params, scope: 'worker', workerId: WORKER_ID, requesterId: 'kernel:test'
  }))

// Provisioning-first bootstrap: an empty store and no seedDevices. bootstrap []
// keeps the DHT node off the public network; allowAll because no Kernel key exists here.
async function bootWorker (t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'seneca-provisioning-'))
  const storeDir = path.join(root, 'store')
  fs.mkdirSync(storeDir)
  const handle = await startSenecaWorker({
    workerId: WORKER_ID, storeDir, bootstrap: [], dhtHost: '127.0.0.1', allowAll: true
  })
  t.teardown(async () => {
    await handle.stop()
    fs.rmSync(root, { recursive: true, force: true })
  })
  return handle
}

const thing = (pos, address = ADDRESS) => ({
  workerId: WORKER_ID, id: DEVICE_ID, info: { serialNum: DEVICE_ID, pos }, opts: { address, port: 502, unitId: 1, register: 3 }
})

test('write.calls.request resolves one rack call for each provisioning action', async (t) => {
  const handle = await bootWorker(t)
  t.is(handle.services.provisioning.listDeviceIds().length, 0, 'boots with zero devices')

  const cases = [
    ['registerThing', [thing('rack-1')], DEVICE_ID],
    ['updateThing', [thing('rack-2')], DEVICE_ID],
    ['forgetThings', [{ workerId: WORKER_ID, query: { id: DEVICE_ID } }], DEVICE_ID]
  ]
  for (const [action, params, rackActionId] of cases) {
    const res = await writeCalls(handle, action, params, rackActionId)
    t.is(res.action, 'write.calls.response', `${action} answered`)
    t.alike(res.payload, { calls: [{ id: rackActionId, tags: [] }], reqVotes: 1 }, `${action} resolves the rack call with one vote`)
  }
})

test('an action outside WRITE_ACTIONS answers no calls', async (t) => {
  const handle = await bootWorker(t)

  const rack = await writeCalls(handle, 'rackReboot', [{}], WORKER_ID)
  t.alike(rack.payload, { calls: [], reqVotes: 1 }, 'rack action not whitelisted')

  const device = await writeCalls(handle, 'reboot', [])
  t.alike(device.payload, { calls: [], reqVotes: 1 }, 'the sensor is read-only: no device write action')
})

test('registerThing, updateThing and forgetThings execute against the provisioning store', async (t) => {
  const handle = await bootWorker(t)
  const { provisioning } = handle.services

  const published = handle.runtime._publishedContract.capabilities.commands.map((c) => c.name)
  for (const cmd of ['registerThing', 'updateThing', 'forgetThings']) {
    t.ok(published.includes(cmd), `${cmd} is in the published contract`)
  }

  // params as ActionCaller._formatCommandParams shapes them: the pushed object plus actionId/user
  const registered = await command(handle, 'registerThing', { ...thing('rack-1'), actionId: 'act-1', user: 'provisioner' })
  t.is(registered.action, 'command.result')
  t.is(registered.payload.status, 'SUCCESS', `registerThing succeeded: ${registered.payload.error || ''}`)
  const dev = provisioning.getDevice(DEVICE_ID)
  t.ok(dev, 'device persisted')
  t.is(dev.type, 'sensor-temp-seneca-temp-seneca')
  t.is(dev.info.pos, 'rack-1')
  t.alike(dev.opts, { address: ADDRESS, port: 502, unitId: 1, register: 3 })
  t.alike(provisioning.listDeviceIds(), [DEVICE_ID])

  const duplicate = await command(handle, 'registerThing', { ...thing('rack-1'), actionId: 'act-2', user: 'provisioner' })
  t.is(duplicate.payload.status, 'FAILED')
  t.is(duplicate.payload.error, 'ERR_THING_WITH_ID_ALREADY_EXISTS')

  const updated = await command(handle, 'updateThing', { ...thing('rack-2'), actionId: 'act-3', user: 'provisioner' })
  t.is(updated.payload.status, 'SUCCESS', `updateThing succeeded: ${updated.payload.error || ''}`)
  t.is(provisioning.getDevice(DEVICE_ID).info.pos, 'rack-2', 'update persisted')

  const forgotten = await command(handle, 'forgetThings', { query: { id: DEVICE_ID }, actionId: 'act-4' })
  t.is(forgotten.payload.status, 'SUCCESS', `forgetThings succeeded: ${forgotten.payload.error || ''}`)
  t.alike(forgotten.payload.result, { removed: 1 })
  t.absent(provisioning.getDevice(DEVICE_ID), 'device removed')
  t.alike(provisioning.listDeviceIds(), [])
})

test('a remote registerThing is subject to the address policy', async (t) => {
  const handle = await bootWorker(t)

  const res = await command(handle, 'registerThing', { ...thing('rack-1', '127.0.0.1'), actionId: 'act-1', user: 'provisioner' })
  t.is(res.payload.status, 'FAILED')
  t.is(res.payload.error, 'ERR_THING_ADDRESS_FORBIDDEN: 127.0.0.1')
  t.alike(handle.services.provisioning.listDeviceIds(), [], 'nothing persisted')
})
