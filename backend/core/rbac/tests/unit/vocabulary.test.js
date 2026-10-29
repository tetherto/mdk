'use strict'

const test = require('brittle')
const { CALLER_ACTIONS } = require('../../../kernel/lib/transport/caller-auth')
const { KERNEL_ACTIONS, PUBLIC_KERNEL_ACTIONS, KERNEL_RESOURCES, deviceName, workerName, kernelRequest, verbsFor, isReservedName } = require('../../index')

test('every action the Kernel accepts from a caller has an RBAC check', (t) => {
  t.alike([...Object.keys(KERNEL_ACTIONS), ...PUBLIC_KERNEL_ACTIONS].sort(), [...CALLER_ACTIONS].sort())
  for (const action of PUBLIC_KERNEL_ACTIONS) t.absent(Object.hasOwn(KERNEL_ACTIONS, action), `${action} is sign-in, not evaluated`)
  for (const [action, { resource, verb }] of Object.entries(KERNEL_ACTIONS)) {
    t.ok(KERNEL_RESOURCES[resource].includes(verb), `${action} → ${resource}:${verb}`)
  }
})

test('device and worker names are family/brand/worker[/device]', (t) => {
  const parts = { family: 'miner', brand: 'antminer', worker: 'antminer-a', device: 'AM-001' }
  t.is(deviceName(parts), 'miner/antminer/antminer-a/AM-001')
  t.is(workerName(parts), 'miner/antminer/antminer-a')
  t.exception(() => deviceName({ ...parts, device: 'a/b' }), /ERR_RBAC_NAME_INVALID/)
  t.exception(() => deviceName({ ...parts, brand: '*' }), /ERR_RBAC_NAME_INVALID/)
  t.exception(() => workerName({ ...parts, worker: '' }), /ERR_RBAC_NAME_INVALID/)
})

test('kernelRequest omits a missing resourceName', (t) => {
  t.alike(kernelRequest('worker.list'), { resource: 'workers', verb: 'list' })
  t.alike(kernelRequest('command.request', 'a/b/c/d'), { resource: 'devices', verb: 'write', resourceName: 'a/b/c/d' })
})

test('route resources use Gateway verbs; Kernel names are reserved', (t) => {
  t.alike(verbsFor('ops-center/miners'), ['get', 'list', 'create', 'update', 'delete'])
  t.alike(verbsFor('devices'), ['read', 'write'])
  t.ok(isReservedName('devices'))
  t.absent(isReservedName('ops-center'))
})

test('brand slugs', (t) => {
  const { brandSlug } = require('../../index')
  t.is(brandSlug('Antminer'), 'antminer')
  t.is(brandSlug('Schneider Electric'), 'schneider-electric')
  t.is(brandSlug('  ABB  '), 'abb')
  t.is(brandSlug('***'), null)
  t.is(brandSlug(undefined), null)
})
