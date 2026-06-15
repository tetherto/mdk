'use strict'

const { test } = require('brittle')
const fs = require('fs')
const path = require('path')
const sdk = require('../..')
const { MDK_ROOT } = require('../../utils/constants')

const repoRoot = path.join(__dirname, '..', '..', '..', '..', '..')
const rootStoreDir = path.join(repoRoot, MDK_ROOT)
const tplDir = path.join(repoRoot, 'tpl')

const runInitializeWithoutTpl = () => {
  const originalMkdirSync = fs.mkdirSync
  fs.mkdirSync = (dir, opts) => {
    if (path.resolve(dir) === tplDir) return dir
    return originalMkdirSync(dir, opts)
  }
  try {
    sdk.initialize()
  } finally {
    fs.mkdirSync = originalMkdirSync
  }
}

test('MDK module exports getOrk, startWorker, startOrk, waitForDiscovery, initialize', (t) => {
  t.ok(typeof sdk.getOrk === 'function', 'getOrk is a function')
  t.ok(typeof sdk.startWorker === 'function', 'startWorker is a function')
  t.ok(typeof sdk.startOrk === 'function', 'startOrk is a function')
  t.ok(typeof sdk.waitForDiscovery === 'function', 'waitForDiscovery is a function')
  t.ok(typeof sdk.initialize === 'function', 'initialize is a function')
  t.ok(typeof sdk.DEFAULT_IPC_SOCK === 'string', 'DEFAULT_IPC_SOCK is a string')
  t.ok(typeof sdk.DEFAULT_TOPIC_FILE === 'string', 'DEFAULT_TOPIC_FILE is a string')
})

test('initialize can be invoked directly', (t) => {
  const hadRootStoreDir = fs.existsSync(rootStoreDir)
  const hadTplDir = fs.existsSync(tplDir)
  t.teardown(() => {
    if (!hadRootStoreDir) {
      try {
        fs.rmSync(rootStoreDir, { recursive: true, force: true })
      } catch (_) {}
    }
    if (!hadTplDir) {
      try {
        fs.rmSync(tplDir, { recursive: true, force: true })
      } catch (_) {}
    }
  })
  runInitializeWithoutTpl()
  t.pass('initialize runs without throwing')
})
