'use strict'

const { test } = require('brittle')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { EventEmitter } = require('events')
const { discoverWorkerKeys } = require('../../lib/local-discovery')

test('discoverWorkerKeys - survives fs.watch sync failure', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-watch-'))
  const origWatch = fs.watch
  t.teardown(() => {
    fs.watch = origWatch
    try { fs.rmSync(dir, { recursive: true, force: true }) } catch {}
  })

  fs.watch = () => {
    const err = new Error('EMFILE: too many open files, watch')
    err.code = 'EMFILE'
    throw err
  }

  const kernel = { dhtListener: { discoverWorker: async () => {} } }
  const ctrl = discoverWorkerKeys(kernel, dir)
  t.pass('returned handle when watch threw')
  ctrl.stop()
})

test('discoverWorkerKeys - periodic scan discovers keys when watch fails at init', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-watch-'))
  const origWatch = fs.watch
  const discovered = []
  t.teardown(() => {
    fs.watch = origWatch
    try { fs.rmSync(dir, { recursive: true, force: true }) } catch {}
  })

  fs.watch = () => {
    const err = new Error('EMFILE: too many open files, watch')
    err.code = 'EMFILE'
    throw err
  }

  const kernel = {
    dhtListener: {
      discoverWorker: async (key) => { discovered.push(key) }
    }
  }
  const ctrl = discoverWorkerKeys(kernel, dir, { rescanMs: 50 })

  const keyHex = 'a'.repeat(64)
  fs.writeFileSync(path.join(dir, 'worker1.key'), keyHex, 'utf8')

  await new Promise((resolve) => setTimeout(resolve, 200))
  t.ok(discovered.includes(keyHex), 'rescan offered key after watch failed at init')

  ctrl.stop()
})

test('discoverWorkerKeys - survives fs.watch error event', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-watch-'))
  const origWatch = fs.watch
  t.teardown(() => {
    fs.watch = origWatch
    try { fs.rmSync(dir, { recursive: true, force: true }) } catch {}
  })

  const fake = new EventEmitter()
  fake.close = () => {}
  fs.watch = () => fake

  const discovered = []
  const kernel = {
    dhtListener: {
      discoverWorker: async (key) => { discovered.push(key) }
    }
  }
  const ctrl = discoverWorkerKeys(kernel, dir, { rescanMs: 50 })

  const err = new Error('EMFILE: too many open files, watch')
  err.code = 'EMFILE'
  fake.emit('error', err)
  await new Promise((resolve) => setImmediate(resolve))

  const keyHex = 'b'.repeat(64)
  fs.writeFileSync(path.join(dir, 'worker2.key'), keyHex, 'utf8')

  await new Promise((resolve) => setTimeout(resolve, 200))
  t.ok(discovered.includes(keyHex), 'rescan offered key after watch error event')

  ctrl.stop()
})

const {
  publishTrustedKey, readTrustedKeys, watchTrustedKeys, trustKernel, trustKeysFromDir, callerKeyPair, waitForKernelKey
} = require('../../lib/local-discovery')

const K1 = 'aa'.repeat(32)
const K2 = 'bb'.repeat(32)

function tmp (t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-trust-'))
  t.teardown(() => { try { fs.rmSync(dir, { recursive: true, force: true }) } catch {} })
  return dir
}

test('trusted keys - publish/read round-trip, invalid input refused', (t) => {
  const dir = path.join(tmp(t), 'keys')
  publishTrustedKey(dir, 'kernel', Buffer.from(K1, 'hex'))
  publishTrustedKey(dir, 'gateway', K2)
  t.alike(readTrustedKeys(dir).sort((a, b) => a.name.localeCompare(b.name)), [{ name: 'gateway', key: K2 }, { name: 'kernel', key: K1 }])
  t.is(fs.statSync(dir).mode & 0o777, 0o700, 'dir is private')
  t.exception(() => publishTrustedKey(dir, 'x', 'nothex'), /ERR_TRUSTED_KEY_INVALID/)
  t.exception(() => publishTrustedKey(dir, '../evil', K1), /ERR_TRUSTED_KEY_NAME_INVALID/)
})

test('trusted keys - group/world-writable files are ignored', { skip: process.platform === 'win32' }, (t) => {
  const dir = tmp(t)
  fs.writeFileSync(path.join(dir, 'loose.pub'), K1)
  fs.chmodSync(path.join(dir, 'loose.pub'), 0o666)
  t.alike(readTrustedKeys(dir), [])
})

test('trusted keys - watch reports each key once', async (t) => {
  const dir = tmp(t)
  publishTrustedKey(dir, 'kernel', K1)
  const seen = []
  const w = watchTrustedKeys(dir, (key, name) => seen.push(name), { rescanMs: 50 })
  publishTrustedKey(dir, 'gateway', K2)
  await new Promise((resolve) => setTimeout(resolve, 200))
  w.stop()
  t.alike(seen.sort(), ['gateway', 'kernel'])
  t.is(await waitForKernelKey(dir, { timeoutMs: 10 }), K1)
  await t.exception(() => waitForKernelKey(tmp(t), { timeoutMs: 10 }), /ERR_KERNEL_CLIENT_KEY_NOT_FOUND/)
})

test('trustKernel - a worker allows the Kernel client key and no caller the Kernel admits', (t) => {
  const kernel = new EventEmitter()
  kernel.getClientPublicKey = () => Buffer.from(K1, 'hex')
  kernel.listAllowedKeys = () => [K2]
  const allowed = new Set()
  const runtime = { allowKey: (k) => allowed.add(Buffer.isBuffer(k) ? k.toString('hex') : String(k)), revokeKey: (k) => allowed.delete(k) }
  const ctrl = trustKernel(runtime, kernel)
  t.alike([...allowed], [K1], 'only the Kernel: device calls go through its spec.rbac check')
  kernel.emit('caller-allowed', { key: 'dd'.repeat(32) })
  t.absent(allowed.has('dd'.repeat(32)), 'admitted callers are not let past the Kernel')
  ctrl.stop()
})

test('trustKeysFromDir - a worker allows kernel.pub only', (t) => {
  const dir = tmp(t)
  publishTrustedKey(dir, 'kernel', K1)
  publishTrustedKey(dir, 'gateway', K2)
  const allowed = []
  const ctrl = trustKeysFromDir({ workerId: 'w', allowKey: (k) => allowed.push(k) }, dir)
  ctrl.stop()
  t.alike(allowed, [K1])
})

test('callerKeyPair - persistent hyperdht-format keypair', (t) => {
  const DHT = require('hyperdht')
  const dir = tmp(t)
  const a = callerKeyPair(dir)
  const b = callerKeyPair(dir)
  t.alike(a.publicKey, b.publicKey, 'stable across calls')
  const seed = fs.readFileSync(path.join(dir, 'seed'))
  const ref = DHT.keyPair(seed)
  t.alike(a.publicKey, ref.publicKey)
  t.alike(a.secretKey, ref.secretKey)
  t.is(fs.statSync(path.join(dir, 'seed')).mode & 0o777, 0o600)
})

const { publishWorkerKey, discoverWorkerKeys: discover } = require('../../lib/local-discovery')

function keysTmp (t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-wkeys-'))
  t.teardown(() => { try { fs.rmSync(dir, { recursive: true, force: true }) } catch {} })
  return dir
}

test('publishWorkerKey - safe name, private dir and file, atomic, hex only', (t) => {
  const root = keysTmp(t)
  const dir = path.join(root, '.worker-keys')
  publishWorkerKey(dir, 'test-miner-1', K1)
  const file = path.join(dir, 'test-miner-1.key')
  t.is(fs.readFileSync(file, 'utf8'), K1)
  if (process.platform !== 'win32') {
    t.is(fs.statSync(dir).mode & 0o777, 0o700, 'dir is 0700')
    t.is(fs.statSync(file).mode & 0o777, 0o600, 'file is 0600')
  }
  t.alike(fs.readdirSync(dir), ['test-miner-1.key'], 'no temp files left behind')

  publishWorkerKey(dir, 'test-miner-1', K2.toUpperCase())
  t.is(fs.readFileSync(file, 'utf8'), K2, 're-publish replaces the key')

  for (const bad of ['../evil', 'a/b', '', 'x y', null, '..\\x']) {
    t.exception(() => publishWorkerKey(dir, bad, K1), /ERR_TRUSTED_KEY_NAME_INVALID/, `workerId ${JSON.stringify(bad)}`)
  }
  t.absent(fs.existsSync(path.join(root, 'evil.key')), 'no traversal')
  t.exception(() => publishWorkerKey(dir, 'w', 'nothex'), /ERR_TRUSTED_KEY_INVALID/)
  t.exception(() => publishWorkerKey(dir, 'w', 'a'.repeat(63)), /ERR_TRUSTED_KEY_INVALID/)
})

test('publishWorkerKey / discoverWorkerKeys - refuse an unsafe keys dir', { skip: process.platform === 'win32' }, (t) => {
  const root = keysTmp(t)
  const loose = path.join(root, 'loose')
  fs.mkdirSync(loose)
  fs.chmodSync(loose, 0o777)
  t.exception(() => publishWorkerKey(loose, 'w', K1), /ERR_KEYS_DIR_UNSAFE/)
  const kernel = { dhtListener: { discoverWorker: async () => {} } }
  t.exception(() => discover(kernel, loose), /ERR_KEYS_DIR_UNSAFE/)

  const real = path.join(root, 'real')
  fs.mkdirSync(real, { mode: 0o700 })
  const link = path.join(root, 'link')
  fs.symlinkSync(real, link)
  t.exception(() => publishWorkerKey(link, 'w', K1), /ERR_KEYS_DIR_UNSAFE/, 'symlinked dir refused')
})

test('discoverWorkerKeys - offers only regular, private, owned, 64-hex .key files', { skip: process.platform === 'win32' }, async (t) => {
  const root = keysTmp(t)
  const dir = path.join(root, 'keys')
  const outside = path.join(root, 'outside.key')
  fs.writeFileSync(outside, 'ee'.repeat(32))

  publishWorkerKey(dir, 'good', K1)
  fs.writeFileSync(path.join(dir, 'loose.key'), 'cc'.repeat(32))
  fs.chmodSync(path.join(dir, 'loose.key'), 0o666)
  fs.writeFileSync(path.join(dir, 'garbage.key'), 'not a key at all')
  fs.writeFileSync(path.join(dir, 'long.key'), 'dd'.repeat(32) + 'ff')
  fs.writeFileSync(path.join(dir, 'other.pub'), 'ab'.repeat(32))
  fs.symlinkSync(outside, path.join(dir, 'link.key'))
  fs.mkdirSync(path.join(dir, 'sub.key'))

  const discovered = []
  const kernel = { dhtListener: { discoverWorker: async (key) => { discovered.push(key) } } }
  const ctrl = discover(kernel, dir, { rescanMs: 50 })
  await new Promise((resolve) => setTimeout(resolve, 150))
  ctrl.stop()

  t.alike([...new Set(discovered)], [K1], 'only the valid key was offered')
})
