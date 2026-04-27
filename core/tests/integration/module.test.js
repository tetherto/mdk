'use strict'

const { test } = require('brittle')
const fs = require('fs')
const path = require('path')
const sdk = require('../../lib/mdk')
const { MDK_ROOT } = require('../../lib/utils/constants')

const coreRoot = path.join(__dirname, '..', '..')
const rootStoreDir = path.join(coreRoot, MDK_ROOT)
const tplDir = path.join(coreRoot, 'tpl')

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

test('MDK module exports startApi, initType, initialize', (t) => {
  t.ok(typeof sdk.startApi === 'function', 'startApi is a function')
  t.ok(typeof sdk.initType === 'function', 'initType is a function')
  t.ok(typeof sdk.initialize === 'function', 'initialize is a function')
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
