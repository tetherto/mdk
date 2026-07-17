'use strict'

const test = require('brittle')
const path = require('path')
const fs = require('fs')
const os = require('os')
const Corestore = require('corestore')
const Hyperbee = require('hyperbee')
const { WAL } = require('../../lib/storage/wal')
const { COMMAND_STATES } = require('../../lib/modules/command-state-machine/states')

/**
 * Creates a temporary Hyperbee for testing (bypasses hp-svc-facs-store facility)
 */
async function createTestBee (t) {
  const tmpDir = path.join(os.tmpdir(), `mdk-kernel-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  fs.mkdirSync(tmpDir, { recursive: true })

  const store = new Corestore(tmpDir)
  const core = store.get({ name: 'test-db' })
  const bee = new Hyperbee(core, { keyEncoding: 'utf-8' })
  await bee.ready()

  t.teardown(async () => {
    await bee.close()
    await store.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  return bee
}

// ─── Hyperbee sub-database tests ──────────────────────────────────────

test('storage - Hyperbee sub-databases: put/get/del', async (t) => {
  const bee = await createTestBee(t)

  const registry = bee.sub('kernel-registry')
  const capabilities = bee.sub('ork-capabilities')
  const commandWal = bee.sub('kernel-command-wal')

  // Put data in each sub
  await registry.put('worker-1', Buffer.from(JSON.stringify({ workerId: 'worker-1', devices: ['wm001'] })))
  await capabilities.put('worker-1', Buffer.from(JSON.stringify({ commands: ['reboot'] })))
  await commandWal.put('cmd-1', Buffer.from(JSON.stringify({ state: 'QUEUED' })))

  // Get data back
  const regNode = await registry.get('worker-1')
  t.ok(regNode, 'registry has worker-1')
  t.is(JSON.parse(regNode.value.toString()).workerId, 'worker-1')

  const capNode = await capabilities.get('worker-1')
  t.ok(capNode, 'capabilities has worker-1')

  const walNode = await commandWal.get('cmd-1')
  t.ok(walNode, 'wal has cmd-1')
  t.is(JSON.parse(walNode.value.toString()).state, 'QUEUED')

  // Delete
  await commandWal.del('cmd-1')
  const deleted = await commandWal.get('cmd-1')
  t.absent(deleted, 'deleted entry is gone')

  // Sub-databases are isolated
  const crossCheck = await registry.get('cmd-1')
  t.absent(crossCheck, 'registry does not see wal keys')
})

test('storage - Hyperbee createReadStream on sub', async (t) => {
  const bee = await createTestBee(t)
  const sub = bee.sub('test-stream')

  await sub.put('a', Buffer.from('1'))
  await sub.put('b', Buffer.from('2'))
  await sub.put('c', Buffer.from('3'))

  const entries = []
  for await (const node of sub.createReadStream()) {
    entries.push({ key: node.key.toString(), value: node.value.toString() })
  }

  t.is(entries.length, 3, 'stream returns all 3 entries')
  t.is(entries[0].key, 'a')
  t.is(entries[2].key, 'c')
})

// ─── WAL tests with real Hyperbee ─────────────────────────────────────

test('wal - append and get with real Hyperbee', async (t) => {
  const bee = await createTestBee(t)
  const walStore = bee.sub('kernel-command-wal')
  const wal = new WAL(walStore)

  const entry = {
    state: COMMAND_STATES.QUEUED,
    deviceId: 'wm001',
    command: 'reboot',
    params: {},
    retries: 3,
    createdAt: Date.now()
  }

  await wal.append('cmd-001', entry)

  const retrieved = await wal.get('cmd-001')
  t.ok(retrieved, 'entry exists')
  t.is(retrieved.state, 'QUEUED')
  t.is(retrieved.deviceId, 'wm001')
  t.is(retrieved.command, 'reboot')
  t.is(retrieved.retries, 3)
  t.ok(retrieved.updatedAt, 'updatedAt was set by append')
})

test('wal - delete removes entry', async (t) => {
  const bee = await createTestBee(t)
  const wal = new WAL(bee.sub('kernel-command-wal'))

  await wal.append('cmd-002', { state: COMMAND_STATES.SUCCESS, deviceId: 'wm001', command: 'reboot', params: {}, retries: 0, createdAt: Date.now() })
  t.ok(await wal.get('cmd-002'), 'entry exists before delete')

  await wal.delete('cmd-002')
  t.absent(await wal.get('cmd-002'), 'entry removed after delete')
})

test('wal - sweep returns all entries', async (t) => {
  const bee = await createTestBee(t)
  const wal = new WAL(bee.sub('kernel-command-wal'))

  await wal.append('cmd-a', { state: COMMAND_STATES.QUEUED, deviceId: 'wm001', command: 'reboot', params: {}, retries: 3, createdAt: Date.now() })
  await wal.append('cmd-b', { state: COMMAND_STATES.EXECUTING, deviceId: 'wm002', command: 'setPowerMode', params: { mode: 'low' }, retries: 2, createdAt: Date.now() })
  await wal.append('cmd-c', { state: COMMAND_STATES.SUCCESS, deviceId: 'wm003', command: 'setLED', params: {}, retries: 0, createdAt: Date.now() })

  const all = await wal.sweep()
  t.is(all.length, 3, 'sweep returns all 3 entries')

  const ids = all.map(e => e.commandId)
  t.ok(ids.includes('cmd-a'))
  t.ok(ids.includes('cmd-b'))
  t.ok(ids.includes('cmd-c'))
})

test('wal - getPending filters out terminal states', async (t) => {
  const bee = await createTestBee(t)
  const wal = new WAL(bee.sub('kernel-command-wal'))

  await wal.append('cmd-1', { state: COMMAND_STATES.QUEUED, deviceId: 'wm001', command: 'reboot', params: {}, retries: 3, createdAt: Date.now() })
  await wal.append('cmd-2', { state: COMMAND_STATES.EXECUTING, deviceId: 'wm002', command: 'reboot', params: {}, retries: 2, createdAt: Date.now() })
  await wal.append('cmd-3', { state: COMMAND_STATES.SUCCESS, deviceId: 'wm003', command: 'reboot', params: {}, retries: 0, createdAt: Date.now() })
  await wal.append('cmd-4', { state: COMMAND_STATES.FAILED, deviceId: 'wm004', command: 'reboot', params: {}, retries: 0, createdAt: Date.now() })

  const pending = await wal.getPending()
  t.is(pending.length, 2, 'only non-terminal entries returned')

  const states = pending.map(e => e.entry.state)
  t.ok(states.includes('QUEUED'))
  t.ok(states.includes('EXECUTING'))
  t.absent(states.includes('SUCCESS'))
  t.absent(states.includes('FAILED'))
})

test('wal - crash recovery scenario: EXECUTING survives restart', async (t) => {
  const bee = await createTestBee(t)
  const walStore = bee.sub('kernel-command-wal')

  // Simulate pre-crash state: a command was EXECUTING when Kernel died
  const wal1 = new WAL(walStore)
  await wal1.append('cmd-crashed', {
    state: COMMAND_STATES.EXECUTING,
    deviceId: 'wm001',
    command: 'reboot',
    params: {},
    retries: 2,
    createdAt: Date.now()
  })

  // Simulate Kernel restart: new WAL instance, same store
  const wal2 = new WAL(walStore)
  const entries = await wal2.sweep()

  t.is(entries.length, 1, 'crashed entry survived restart')
  t.is(entries[0].commandId, 'cmd-crashed')
  t.is(entries[0].entry.state, 'EXECUTING', 'state preserved')
  t.is(entries[0].entry.retries, 2, 'retries preserved')

  // Command State Machine would now transition EXECUTING → TIMEOUT → re-queue
  const entry = entries[0].entry
  entry.state = COMMAND_STATES.QUEUED
  entry.retries -= 1
  await wal2.append('cmd-crashed', entry)

  const recovered = await wal2.get('cmd-crashed')
  t.is(recovered.state, 'QUEUED', 'transitioned to QUEUED for retry')
  t.is(recovered.retries, 1, 'retries decremented')
})

test('wal - overwrite entry on state transition', async (t) => {
  const bee = await createTestBee(t)
  const wal = new WAL(bee.sub('kernel-command-wal'))

  await wal.append('cmd-x', { state: COMMAND_STATES.QUEUED, deviceId: 'wm001', command: 'reboot', params: {}, retries: 3, createdAt: Date.now() })
  await wal.append('cmd-x', { state: COMMAND_STATES.DISPATCHED, deviceId: 'wm001', command: 'reboot', params: {}, retries: 3, createdAt: Date.now() })
  await wal.append('cmd-x', { state: COMMAND_STATES.EXECUTING, deviceId: 'wm001', command: 'reboot', params: {}, retries: 3, createdAt: Date.now() })

  const entry = await wal.get('cmd-x')
  t.is(entry.state, 'EXECUTING', 'latest state wins')

  // Only 1 entry in sweep (key is unique)
  const all = await wal.sweep()
  t.is(all.length, 1, 'single entry for same commandId')
})
