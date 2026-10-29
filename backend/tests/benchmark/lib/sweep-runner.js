'use strict'

// Shared driver for scenarios/benchmark.js: runs processes/run-process.js
// (always the profile role — its only default) once per profile spec (each
// a fresh child process — profiles never share a Kernel/Worker store), then
// folds the written results/<id>.json files into entries the caller can
// combine into a comparison matrix (see lib/report.js's writeComparisonMatrix).

const path = require('path')
const fs = require('fs')
const { spawnSync } = require('child_process')

const RUN_PROCESS = path.join(__dirname, '..', 'processes', 'run-process.js')
const RESULTS_DIR = path.join(__dirname, '..', 'results')

// `workers` carries every family running in this step at once ([{ type,
// model, devices, simulateMocks }, ...], one entry per config.workers
// entry) — passed as JSON since a combination step needs an arbitrary
// number of (type, model, deviceCount) triples, more than discrete CLI
// flags can name.
function runProfileProcess ({ id, workers }) {
  const args = ['--id', id, '--workers-json', JSON.stringify(workers)]

  console.log(`\n=== running profile ${id} ===`)
  const res = spawnSync(process.execPath, [RUN_PROCESS, ...args], { stdio: 'inherit' })
  return res.status === 0 || res.status === 1 // 1 == measured but red/failed thresholds; still a completed run
}

// `profiles` is an array or iterable (e.g. a generator, for an unbounded
// single-family sweep) of { id, workers, sweep? }. `resultsDir`/`runProfile`
// are injectable so tests can drive the loop without real profile runs.
function runSweep (sweepId, profiles, { stopOnFirstRed = false, resultsDir = RESULTS_DIR, runProfile = runProfileProcess } = {}) {
  const entries = []

  for (const p of profiles) {
    const ok = runProfile(p)
    if (!ok) {
      console.error(`profile ${p.id} did not complete — stopping sweep`)
      break
    }
    const jsonPath = path.join(resultsDir, `${p.id}.json`)
    if (!fs.existsSync(jsonPath)) {
      console.error(`no result written for ${p.id} — stopping sweep`)
      break
    }
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
    entries.push({ profile: data, verdict: data.verdict })
    if (stopOnFirstRed && data.verdict.overall === 'red') {
      console.log(`profile ${p.id} is red — stopping sweep at first failure (breaking point)`)
      break
    }
  }
  return entries
}

module.exports = { runProfileProcess, runSweep, RESULTS_DIR }
