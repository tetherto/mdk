'use strict'

const test = require('brittle')
const fs = require('fs')
const os = require('os')
const path = require('path')
const {
  findRepoRoot,
  ensureConfigFromExamples,
  resolveWorkerBoot,
  WORKER_BOOTS
} = require('../../utils/service-bootstrap')

const realRepoRoot = path.join(__dirname, '..', '..', '..', '..', '..')

test('findRepoRoot resolves the real repo root by walking up from a nested dir', (t) => {
  const nested = path.join(realRepoRoot, 'backend', 'core', 'mdk', 'tests', 'unit')
  t.is(findRepoRoot(nested), path.resolve(realRepoRoot))
})

test('findRepoRoot throws when no repo root is found', (t) => {
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-no-repo-'))
  t.teardown(() => fs.rmSync(outside, { recursive: true, force: true }))
  t.exception(() => findRepoRoot(outside), /ERR_MDK_REPO_ROOT/)
})

test('ensureConfigFromExamples is a no-op when the dir does not exist', (t) => {
  const missing = path.join(os.tmpdir(), 'mdk-does-not-exist-' + Date.now())
  ensureConfigFromExamples(missing) // should not throw
  t.pass()
})

test('ensureConfigFromExamples copies .example files that are missing, recursing into subdirs, and skips existing ones', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-config-examples-'))
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))

  fs.writeFileSync(path.join(dir, 'common.json.example'), '{"a":1}')
  fs.writeFileSync(path.join(dir, 'existing.json.example'), '{"b":2}')
  fs.writeFileSync(path.join(dir, 'existing.json'), '{"already":"here"}')
  fs.mkdirSync(path.join(dir, 'facs'))
  fs.writeFileSync(path.join(dir, 'facs', 'nested.json.example'), '{"c":3}')

  ensureConfigFromExamples(dir)

  t.ok(fs.existsSync(path.join(dir, 'common.json')), 'missing dest created from example')
  t.is(fs.readFileSync(path.join(dir, 'common.json'), 'utf8'), '{"a":1}')
  t.is(fs.readFileSync(path.join(dir, 'existing.json'), 'utf8'), '{"already":"here"}', 'existing dest left untouched')
  t.ok(fs.existsSync(path.join(dir, 'facs', 'nested.json')), 'recurses into subdirectories')
})

test('resolveWorkerBoot throws for an unknown worker key', (t) => {
  t.exception(() => resolveWorkerBoot(realRepoRoot, 'nope-not-a-worker'), /ERR_MDK_WORKER_UNKNOWN/)
})

test('resolveWorkerBoot throws when the resolved package has no matching factory export', (t) => {
  const fakeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-fake-repo-'))
  t.teardown(() => fs.rmSync(fakeRoot, { recursive: true, force: true }))

  const pkgDir = path.join(fakeRoot, 'backend', 'workers', 'miners', 'whatsminer')
  fs.mkdirSync(pkgDir, { recursive: true })
  fs.writeFileSync(path.join(pkgDir, 'index.js'), 'module.exports = {}')

  t.exception(() => resolveWorkerBoot(fakeRoot, 'miner-whatsminer'), /ERR_MDK_WORKER_EXPORT: startWhatsminerWorker/)
})

test('resolveWorkerBoot returns the spec and factory when the package exports it', (t) => {
  const fakeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-fake-repo-'))
  t.teardown(() => fs.rmSync(fakeRoot, { recursive: true, force: true }))

  const pkgDir = path.join(fakeRoot, 'backend', 'workers', 'miners', 'whatsminer')
  fs.mkdirSync(pkgDir, { recursive: true })
  fs.writeFileSync(
    path.join(pkgDir, 'index.js'),
    "module.exports = { startWhatsminerWorker: () => 'ok' }"
  )

  const { spec, factory } = resolveWorkerBoot(fakeRoot, 'miner-whatsminer')
  t.is(spec, WORKER_BOOTS['miner-whatsminer'])
  t.is(factory(), 'ok')
})
