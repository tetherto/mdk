'use strict'

// Single benchmark entrypoint — the only sizing run this harness exposes.
// Boots every entry in config.workers SIMULTANEOUSLY (one Kernel, one
// Gateway, and one Worker process per entry, all in the same profile run)
// and sweeps the Cartesian product of every entry's own device-count range
// (ceiling.startDeviceCount up to ceiling.maxDeviceCount in
// ceiling.stepDeviceCount increments), so every combination of every
// family's device count gets tried against every other family's. Combos
// are run lowest total device count first, and the whole sweep stops at the
// first combination that goes red (the fleet's breaking point) — one
// combined sweep, not one per family, since every family is on simultaneously.
//
// A single config.workers entry may set ceiling.maxDeviceCount: 0 (uncapped)
// to keep raising that one dimension until red instead of stopping at a
// fixed ceiling; that's only valid with exactly one entry (an unbounded
// dimension can't be combined into a finite product) — enforced eagerly by
// lib/site.js when the config loads.
//
// Usage: node scenarios/benchmark.js

const { config } = require('../lib/site')
const { runSweep: defaultRunSweep, RESULTS_DIR } = require('../lib/sweep-runner')
const { writeComparisonMatrix: defaultWriteComparisonMatrix } = require('../lib/report')

function deviceRange ({ startDeviceCount, stepDeviceCount, maxDeviceCount }) {
  const range = []
  for (let d = startDeviceCount; d <= maxDeviceCount; d += stepDeviceCount) range.push(d)
  return range
}

// Lazy — the single-entry uncapped case has no finite range to precompute.
function * uncappedRange (startDeviceCount, stepDeviceCount) {
  for (let d = startDeviceCount; ; d += stepDeviceCount) yield d
}

function cartesian (ranges) {
  return ranges.reduce((combos, range) => combos.flatMap((combo) => range.map((d) => [...combo, d])), [[]])
}

// Named by total device count + worker count (e.g. cap-150devices-2workers)
// rather than by per-family breakdown — two different splits across
// families that land on the same total/worker count do collide (the later
// one's report overwrites the earlier one's), a tradeoff for a short,
// predictable name.
function profileId (workers) {
  const totalDevices = workers.reduce((sum, w) => sum + w.devices, 0)
  return `cap-${totalDevices}devices-${workers.length}workers`
}

// One profile step per combination — `workers` always lists every
// config.workers entry at once (simultaneous), just at that combination's
// own per-entry device count.
function * combinationSteps (specs) {
  if (specs.length === 1) {
    const [{ type, model, ceiling }] = specs
    const range = ceiling.maxDeviceCount === 0
      ? uncappedRange(ceiling.startDeviceCount, ceiling.stepDeviceCount)
      : deviceRange(ceiling)
    for (const d of range) {
      const workers = [{ type, model, devices: d, simulateMocks: true }]
      yield { id: profileId(workers), workers }
    }
    return
  }

  const combos = cartesian(specs.map(({ ceiling }) => deviceRange(ceiling)))
    .sort((a, b) => a.reduce((s, d) => s + d, 0) - b.reduce((s, d) => s + d, 0))
  for (const combo of combos) {
    const workers = specs.map(({ type, model }, i) => ({ type, model, devices: combo[i], simulateMocks: true }))
    yield { id: profileId(workers), workers }
  }
}

function totalCombinations (specs) {
  if (specs.length === 1) return specs[0].ceiling.maxDeviceCount === 0 ? Infinity : deviceRange(specs[0].ceiling).length
  return specs.reduce((product, { ceiling }) => product * deviceRange(ceiling).length, 1)
}

// `runSweep`/`writeComparisonMatrix` are injectable so tests can drive the
// sweep logic without booting real profile processes.
function main ({ specs = config.workers, runSweep = defaultRunSweep, writeComparisonMatrix = defaultWriteComparisonMatrix, resultsDir = RESULTS_DIR } = {}) {
  const totalCombos = totalCombinations(specs)

  console.log(`\n=== sweeping ${specs.length} worker famil${specs.length === 1 ? 'y' : 'ies'} simultaneously — ${totalCombos === Infinity ? 'uncapped, until a step goes red' : `${totalCombos} combination(s)`} ===`)

  const entries = runSweep('benchmark', combinationSteps(specs), { stopOnFirstRed: true })

  const breakingPoint = entries.find((e) => e.verdict.overall === 'red')
  if (breakingPoint) {
    console.log(`\nbreaking point: ${breakingPoint.profile.profileId} — first limit hit: telemetry freshness (headroom >= 1.0) or another red criterion, see ${breakingPoint.profile.profileId}.md`)
  } else if (totalCombos === Infinity) {
    console.log('\nsweep stopped before any step went red (a profile run failed to complete) — see logs above')
  } else {
    console.log('\nno breaking point found across the full combination sweep — raise ceiling.maxDeviceCount/stepDeviceCount in config.workers to keep pushing')
  }

  const matrixPath = writeComparisonMatrix(entries, { resultsDir, sweepId: 'benchmark' })
  console.log(`\ncomparison matrix: ${matrixPath}`)
  return { entries, breakingPoint, matrixPath }
}

if (require.main === module) main()

module.exports = { deviceRange, uncappedRange, cartesian, profileId, combinationSteps, totalCombinations, main }
