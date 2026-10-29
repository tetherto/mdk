'use strict'

const test = require('brittle')
const fs = require('fs')
const os = require('os')
const path = require('path')

const { THRESHOLDS } = require('../lib/constants')
const { evaluateThresholds, writeReport, buildComparisonMatrixMarkdown, writeComparisonMatrix } = require('../lib/report')
const { makeProfile, failureBehaviour, processSummary } = require('./fixtures/profile')

function tmpDir (t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-bench-report-'))
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))
  return dir
}

test('evaluateThresholds: a healthy profile is green on every criterion', (t) => {
  const verdict = evaluateThresholds(makeProfile(), THRESHOLDS)
  t.alike(verdict, {
    telemetryFreshness: 'green',
    actionSubmitP99: 'green',
    steadyCpu: 'green',
    rejectsPlusTimeouts: 'green',
    rssSlope: 'green',
    rssSlopeIndicative: true,
    overall: 'green'
  })
})

test('evaluateThresholds: headroom tiers green / amber / red / unmeasured', (t) => {
  t.is(evaluateThresholds(makeProfile({ headroomRatio: 0.69 }), THRESHOLDS).telemetryFreshness, 'green')
  t.is(evaluateThresholds(makeProfile({ headroomRatio: 0.8 }), THRESHOLDS).telemetryFreshness, 'amber')
  t.is(evaluateThresholds(makeProfile({ headroomRatio: 0.8 }), THRESHOLDS).overall, 'amber')
  t.is(evaluateThresholds(makeProfile({ headroomRatio: 1.0 }), THRESHOLDS).telemetryFreshness, 'red')
  t.is(evaluateThresholds(makeProfile({ headroomRatio: 1.0 }), THRESHOLDS).overall, 'red')
  const unmeasured = evaluateThresholds(makeProfile({ headroomRatio: null }), THRESHOLDS)
  t.is(unmeasured.telemetryFreshness, '_')
  t.is(unmeasured.overall, '_', 'an unmeasured criterion with nothing worse reads `_`')
})

test('evaluateThresholds: action submit p99 and steady CPU are binary', (t) => {
  const profile = makeProfile()
  profile.latencies.actionSubmit.p99Ms = THRESHOLDS.actionSubmitP99Ms + 1
  t.is(evaluateThresholds(profile, THRESHOLDS).actionSubmitP99, 'red')
  profile.latencies.actionSubmit.p99Ms = null
  t.is(evaluateThresholds(profile, THRESHOLDS).actionSubmitP99, '_')

  const busy = makeProfile()
  busy.resourceSummary.kernel = processSummary('kernel', { avgCpuPct: THRESHOLDS.steadyCpuPctOfOneCore + 1 })
  busy.resourceSummary.gateway = processSummary('gateway', { avgCpuPct: null })
  t.is(evaluateThresholds(busy, THRESHOLDS).steadyCpu, 'red', 'judged on the busiest process')
})

test('evaluateThresholds: rejects + timeouts scale amber/red with volume attempted', (t) => {
  const few = makeProfile({ throughput: { completed: 10000, rejected: 1, timedOut: 1, peakQueueDepth: 1, readsPerSec: 1 } })
  t.is(evaluateThresholds(few, THRESHOLDS).rejectsPlusTimeouts, 'amber')

  const many = makeProfile({
    throughput: { completed: 10, rejected: 0, timedOut: 0, peakQueueDepth: 1, readsPerSec: 1 },
    actionLoad: { completed: 10, rejected: 5, timedOut: 5, peakInFlight: 1, actionsPerSec: 1 }
  })
  t.is(evaluateThresholds(many, THRESHOLDS).rejectsPlusTimeouts, 'red')

  const noActions = makeProfile({ actionLoad: null, throughput: { completed: 0, rejected: 0, timedOut: 0, peakQueueDepth: 0, readsPerSec: 0 } })
  t.is(evaluateThresholds(noActions, THRESHOLDS).rejectsPlusTimeouts, 'green')

  const allFailed = makeProfile({ actionLoad: null, throughput: { completed: 0, rejected: 3, timedOut: 0, peakQueueDepth: 0, readsPerSec: 0 } })
  t.is(evaluateThresholds(allFailed, THRESHOLDS).rejectsPlusTimeouts, 'red')
})

test('evaluateThresholds: RSS slope red is demoted to amber below the 24h soak', (t) => {
  const steep = THRESHOLDS.rssSlopeFlatMiBPerHour * 2
  const short = makeProfile({ rssSlopeMiBPerHour: -steep })
  const shortVerdict = evaluateThresholds(short, THRESHOLDS)
  t.is(shortVerdict.rssSlope, 'amber')
  t.is(shortVerdict.rssSlopeIndicative, true)

  const long = makeProfile({ rssSlopeMiBPerHour: steep })
  long.runReproducibility.soakMs = long.runReproducibility.soakMinimumMsForGrowthClaims
  const longVerdict = evaluateThresholds(long, THRESHOLDS)
  t.is(longVerdict.rssSlope, 'red')
  t.is(longVerdict.rssSlopeIndicative, false)

  t.is(evaluateThresholds(makeProfile({ rssSlopeMiBPerHour: null }), THRESHOLDS).rssSlope, '_')
})

test('writeReport: writes JSON + template-shaped Markdown (drills skipped)', (t) => {
  const dir = tmpDir(t)
  const store = path.join(dir, 'store')
  fs.mkdirSync(path.join(store, 'nested'), { recursive: true })
  fs.writeFileSync(path.join(store, 'nested', 'data'), Buffer.alloc(2048))

  const profile = makeProfile({ storePath: store })
  profile.alerts.byName = { chips_temp_critical: 5 }
  const { jsonPath, mdPath, verdict } = writeReport(profile, { resultsDir: path.join(dir, 'results') })

  t.is(verdict.overall, 'green')
  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
  t.is(json.profileId, profile.profileId)
  t.alike(json.verdict, verdict)

  const md = fs.readFileSync(mdPath, 'utf8')
  for (const heading of [
    '# Capacity profile: cap-5devices-1workers',
    '## Reference hardware',
    '## Capacity profile',
    '### Run reproducibility',
    '## Resource metrics template',
    '### Site aggregate',
    '### Storage breakdown',
    '### Zero-device baseline and per-device marginal cost',
    '## Device baseline (MDK overhead)',
    '## Cycle headroom (devices per Worker signal)',
    '## Throughput under load',
    '## Latency metrics template',
    '## Pass / fail thresholds',
    '## Failure behaviour'
  ]) t.ok(md.includes(heading), heading)

  t.ok(md.includes('Skipped for this run'), 'drills reported as skipped')
  t.ok(md.includes('#### mdk-worker-avalon (a1346)'), 'worker process table labelled by type (model)')
  t.ok(md.includes('**indicative**'), 'short soak labelled indicative')
  t.ok(md.includes('Active alert names this run: chips_temp_critical (5).'))
  t.ok(md.includes('**Overall: GREEN**'))
})

test('writeReport: failure drills, unlabelled processes and unmatched config entries', (t) => {
  const dir = tmpDir(t)
  const profile = makeProfile({
    sweep: null,
    failureBehaviour: failureBehaviour(),
    deviceCount: 0,
    // Not in config.workers: its Max Device count column falls back to `_`.
    workersBreakdown: [{ workerId: 'bench-worker-0', type: 'mdk-worker-unknown', model: 'x1', deviceCount: 0 }]
  })
  profile.resourceSummary['worker-7'] = processSummary('worker-7', { rssSlopeMiBPerHour: null })
  profile.runReproducibility.soakMs = profile.runReproducibility.soakMinimumMsForGrowthClaims
  profile.timestamps.endUtc = profile.timestamps.startUtc

  const { mdPath } = writeReport(profile, { resultsDir: dir })
  const md = fs.readFileSync(mdPath, 'utf8')

  t.ok(md.includes('Sweep: _'), 'missing sweep renders as `_`')
  t.ok(md.includes('| mdk-worker-unknown (x1) | 0 | _ | simulated |'))
  t.ok(md.includes('#### worker-7'), 'a worker key with no breakdown entry keeps its raw label')
  t.ok(md.includes('worker-7: _'), 'a null slope renders as `_`')
  t.ok(md.includes('| Worker restart | Time to healthy / owning devices again | 3000 ms |'))
  t.ok(md.includes('| Kernel restart | Time to READY | 4000 ms |'))
  t.ok(md.includes('| Worker restart | Time to device reads served again | 3500 ms | from the kill; restored=true |'))
  t.ok(md.includes('| Kernel restart | Time to device reads served again | 6000 ms | from the kill; restored=true |'))
  t.ok(md.includes('| Unreachable device | Time until a read fails (measured) | 250 ms | from the kill; first failure `ERR_BENCH_SNAP_FAILED`, failed read took 2.0 ms'))
  t.ok(md.includes('| Unreachable device | Time until every channel fails (measured) | 5200 ms |'))
  t.ok(md.includes('| Unreachable device | Time to reads served again after the mocks return | 300 ms | recovered=true |'))
  t.absent(md.includes('Skipped for this run'))

  const neverFailed = makeProfile({ failureBehaviour: failureBehaviour() })
  Object.assign(neverFailed.failureBehaviour.unreachableDevice.measured, { detectedMs: null, failedReadMs: null, firstFailureCode: null, allChannelsFailedMs: null })
  neverFailed.failureBehaviour.kernelRestart = { recovered: true, ms: 4000, servingRestored: false, servingMs: null }
  const second = fs.readFileSync(writeReport(neverFailed, { resultsDir: dir }).mdPath, 'utf8')
  t.ok(second.includes('| Unreachable device | Time until a read fails (measured) | `_` | from the kill; first failure `_`'), 'a drill that never saw a failure renders `_`')
  t.ok(second.includes('| Kernel restart | Time to device reads served again | `_` | from the kill; restored=false |'))
})

test('buildComparisonMatrixMarkdown / writeComparisonMatrix: one row per profile', (t) => {
  const dir = tmpDir(t)
  const green = makeProfile()
  const red = makeProfile({ profileId: 'cap-50devices-1workers', headroomRatio: 2 })
  const entries = [
    { profile: green, verdict: evaluateThresholds(green, THRESHOLDS) },
    { profile: red, verdict: evaluateThresholds(red, THRESHOLDS) }
  ]

  const md = buildComparisonMatrixMarkdown(entries)
  const lines = md.trim().split('\n')
  t.is(lines.length, 4, 'header + separator + 2 rows')
  t.ok(lines[2].startsWith('| cap-5devices-1workers | unit | simulated |'))
  t.ok(lines[2].endsWith('| green |'))
  t.ok(lines[3].endsWith('| red |'))

  const mdPath = writeComparisonMatrix(entries, { resultsDir: path.join(dir, 'nested'), sweepId: 'unit' })
  t.is(path.basename(mdPath), 'sweep-unit-matrix.md')
  const written = fs.readFileSync(mdPath, 'utf8')
  t.ok(written.startsWith('# Sweep unit — profile comparison matrix'))
  t.ok(written.includes(md))
})
