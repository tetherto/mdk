'use strict'

// Fixed defaults for the benchmark harness — as opposed to
// config/benchmark.config.json, which is the file meant to be edited to size
// a run (hardware, workers, ceiling). Values here don't vary per
// run and rarely need editing — the one exception is
// RUN_REPRODUCIBILITY.soakMs, bumped for a real (>= 24h) growth/leak claim.

const path = require('path')

// Every worker family under backend/workers/miners, keyed by the package
// name (without the @tetherto/ scope) — the only `type` values a
// config.workers[] entry may use. Each mock exposes its own supported
// models (`TYPES`) and auth default (`extraCliOptions.password.default`),
// read here instead of duplicated in the benchmark config.
const WORKER_PACKAGES = {
  'mdk-worker-avalon': 'startAvalonWorker'
}

const WORKER_REGISTRY = Object.fromEntries(
  Object.entries(WORKER_PACKAGES).map(([type, startExport]) => {
    const pkg = `@tetherto/${type}`
    const worker = require(pkg)
    const mock = require(`${pkg}/mock/server`)
    return [type, {
      startWorker: worker[startExport],
      mock,
      models: mock.types,
      defaultPassword: mock.defaultPassword
    }]
  })
)

// Alert thresholds forced far outside any real reading, so the family's own
// temperature-warning alert always trips on the first completed snap cycle.
// devicePrefix mirrors each worker package's own `deviceType` build
// (`miner-${devicePrefix}-${model}`, see plugin/boot.js in each package) —
// AlertsService keys its config by that exact device-type string. This is
// the one intentional exception to bootWorker's "workers boot on their own
// package defaults" rule (see lib/site.js): alerts need *some* threshold
// policy to fire at all, and there's no sensible default that isn't itself
// a deliberate choice, unlike the cadence/timeout knobs that rule protects.
const ALERT_INDUCTION = {
  // chips_temp_critical reads snap.stats.temperature_c.chips[].avg, sourced
  // from data.estats.avg_chip_temperature in avalon.miner.js. With the
  // threshold forced below any reading it trips on every online device's
  // first completed snap (expect devicesWithAlerts === deviceCount).
  'mdk-worker-avalon': {
    devicePrefix: 'av',
    alerts: {
      chips_temp_critical: { params: { temp: -1000 } }
    }
  }
}

const DEFAULT_WORKER_TYPE = 'mdk-worker-avalon'
const DEFAULT_MODEL = 'a1346'

// This harness only ever runs mocks on loopback, differentiated by port —
// every device shares the same host, so duplicate-IP checks must stay off.
const ALLOW_DUPLICATE_IPS = true

const MOCK_PORT_RANGE = { min: 20000, max: 60000 }

// stats.service.js falls back to 500 internally when thing.thingRtdConcurrency
// is omitted; not part of WORKER_CONF_DEFAULTS, so mirrored here only for
// display/load-shape purposes — never passed to the worker itself.
const DEFAULT_THING_RTD_CONCURRENCY = 500

// Fixed harness topology — every profile boots on loopback, discovered
// locally (no DHT topic), namespaced under the same data root.
const HOST = '127.0.0.1'
const DISCOVERY = 'local'
const ROOT = '.mdk-data'

const KERNEL_DEFAULTS = {
  telemetryPullMs: 10000,
  healthPingMs: 5000,
  statePullMs: 20000,
  alertRulesCount: 0
}

// Benchmark-tuned cadence/timeout knobs — faster than mdk-core's own
// THING_CONF_DEFAULTS (backend/core/mdk/lib/worker-infra.js: 60000 /
// 300000 / 120000 / 25 for the four keys below) so a run produces enough
// snap cycles to measure without a real multi-minute soak. bootWorker
// (lib/site.js) passes this whole object as `conf.thing`, so it's both
// what actually boots and the input to reporting/derived math (e.g.
// headroomRatio) — the two must stay the same object, never drift apart.
const WORKER_CONF_DEFAULTS = {
  collectSnapsItvMs: 10000,
  rotateLogsItvMs: 60000,
  refreshLogsCacheItvMs: 30000,
  statsRtdItvMs: 5000,
  thingQueryConcurrency: 100,
  storeSnapItvMs: 20000,
  collectSnapTimeoutMs: 2000,
  logKeepCount: 3
}

// A Worker's per-device log cache (LogsService._logCache, backend/core/mdk)
// only gets a device's key once that device has taken its first snap
// (creates the log) *and* the next refreshLogsCache tick has run (loads it
// into the cache) — so the cache ramps from empty to ~deviceCount-proportional
// over roughly this long after boot. Used to warm up ResourceSampler's RSS
// slope (lib/metrics.js) past that ramp, so a bigger device count doesn't
// read as a bigger "leak" just because the cache took longer to fill.
const WORKER_LOG_CACHE_WARMUP_MS = WORKER_CONF_DEFAULTS.collectSnapsItvMs + WORKER_CONF_DEFAULTS.refreshLogsCacheItvMs

// Per-device RPC timeout the vendor-protocol layer actually waits on for a
// live device round trip (mdk-core's Thing base class: `conf.timeout ||
// 10000`, sourced from thing.miner.timeout — see
// backend/core/mdk/lib/things/thing.js). Deliberately separate from
// WORKER_CONF_DEFAULTS.collectSnapTimeoutMs above: that one only bounds
// SnapsService's periodic background collection cycle, never an on-demand
// pullTelemetry()/sendCommand() call, so it's the wrong number for anything
// describing a live request hanging against an unreachable device. bootWorker
// (lib/site.js) sets thing.miner.timeout to this value explicitly rather
// than leaving it to mdk-core's implicit fallback, and
// processes/run-process.js's device-outage drill uses the same constant for
// its analytical hung-device worst case — so the value that's actually
// applied and the value the report cites are always the same one.
const MINER_DEVICE_TIMEOUT_MS = 10000

// The one app every profile run mounts — generic across any
// device family (fans out mdkClient.listWorkers()/pullTelemetry, see its
// controller), so it never needs to vary per config.workers entry.
const GATEWAY_PLUGIN_DIR = path.join(__dirname, '..', 'plugin', 'fleet-summary')

const GATEWAY_DEFAULTS = {
  requestPath: '/api/fleet/summary',
  deviceTelemetryPath: (deviceId) => `/api/fleet/device/${deviceId}/telemetry`,
  deviceActionPath: (deviceId) => `/api/fleet/device/${deviceId}/action`,
  deviceAlertsPath: (deviceId) => `/api/fleet/device/${deviceId}/alerts`,
  // The Gateway's default rate limit (300 requests/min per client IP, see
  // backend/core/gateway/workers/lib/security.js) caps one client, not the
  // Gateway. This harness is a single loopback client driving deliberate
  // load, so the limiter would measure itself rather than the Gateway; it is
  // switched off here and the report says so.
  rateLimit: false,
  // Devices whose alerts are polled through the Gateway (spread evenly across
  // the fleet). Per-device HTTP polling of a whole large fleet once a second
  // would itself be the dominant Gateway load during the checklist.
  alertSampleSize: 50
}

// Run-reproducibility knobs: sample counts, soak duration, resource-sampling
// cadence, and read/action load shape — recorded verbatim into every
// report's "Run reproducibility" section. Bump soakMs here for a real (>=
// 24h) growth/leak claim; everything else is sized for fast sweeps/CI.
const RUN_REPRODUCIBILITY = {
  n: 1000,
  nMinimumRecommended: 100,
  soakMs: 60000,
  soakMinimumMsForGrowthClaims: 86400000, // 24h
  resourceSampleIntervalMs: 250,
  readLoadConcurrency: 1000,
  readLoadDurationMs: 3000,
  actionLoadRatePerSec: 1000,
  actionLoadDurationMs: 3000,
  actionType: 'setPowerMode',
  actionParams: { mode: 'normal' },
  // Failure behaviour drills (see runFailureDrills in processes/run-process.js)
  // — real kill+restart/outage induction, run once after the steady-state
  // checklist finishes. Off by default in fast paths (the smoke test
  // overrides this false) since each drill adds real wall-clock time.
  runFailureDrills: true,
  // Every drill deadline counts from the kill. A 5,000-device Worker has
  // taken about 13s to come back READY on a developer workstation.
  workerRestartTimeoutMs: 30000,
  kernelRestartTimeoutMs: 30000,
  // How long after a Worker or Kernel kill the drill keeps waiting for a
  // real device read to succeed again (READY is not the same as serving).
  restartServingTimeoutMs: 60000,
  // How long after the mocks are killed the outage drill keeps reading until
  // every channel fails (the cached channels need about 5s), and how long
  // after they restart it waits for a read to succeed again.
  outageDetectTimeoutMs: 30000,
  outageRecoveryTimeoutMs: 30000,
  recoveryPollIntervalMs: 250
}

// Pass/fail bars evaluateThresholds() (lib/report.js) judges a run against —
// headroom, action submit p99, steady CPU, rejects+timeouts, RSS slope.
const THRESHOLDS = {
  headroomGreenBelow: 0.7,
  headroomAmberBelow: 1.0,
  actionSubmitP99Ms: 2000,
  steadyCpuPctOfOneCore: 80,
  rejectPlusTimeoutMax: 0,
  // The template's own pass/fail table defines 3 tiers here (green `0`,
  // amber `< _`, red otherwise) — this is that amber ceiling. Scaled to the
  // volume actually attempted (reads + actions, across both the steady
  // single-request phase and the deliberately oversaturated read-load
  // phase — see RUN_REPRODUCIBILITY.readLoadConcurrency) rather than a
  // fixed count, so a run's tolerance for saturation-induced attrition
  // scales with how many requests it drove. 1% is a starting point for
  // "a few stragglers under deliberate overload", not "the system is
  // actually failing" — tune per site if it proves too loose/tight.
  rejectPlusTimeoutAmberPctOfAttempted: 0.01,
  // ResourceSampler.rssSlopeMiBPerHour() (lib/metrics.js) extrapolates the
  // post-warmup RSS delta up to a per-hour rate. Below the 24h soak minimum
  // this can never fail the run outright (evaluateThresholds demotes red to
  // amber whenever the soak is shorter than that — see isIndicativeSoak in
  // lib/report.js), so the number below only decides whether a short/CI
  // run's report reads amber or green; it isn't a leak-detection bar until a
  // real >= 24h soak is run.
  //
  // Calibrated empirically, not guessed: at RUN_REPRODUCIBILITY's own
  // defaults against the example config's 15-device profile, 3 independent
  // runs' post-warmup slope (after WORKER_LOG_CACHE_WARMUP_MS) peaked around
  // 5100-5510 MiB/h on the Kernel process and 3980-4160 MiB/h on a Worker —
  // real, legitimate growth from in-flight request/queue state under that
  // much concurrent load (peakQueueDepth reaches the full
  // readLoadConcurrency), not a leak. ~3x that observed ceiling, rounded, so
  // a normal load-driven run reads green/amber and amber still means
  // something rather than firing on every run.
  //
  // This number is a function of the run's total elapsed wall-clock time,
  // not just its load shape — the same absolute in-flight-state growth
  // extrapolates to a bigger MiB/h rate the shorter that window is (an
  // earlier version of this calibration, done before the sequential
  // telemetry-latency loop above was capped at Math.min(rr.n, 50), measured
  // ~1770-1970 MiB/h on Kernel over that longer ~400s window — same
  // underlying growth, ~3x smaller rate). Re-derive if RUN_REPRODUCIBILITY's
  // load knobs, the profile's device counts, or runChecklist's own control
  // flow (anything that changes how long a profile run actually takes)
  // change meaningfully.
  rssSlopeFlatMiBPerHour: 18000
}

module.exports = {
  WORKER_REGISTRY,
  ALERT_INDUCTION,
  DEFAULT_WORKER_TYPE,
  DEFAULT_MODEL,
  ALLOW_DUPLICATE_IPS,
  MOCK_PORT_RANGE,
  DEFAULT_THING_RTD_CONCURRENCY,
  WORKER_CONF_DEFAULTS,
  WORKER_LOG_CACHE_WARMUP_MS,
  MINER_DEVICE_TIMEOUT_MS,
  HOST,
  DISCOVERY,
  ROOT,
  KERNEL_DEFAULTS,
  GATEWAY_PLUGIN_DIR,
  GATEWAY_DEFAULTS,
  RUN_REPRODUCIBILITY,
  THRESHOLDS
}
