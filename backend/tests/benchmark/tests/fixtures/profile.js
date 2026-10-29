'use strict'

// A complete profile in the shape runChecklist (processes/run-process.js)
// returns, with numbers chosen so every threshold reads green. Tests override
// the fields they care about.

const { RUN_REPRODUCIBILITY, THRESHOLDS, DEFAULT_WORKER_TYPE, DEFAULT_MODEL } = require('../../lib/constants')

function latency (label, p99Ms = 10) {
  return { label, n: 50, errors: 0, p50Ms: p99Ms / 2, p95Ms: p99Ms * 0.9, p99Ms, maxMs: p99Ms * 1.2 }
}

function processSummary (label, overrides = {}) {
  return {
    label,
    mode: 'external-ps',
    samples: 10,
    avgCpuPct: 5,
    peakCpuPct: 20,
    avgRssMiB: 100,
    peakRssMiB: 120,
    firstRssMiB: 90,
    lastRssMiB: 110,
    rssSlopeMiBPerHour: 12,
    fdCountFirst: 30,
    fdCountLast: 31,
    fdSlopePerHour: 1,
    ...overrides
  }
}

function makeProfile ({ storePath = '/nonexistent/bench-store', ...overrides } = {}) {
  const startUtc = '2026-10-22T00:00:00.000Z'
  const endUtc = '2026-10-22T01:00:00.000Z'
  return {
    profileId: 'cap-5devices-1workers',
    sweep: 'unit',
    mode: 'multi-process',
    deviceCount: 5,
    workerCount: 1,
    workersBreakdown: [{ workerId: 'bench-worker-0', type: DEFAULT_WORKER_TYPE, model: DEFAULT_MODEL, deviceCount: 5 }],
    storePaths: {
      kernelStore: '/nonexistent/kernel-db',
      workerStores: [{ workerId: 'bench-worker-0', type: DEFAULT_WORKER_TYPE, model: DEFAULT_MODEL, path: storePath, startSizeBytes: 0 }],
      gatewayStore: '/nonexistent/gateway'
    },
    configArtifact: { path: 'config/benchmark.config.json', hash: 'abcdef012345' },
    hardware: {
      referenceTier: 'unit',
      cpuModel: 'test-cpu',
      cpuCoresPhysical: 4,
      cpuCoresLogical: 8,
      ramGiB: 16,
      diskType: 'SSD',
      diskSizeGiB: 256,
      os: 'test-os',
      nodeVersion: '24',
      mdkVersion: 'test',
      networkPath: 'loopback',
      notes: '-'
    },
    operatingParameters: {
      kernelTelemetryPullMs: 10000,
      kernelHealthPingMs: 5000,
      kernelStatePullMs: 20000,
      workerCollectSnapsItvMs: 10000,
      workerStoreSnapItvMs: 20000,
      workerConcurrency: 500,
      deviceRequestTimeoutMs: 10000,
      collectSnapTimeoutMs: 2000,
      alertRulesCount: 1
    },
    runReproducibility: { ...RUN_REPRODUCIBILITY },
    timestamps: { startUtc, endUtc },
    resourceSummary: {
      mocks: processSummary('mocks'),
      kernel: processSummary('kernel'),
      gateway: processSummary('gateway'),
      'worker-0': processSummary('worker-0')
    },
    rssSlopeMiBPerHour: 12,
    deviceBaseline: latency('deviceBaseline', 1),
    cycleHeadroomByWorker: {},
    cycleHeadroomWorst: { workerId: 'bench-worker-0', deviceCount: 5, avgCycleMs: 100, maxCycleMs: 150, rejected: 0, timedOut: 0 },
    headroomRatio: 0.01,
    throughput: { completed: 1000, rejected: 0, timedOut: 0, peakQueueDepth: 10, readsPerSec: 333 },
    actionLoad: { completed: 300, rejected: 0, timedOut: 0, peakInFlight: 5, actionsPerSec: 100 },
    alerts: { rulesCount: 1, devicesWithAlerts: 0, deviceCount: 5, byName: {}, visibleViaKernel: latency('alertVisibleViaKernel'), visibleViaGateway: latency('alertVisibleViaGateway') },
    latencies: {
      telemetrySingle: latency('telemetrySingle'),
      readLoadSaturation: latency('readLoadSaturation'),
      status: latency('status'),
      actionSubmit: latency('actionSubmit'),
      gatewayRequest: latency('gatewayRequest'),
      gatewayTelemetrySingle: latency('gatewayTelemetrySingle'),
      gatewayActionSubmit: latency('gatewayActionSubmit'),
      alertVisibleViaKernel: latency('alertVisibleViaKernel'),
      alertVisibleViaGateway: latency('alertVisibleViaGateway')
    },
    thresholds: { ...THRESHOLDS },
    failureBehaviour: null,
    zeroDeviceBaseline: {
      resourceSummary: {
        kernel: processSummary('kernel', { avgCpuPct: 1, avgRssMiB: 80 }),
        gateway: processSummary('gateway', { avgCpuPct: 1, avgRssMiB: 80 }),
        'worker-0': processSummary('worker-0', { avgCpuPct: 1, avgRssMiB: 80 })
      }
    },
    ...overrides
  }
}

function failureBehaviour (overrides = {}) {
  return {
    workerRestart: { workerId: 'bench-worker-0', deviceCount: 5, recovered: true, ms: 3000, servingRestored: true, servingMs: 3500 },
    kernelRestart: { recovered: true, ms: 4000, servingRestored: true, servingMs: 6000 },
    unreachableDevice: {
      scope: 'all devices',
      unreachableCount: 5,
      timeoutBudgetMs: 10000,
      concurrency: 500,
      analyticalEffectMs: 10000,
      measured: { baselineMs: 1, baselineFailed: false, detectedMs: 250, failedReadMs: 2, firstFailureCode: 'ERR_BENCH_SNAP_FAILED', allChannelsFailedMs: 5200, recovered: true, recoveredMs: 300 }
    },
    ...overrides
  }
}

module.exports = { makeProfile, failureBehaviour, processSummary, latency }
