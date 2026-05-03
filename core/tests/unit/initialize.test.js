'use strict'

const { test } = require('brittle')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { MDK_ROOT } = require('../../lib/utils/constants')

const coreRoot = path.join(__dirname, '..', '..')
const rootStoreDir = path.join(coreRoot, MDK_ROOT)
const tplDir = path.join(coreRoot, 'tpl')

const runInitializeWithoutTpl = (initialize) => {
  const originalMkdirSync = fs.mkdirSync
  fs.mkdirSync = (dir, opts) => {
    if (path.resolve(dir) === tplDir) return dir
    return originalMkdirSync(dir, opts)
  }
  try {
    initialize()
  } finally {
    fs.mkdirSync = originalMkdirSync
  }
}

const ensureInitializeDeps = () => {
  const createdPaths = []
  const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      createdPaths.push(dir)
    }
  }
  const ensureFile = (file, contents) => {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, contents, 'utf8')
      createdPaths.push(file)
    }
  }

  const orkConfigDir = path.join(coreRoot, 'node_modules', 'mdk-ork', 'config')
  const appNodeConfigDir = path.join(coreRoot, 'node_modules', 'mdk-app-node', 'config')
  const appNodeFacsDir = path.join(appNodeConfigDir, 'facs')

  ensureDir(orkConfigDir)
  ensureDir(appNodeFacsDir)
  ensureFile(path.join(orkConfigDir, 'default.config.json.example'), '{}\n')
  ensureFile(path.join(appNodeConfigDir, 'common.json.example'), '{}\n')
  ensureFile(path.join(appNodeFacsDir, 'test.facs.json.example'), '{}\n')

  return () => {
    for (let i = createdPaths.length - 1; i >= 0; i--) {
      try {
        fs.rmSync(createdPaths[i], { recursive: true, force: true })
      } catch (_) {}
    }
  }
}

const trackInitArtifacts = () => {
  const hadRootStoreDir = fs.existsSync(rootStoreDir)
  const hadTplDir = fs.existsSync(tplDir)

  return () => {
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
  }
}

test('initialize creates mdk tree under cwd when absent', (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm-sdk-be-init-'))
  const prev = process.cwd()
  const cleanupDeps = ensureInitializeDeps()
  const cleanupArtifacts = trackInitArtifacts()
  t.teardown(() => {
    cleanupArtifacts()
    cleanupDeps()
    process.chdir(prev)
    try {
      fs.rmSync(tmp, { recursive: true, force: true })
    } catch (_) {}
  })
  process.chdir(tmp)

  const initialize = require('../../lib/utils/initialize')
  runInitializeWithoutTpl(initialize)

  const root = path.join(coreRoot, MDK_ROOT)
  t.ok(fs.existsSync(root), 'mdk root exists')
  t.ok(fs.existsSync(path.join(root, 'config', 'facs')), 'config/facs exists')
  t.ok(fs.existsSync(path.join(root, 'workers', 'http.node.wrk.js')), 'http worker stub exists')
  t.ok(fs.existsSync(path.join(root, 'db')), 'db dir exists')
})

test('initialize is safe to call again when mdk already exists', (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'm-sdk-be-init-'))
  const prev = process.cwd()
  const cleanupDeps = ensureInitializeDeps()
  const cleanupArtifacts = trackInitArtifacts()
  t.teardown(() => {
    cleanupArtifacts()
    cleanupDeps()
    process.chdir(prev)
    try {
      fs.rmSync(tmp, { recursive: true, force: true })
    } catch (_) {}
  })
  process.chdir(tmp)

  const initialize = require('../../lib/utils/initialize')
  runInitializeWithoutTpl(initialize)
  runInitializeWithoutTpl(initialize)

  t.ok(fs.existsSync(path.join(coreRoot, MDK_ROOT)), 'mdk still present after second init')
})
