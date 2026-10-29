'use strict'

const test = require('brittle')
const fs = require('fs')
const os = require('os')
const path = require('path')

const { DEFAULT_WORKER_TYPE, DEFAULT_MODEL } = require('../lib/constants')
const { runProfileProcess, runSweep } = require('../lib/sweep-runner')
const { deviceRange, uncappedRange, cartesian, profileId, combinationSteps, totalCombinations, main } = require('../scenarios/benchmark')

const type = DEFAULT_WORKER_TYPE
const model = DEFAULT_MODEL
const ceiling = (startDeviceCount, stepDeviceCount, maxDeviceCount) => ({ startDeviceCount, stepDeviceCount, maxDeviceCount })

function tmpDir (t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-bench-sweep-'))
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))
  return dir
}

function writeResult (dir, id, overall) {
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify({ profileId: id, verdict: { overall } }))
}

test('deviceRange / uncappedRange / cartesian / profileId', (t) => {
  t.alike(deviceRange(ceiling(10, 10, 30)), [10, 20, 30])
  t.alike(deviceRange(ceiling(5, 10, 30)), [5, 15, 25])

  const it = uncappedRange(3, 4)
  t.alike([it.next().value, it.next().value, it.next().value], [3, 7, 11])

  t.alike(cartesian([[1, 2], [10]]), [[1, 10], [2, 10]])
  t.alike(cartesian([]), [[]])

  t.is(profileId([{ devices: 100 }, { devices: 50 }]), 'cap-150devices-2workers')
})

test('combinationSteps: one family sweeps its own range', (t) => {
  const steps = [...combinationSteps([{ type, model, ceiling: ceiling(10, 10, 20) }])]
  t.alike(steps.map((s) => s.id), ['cap-10devices-1workers', 'cap-20devices-1workers'])
  t.alike(steps[0].workers, [{ type, model, devices: 10, simulateMocks: true }])
})

test('combinationSteps: an uncapped family keeps going', (t) => {
  const gen = combinationSteps([{ type, model, ceiling: ceiling(100, 50, 0) }])
  t.is(gen.next().value.id, 'cap-100devices-1workers')
  t.is(gen.next().value.id, 'cap-150devices-1workers')
  t.is(gen.next().value.id, 'cap-200devices-1workers')
})

test('combinationSteps: several families sweep the Cartesian product, smallest total first', (t) => {
  const steps = [...combinationSteps([
    { type, model, ceiling: ceiling(10, 10, 20) },
    { type, model: 'other', ceiling: ceiling(1, 4, 5) }
  ])]
  t.alike(steps.map((s) => s.workers.map((w) => w.devices)), [[10, 1], [10, 5], [20, 1], [20, 5]])
  t.is(steps[1].id, 'cap-15devices-2workers')
  t.is(steps[1].workers[1].model, 'other')
})

test('totalCombinations', (t) => {
  t.is(totalCombinations([{ ceiling: ceiling(10, 10, 30) }]), 3)
  t.is(totalCombinations([{ ceiling: ceiling(10, 10, 0) }]), Infinity)
  t.is(totalCombinations([{ ceiling: ceiling(10, 10, 30) }, { ceiling: ceiling(1, 1, 2) }]), 6)
})

test('runSweep: collects each completed profile, stops on the first red', (t) => {
  const dir = tmpDir(t)
  writeResult(dir, 'a', 'green')
  writeResult(dir, 'b', 'red')
  writeResult(dir, 'c', 'green')
  const ran = []
  const runProfile = (p) => { ran.push(p.id); return true }

  const all = runSweep('unit', [{ id: 'a' }, { id: 'b' }, { id: 'c' }], { resultsDir: dir, runProfile })
  t.alike(all.map((e) => e.verdict.overall), ['green', 'red', 'green'], 'without stopOnFirstRed every profile runs')

  ran.length = 0
  const stopped = runSweep('unit', [{ id: 'a' }, { id: 'b' }, { id: 'c' }], { resultsDir: dir, runProfile, stopOnFirstRed: true })
  t.alike(ran, ['a', 'b'])
  t.is(stopped.length, 2)
  t.is(stopped[1].profile.profileId, 'b')
})

test('runSweep: stops when a profile fails or writes no result', (t) => {
  const dir = tmpDir(t)
  writeResult(dir, 'a', 'green')

  const failed = runSweep('unit', [{ id: 'a' }, { id: 'b' }], { resultsDir: dir, runProfile: (p) => p.id !== 'a' })
  t.is(failed.length, 0, 'a profile process that did not complete ends the sweep')

  const missing = runSweep('unit', [{ id: 'a' }, { id: 'missing' }, { id: 'a' }], { resultsDir: dir, runProfile: () => true })
  t.is(missing.length, 1, 'a profile with no result file ends the sweep')
})

test('runProfileProcess: a profile that exits 1 still counts as completed', (t) => {
  // An unregistered worker type fails fast in run-process.js (exit 1, the
  // same code a measured-but-red run uses) before any process is spawned.
  t.is(runProfileProcess({ id: 'unit-invalid', workers: [{ type: 'mdk-worker-nope', model: 'x', devices: 1 }] }), true)
})

test('main: reports the breaking point, or that none was found', (t) => {
  const red = { profile: { profileId: 'cap-20devices-1workers' }, verdict: { overall: 'red' } }
  const green = { profile: { profileId: 'cap-10devices-1workers' }, verdict: { overall: 'green' } }
  const calls = []
  const writeComparisonMatrix = (entries, opts) => { calls.push(opts); return path.join(opts.resultsDir, 'matrix.md') }
  const specs = [{ type, model, ceiling: ceiling(10, 10, 20) }]

  const found = main({ specs, runSweep: () => [green, red], writeComparisonMatrix, resultsDir: '/tmp/r' })
  t.is(found.breakingPoint, red)
  t.is(found.matrixPath, path.join('/tmp/r', 'matrix.md'))
  t.alike(calls[0], { resultsDir: '/tmp/r', sweepId: 'benchmark' })

  let swept
  const none = main({ specs, runSweep: (id, steps, opts) => { swept = { id, steps: [...steps], opts }; return [green] }, writeComparisonMatrix })
  t.is(none.breakingPoint, undefined)
  t.is(swept.id, 'benchmark')
  t.is(swept.steps.length, 2)
  t.alike(swept.opts, { stopOnFirstRed: true })

  const uncapped = main({ specs: [{ type, model, ceiling: ceiling(10, 10, 0) }], runSweep: () => [green], writeComparisonMatrix })
  t.is(uncapped.entries.length, 1)

  const multi = main({ specs: [...specs, { type, model, ceiling: ceiling(1, 1, 1) }], runSweep: () => [], writeComparisonMatrix })
  t.is(multi.entries.length, 0)
})
