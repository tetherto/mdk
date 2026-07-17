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
