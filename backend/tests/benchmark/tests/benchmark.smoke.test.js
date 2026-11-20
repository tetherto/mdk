'use strict'

// Fast automated check that the benchmark harness itself works end to end:
// boots a tiny profile (5 devices / 1 worker) with mocks, Kernel, the
// Worker, and a Gateway each as their own OS process — same topology every
// profile run uses, just small — runs the measurement checklist, and
// asserts the numbers are sane. Not a capacity claim (see
// scenarios/benchmark.js and README.md for real sizing runs).

const test = require('brittle')

const { DEFAULT_WORKER_TYPE, DEFAULT_MODEL, RUN_REPRODUCIBILITY, THRESHOLDS } = require('../lib/constants')
const { runProfile } = require('../processes/run-process')
const { evaluateThresholds } = require('../lib/report')

// Small, fast overrides so this runs in seconds under `npm test` instead of
// the full config's real-world load durations (those are for scenarios/*.js).
const originalRR = { ...RUN_REPRODUCIBILITY }

// Booting 4 real OS processes (mocks/Kernel/Worker/Gateway) plus the
// gateway-request measurement loop runs ~25s even at these reduced
// durations — comfortably past brittle's 30s default under any load, so
// give it real headroom rather than risk flaking.
test('benchmark smoke: 5 devices / 1 worker boots and measures cleanly', { timeout: 60000 }, async (t) => {
  Object.assign(RUN_REPRODUCIBILITY, {
    n: 10,
    soakMs: 300,
    readLoadDurationMs: 500,
    readLoadConcurrency: 5,
    actionLoadDurationMs: 500,
    actionLoadRatePerSec: 5,
    // Failure drills (worker/Kernel restart, device outage) each add real
    // wall-clock time on top of an already-tight fast-path budget — a
    // separate concern from this test's "boots and measures cleanly"
    // scope. Covered by a real profile run instead (see README).
    runFailureDrills: false
  })
  t.teardown(() => Object.assign(RUN_REPRODUCIBILITY, originalRR))

  const result = await runProfile({
    profileId: 'smoke-test-inline',
    sweep: 'smoke',
    workers: [{ type: DEFAULT_WORKER_TYPE, model: DEFAULT_MODEL, devices: 5, simulateMocks: true }]
  })

  t.is(result.deviceCount, 5)
  t.is(result.workerCount, 1)
  t.is(result.mode, 'multi-process')
  t.alike(Object.keys(result.resourceSummary).sort(), ['gateway', 'kernel', 'mocks', 'worker-0'], 'mocks/kernel/worker/gateway were sampled as separate OS processes')
  t.ok(result.headroomRatio < THRESHOLDS.headroomAmberBelow, `headroom ${result.headroomRatio} should be well below the amber threshold at 5 devices`)
  t.is(result.throughput.rejected, 0, 'no rejected reads under smoke load')
  t.is(result.throughput.timedOut, 0, 'no timed-out reads under smoke load')
  t.is(result.actionLoad.rejected, 0, 'no rejected actions under smoke load')
  t.ok(result.latencies.telemetrySingle.n > 0, 'telemetry latency samples recorded')
  t.ok(Number.isFinite(result.latencies.telemetrySingle.p99Ms), 'telemetry p99 is a finite number')
  t.ok(Number.isFinite(result.latencies.actionSubmit.p99Ms), 'action submit p99 is a finite number')
  t.ok(result.latencies.gatewayRequest.n > 0, 'gateway request latency samples recorded')
  t.ok(Number.isFinite(result.latencies.gatewayRequest.p99Ms), 'gateway request p99 is a finite number')

  // The Avalon package is a WorkerRuntimeV2 plugin with no alerts service, so
  // ALERT_INDUCTION declares nothing for it and the alerts path is unmeasured.
  t.is(result.alerts.rulesCount, 0, 'no alert thresholds are induced for a V2 worker type')
  t.is(result.alerts.deviceCount, 5, 'alerts summary covers every device')
  t.is(result.failureBehaviour, null, 'failure drills were skipped for this fast run')

  const verdict = evaluateThresholds(result, THRESHOLDS)
  t.not(verdict.overall, 'red', `profile should not be red: ${JSON.stringify(verdict)}`)
})
