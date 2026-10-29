'use strict'

const test = require('brittle')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')

const { percentile, bytesToMiB, dirSizeBytes, ResourceSampler } = require('../lib/metrics')
const { LatencyRecorder } = require('../lib/latency')

test('percentile: nearest-rank over an ascending array', (t) => {
  t.is(percentile([], 50), null)
  t.is(percentile([7], 99), 7)
  const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  t.is(percentile(sorted, 50), 5)
  t.is(percentile(sorted, 95), 10)
  t.is(percentile(sorted, 0), 1, 'clamped to the first sample')
  t.is(percentile(sorted, 150), 10, 'clamped to the last sample')
})

test('bytesToMiB', (t) => {
  t.is(bytesToMiB(1024 * 1024 * 3), 3)
})

test('dirSizeBytes: sums a nested tree, 0 for a missing dir', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-bench-size-'))
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))
  fs.mkdirSync(path.join(dir, 'a', 'b'), { recursive: true })
  fs.writeFileSync(path.join(dir, 'top'), Buffer.alloc(100))
  fs.writeFileSync(path.join(dir, 'a', 'b', 'leaf'), Buffer.alloc(50))
  t.is(dirSizeBytes(dir), 150)
  t.is(dirSizeBytes(path.join(dir, 'missing')), 0)
})

test('LatencyRecorder: records successes, counts errors, summarises', async (t) => {
  const rec = new LatencyRecorder('op')
  t.alike(rec.summary(), { label: 'op', n: 0, errors: 0, p50Ms: null, p95Ms: null, p99Ms: null, maxMs: null })

  t.is(await rec.time(async () => 'value'), 'value')
  t.is(await rec.time(async () => { throw new Error('boom') }), undefined)
  rec.record(5)
  rec.recordError()

  const s = rec.summary()
  t.is(s.n, 2)
  t.is(s.errors, 2)
  t.is(s.maxMs, 5)
  t.ok(s.p50Ms >= 0)
})

test('ResourceSampler: requires a pid', (t) => {
  t.exception(() => new ResourceSampler(), /ERR_RESOURCE_SAMPLER_PID_REQUIRED/)
})

test('ResourceSampler: samples a live process by pid', async (t) => {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' })
  t.teardown(() => child.kill('SIGKILL'))
  await new Promise((resolve) => child.once('spawn', resolve))

  const sampler = new ResourceSampler({ pid: child.pid, intervalMs: 20, label: 'child' })
  t.is(sampler.start(), sampler)
  t.is(sampler.start(), sampler, 'start() is idempotent')
  await new Promise((resolve) => setTimeout(resolve, 150))
  sampler.sampleFdNow()
  sampler.stop()
  sampler.stop()

  const s = sampler.summary()
  t.is(s.label, 'child')
  t.is(s.mode, 'external-ps')
  t.ok(s.samples >= 2, `took ${s.samples} samples`)
  t.ok(s.avgRssMiB > 0)
  t.ok(s.peakRssMiB >= s.avgRssMiB)
  t.ok(Number.isFinite(s.rssSlopeMiBPerHour))
})

test('ResourceSampler: a pid that is gone yields an empty summary', async (t) => {
  // An exited child's pid: ps/lsof find nothing, and nothing throws.
  const child = spawn(process.execPath, ['-e', ''], { stdio: 'ignore' })
  await new Promise((resolve) => child.once('exit', resolve))
  const sampler = new ResourceSampler({ pid: child.pid })
  sampler.start().stop()
  const s = sampler.summary()
  t.is(s.samples, 0)
  t.is(s.avgCpuPct, null)
  t.is(s.rssSlopeMiBPerHour, null)
  t.is(s.fdSlopePerHour, null)
})

test('ResourceSampler: slopes skip the warmup window and need elapsed time', (t) => {
  const sampler = new ResourceSampler({ pid: 1, warmupMs: 1000 })
  sampler._startedAt = 0
  sampler.samples = [
    { t: 0, cpuPct: 1, rssMiB: 500 }, // inside warmup: ignored by the slope
    { t: 1000, cpuPct: 1, rssMiB: 100 },
    { t: 1000 + 3600000, cpuPct: 1, rssMiB: 110 }
  ]
  t.is(sampler.rssSlopeMiBPerHour(), 10)

  sampler.samples = [{ t: 1000, cpuPct: 1, rssMiB: 100 }]
  t.is(sampler.rssSlopeMiBPerHour(), null, 'one post-warmup sample has no slope')
  sampler.samples = [{ t: 1000, cpuPct: 1, rssMiB: 100 }, { t: 1000, cpuPct: 1, rssMiB: 120 }]
  t.is(sampler.rssSlopeMiBPerHour(), null, 'zero elapsed time has no slope')

  const noWarmup = new ResourceSampler({ pid: 1 })
  noWarmup.samples = [{ t: 0, cpuPct: 1, rssMiB: 100 }, { t: 1800000, cpuPct: 1, rssMiB: 105 }]
  t.is(noWarmup.rssSlopeMiBPerHour(), 10)

  noWarmup.fdSamples = [{ t: 0, fdCount: 10 }, { t: 0, fdCount: 12 }]
  t.is(noWarmup.fdSlopePerHour(), null, 'zero elapsed time has no fd slope')
  noWarmup.fdSamples = [{ t: 0, fdCount: 10 }, { t: 3600000, fdCount: 14 }]
  t.is(noWarmup.fdSlopePerHour(), 4)
})
