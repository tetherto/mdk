'use strict'

const fsp = require('fs').promises
const path = require('path')
const { promisify } = require('util')
const StoreFacility = require('@tetherto/hp-svc-facs-store')
const debug = require('debug')('mdk:worker:telemetry')
const { applyStats, tallyStats, mergeStats, getVal } = require('@tetherto/mdk-stats')
const { isSafeKey } = require('@tetherto/mdk-stats/utils')
const { publicError } = require('./public-error')

// The Worker Runtime's telemetry collector, in the order a point travels:
// sweep (one read of one device), store (the per-device series), poller (the
// repeating sweep), read (serving stored points), aggregate (fleet ops over
// the latest points) and rollup (retention).

// A stored metric value is either the reading or this marker for a failed one.
function _isError (value) {
  return Boolean(value) && typeof value === 'object' && typeof value.error === 'string'
}

// ---- sweep ----

/**
 * One telemetry sweep of one device: every distinct handler (by contract
 * `handler` path) is called once, and each metric declared against it is
 * extracted from the result by its `path` (no path: the whole result).
 *
 * Returns { metrics, answered, error }: `metrics` holds a value or `{ error }`
 * per declared metric, in contract order; `answered` says whether any handler
 * returned (the device-reachability signal); `error` is the first handler
 * failure. A path the result does not hold is a per-metric error only — the
 * device answered.
 */
async function sweep (ctx, entries, handlers, params) {
  const results = new Map()
  let answered = false
  let error = null

  for (const entry of entries || []) {
    if (results.has(entry.handler)) continue
    try {
      results.set(entry.handler, { value: await handlers.get(entry.name)(ctx, params) })
      answered = true
    } catch (err) {
      const failed = { error: publicError(err, 'ERR_TELEMETRY_FAILED') }
      results.set(entry.handler, failed)
      error = error || failed.error
    }
  }

  const metrics = {}
  for (const entry of entries || []) {
    const result = results.get(entry.handler)
    metrics[entry.name] = result.error ? result : (entry.path ? _extract(result.value, entry) : result.value)
  }
  return { metrics, answered, error }
}

function _extract (result, entry) {
  let value = result
  for (const segment of entry.path.split('.')) {
    if (value === null || typeof value !== 'object') return { error: `ERR_TELEMETRY_PATH_MISSING: ${entry.name}` }
    value = value[segment]
  }
  return value === undefined ? { error: `ERR_TELEMETRY_PATH_MISSING: ${entry.name}` } : value
}

// ---- store ----

const BEE_NAME = 'telemetry'
// Core user-data key holding the version clearUnlinked() has swept up to.
const CLEARED_KEY = 'mdk-telemetry-cleared'
const SEP = '\u0000'
// Zero-padded so lexicographic key order is chronological.
const TS_WIDTH = 13

/**
 * The per-device telemetry series: one `{ data, ts }` point per sweep, keyed
 * `<deviceId>\0<ts>` in one Hyperbee so a device's points are a key range.
 * A rolled-up point also carries `n`, the readings it stands for.
 *
 * openTelemetryStore({ store, storeDir }): `store` is a host-provided
 * hp-svc-facs-store facility (getBee) or Hyperbee (sub, where compact() is
 * the host's job), which close() leaves open;
 * without one the runtime starts its own facility under `storeDir` and stops
 * it on close(). ERR_TELEMETRY_STORE_REQUIRED with neither.
 */
async function openTelemetryStore (opts) {
  const { store, storeDir } = opts || {}
  let facility = null
  let bee
  let ownCore = true
  if (store && store.getBee) {
    bee = store.getBee({ name: BEE_NAME }, { keyEncoding: 'utf-8', valueEncoding: 'json' })
  } else if (store && store.sub) {
    // A sub shares the host's core: compaction would sweep the host's blocks
    // too and cannot find this sub's own, so the host owns reclamation.
    bee = store.sub(BEE_NAME, { keyEncoding: 'utf-8', valueEncoding: 'json' })
    ownCore = false
  } else if (storeDir) {
    facility = new StoreFacility({}, { storeDir }, {})
    await promisify(facility.start.bind(facility))()
    bee = facility.getBee({ name: BEE_NAME }, { keyEncoding: 'utf-8', valueEncoding: 'json' })
  } else {
    throw new Error('ERR_TELEMETRY_STORE_REQUIRED: pass opts.store, opts.telemetryStoreDir or opts.storeDir')
  }
  await bee.ready()
  debug('telemetry store open (%s)', facility ? storeDir : 'host store')

  return {
    bee,

    // meta: { n } marks a rolled point, { restored: true } a raw point a
    // restore put back; rollup leaves both alone.
    put (deviceId, ts, data, meta) {
      return bee.put(_key(deviceId, ts), { data, ts, ...meta })
    },

    async latest (deviceId) {
      const node = await bee.peek({ ..._span(deviceId, 0, Infinity), reverse: true })
      return node ? node.value : null
    },

    async range (deviceId, from, to) {
      const points = []
      for await (const { value } of bee.createReadStream(_span(deviceId, from, to))) points.push(value)
      return points
    },

    async del (deviceId, from, to) {
      const batch = bee.batch()
      for await (const { key } of bee.createReadStream(_span(deviceId, from, to))) await batch.del(key)
      await batch.flush()
    },

    // Clear a span and write one point in its place, in a single batch: a
    // rollup that deleted a bucket's raw points and then failed, or was
    // stopped, before writing their rolled replacement would lose the bucket
    // outright, and archiving is off by default so there would be nothing to
    // restore it from. The put follows the deletes within the batch, so a
    // replacement whose timestamp falls inside the span survives it.
    async replace (deviceId, from, to, ts, data, meta) {
      const batch = bee.batch()
      for await (const { key } of bee.createReadStream(_span(deviceId, from, to))) await batch.del(key)
      await batch.put(_key(deviceId, ts), { data, ts, ...meta })
      await batch.flush()
    },

    // Hyperbee is append-only: del() unlinks a block, this reclaims the
    // unlinked ones since the last pass (same checkpoint scheme as the
    // Kernel's store facility).
    async compact () {
      if (!ownCore) return
      const [from] = JSON.parse(await bee.core.getUserData(CLEARED_KEY) || '[0]')
      if (bee.version - 1 <= from) return
      const lt = await bee.clearUnlinked({ gte: from, lt: bee.version - 1 })
      await bee.core.setUserData(CLEARED_KEY, JSON.stringify([lt]))
    },

    async close () {
      await bee.close()
      if (!facility) return
      await promisify(facility.stop.bind(facility))()
      debug('telemetry store closed')
    }
  }
}

function _key (deviceId, ts) {
  return `${deviceId}${SEP}${String(ts).padStart(TS_WIDTH, '0')}`
}

function _span (deviceId, from, to) {
  return { gte: _key(deviceId, Math.max(0, from)), ...(to === Infinity ? { lt: `${deviceId}\u0001` } : { lte: _key(deviceId, to) }) }
}

// ---- poller ----

// A repeating job that never overlaps itself: start() runs it at once (unless
// `immediate` is false) and then on the interval, a run still in flight when
// the interval fires is left alone, a run that throws does not stop the job,
// and stop() resolves once the in-flight run (if any) has finished. A long
// run can check `stopped` to bail out early.
function createPoller (intervalMs, run, { immediate = true } = {}) {
  let timer = null
  let inFlight = null

  function tick () {
    if (inFlight) return
    inFlight = run().catch((err) => debug('poll failed: %s', err.message)).finally(() => { inFlight = null })
  }

  return {
    start () {
      if (timer) return
      timer = setInterval(tick, intervalMs)
      timer.unref()
      if (immediate) tick()
    },
    stop () {
      if (timer) clearInterval(timer)
      timer = null
      return inFlight || Promise.resolve()
    },
    get stopped () {
      return timer === null
    }
  }
}

// ---- read ----

const UNITS = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 }

// A sample step is a whole millisecond, and a range may ask for no more steps
// than this. Both bounds exist because `_sample` walks the range a step at a
// time: a fractional step smaller than the gap between two adjacent doubles at
// an epoch timestamp (about 0.000244ms near 2026) does not advance the cursor
// at all, and even a whole-millisecond step over a wide enough range runs for
// long enough to stall the Worker. Either one is reachable from a snapshot
// query, so neither may depend on the caller being reasonable.
const MIN_GRANULARITY_MS = 1
const MAX_SAMPLE_STEPS = 100000

/**
 * Reads of the stored series for a set of devices, served without a device
 * call. Without `from`: the latest point per device as
 * `{ ts, metrics: { name: { value } } }` (ts null, no metrics for a device
 * with no point yet), `snapshotTs` the newest point returned. With `from`
 * (and optional `to`, default now): every stored point in the range as
 * `{ ts, metrics: { name: { points: [{ ts, value }] } } }`, or with
 * `granularity` ('5s' | '1m' | '1h' | '1d' | ms) one reading per step — the
 * stored reading nearest to each sample time, earlier on a tie, never the
 * same reading twice. `metrics` narrows which names are returned. A metric
 * whose handler failed at that sweep is returned as its stored `{ error }`.
 * A point retention rolled up carries `n`, the readings it stands for.
 */
async function snapshot (store, deviceIds, query) {
  const wanted = Array.isArray(query.metrics) ? new Set(query.metrics) : null
  const range = _range(query)
  if (range && range.error) return range

  const devices = {}
  let snapshotTs = null
  for (const deviceId of deviceIds) {
    const points = range ? _sample(await store.range(deviceId, range.from, range.to), range) : [await store.latest(deviceId)].filter(Boolean)
    const last = points.length ? points[points.length - 1] : null
    devices[deviceId] = last ? { ts: last.ts, ..._rolled(last), metrics: range ? _series(points, wanted) : _latest(last.data, wanted) } : { ts: null, metrics: {} }
    if (last && (snapshotTs === null || last.ts > snapshotTs)) snapshotTs = last.ts
  }
  return { devices, snapshotTs, ...range }
}

function _range (query) {
  if (query.from === undefined) {
    return query.granularity === undefined ? null : { error: 'ERR_RANGE_INVALID: granularity needs from' }
  }
  const from = query.from
  const to = query.to === undefined ? Date.now() : query.to
  if (!Number.isFinite(from)) return { error: `ERR_RANGE_INVALID: from ${from}` }
  if (!Number.isFinite(to) || to < from) return { error: `ERR_RANGE_INVALID: to ${to} before from ${from}` }
  const granularity = query.granularity === undefined ? null : _granularityMs(query.granularity)
  if (granularity !== null && !(Number.isInteger(granularity) && granularity >= MIN_GRANULARITY_MS)) {
    return { error: `ERR_GRANULARITY_INVALID: ${query.granularity}` }
  }
  if (granularity !== null && Math.floor((to - from) / granularity) > MAX_SAMPLE_STEPS) {
    return { error: `ERR_GRANULARITY_TOO_FINE: ${query.granularity} over ${to - from}ms asks for more than ${MAX_SAMPLE_STEPS} steps` }
  }
  return { from, to, granularity }
}

function _granularityMs (granularity) {
  if (typeof granularity === 'number') return granularity
  const match = typeof granularity === 'string' && /^(\d+)(ms|s|m|h|d)$/.exec(granularity)
  return match ? Number(match[1]) * UNITS[match[2]] : NaN
}

// Nearest reading per sample step over ascending points; a reading nearer
// to several steps is returned once. The cursor is `from + step * granularity`
// rather than a running sum: a step too small to change a timestamp by
// addition would never end the loop, and this walk is reached from a client
// query. `_range` rejects such a step before we get here; counting steps means
// the loop cannot hang even if some other caller does not.
function _sample (points, { from, to, granularity }) {
  if (!granularity || !points.length) return points
  const sampled = []
  let i = 0
  const steps = Math.min(Math.floor((to - from) / granularity), MAX_SAMPLE_STEPS)
  for (let step = 0; step <= steps; step++) {
    const at = from + step * granularity
    while (i + 1 < points.length && points[i + 1].ts - at < at - points[i].ts) i++
    if (!sampled.length || sampled[sampled.length - 1] !== points[i]) sampled.push(points[i])
  }
  return sampled
}

function _latest (data, wanted) {
  const metrics = {}
  for (const [name, value] of Object.entries(data)) {
    if (!wanted || wanted.has(name)) metrics[name] = _mark(value)
  }
  return metrics
}

function _series (points, wanted) {
  const metrics = {}
  for (const point of points) {
    for (const [name, value] of Object.entries(point.data)) {
      if (wanted && !wanted.has(name)) continue
      if (!metrics[name]) metrics[name] = { points: [] }
      metrics[name].points.push({ ts: point.ts, ..._rolled(point), ..._mark(value) })
    }
  }
  return metrics
}

function _rolled (point) {
  return point.n ? { n: point.n } : {}
}

function _mark (value) {
  return _isError(value) ? value : { value }
}

// ---- aggregate ----

// Which ops a metric's declared type can support; `info.*` and `deviceId`
// sources are untyped and get the string set. Nested ops inside
// array_obj_calc / nested_obj_concat run over untyped members and only `sum`
// accumulates correctly there (lib-stats seeds the first member's raw value).
const OPS_BY_TYPE = {
  number: ['sum', 'avg', 'cnt', 'group', 'group_sum', 'group_avg', 'group_max', 'group_cnt', 'group_multiple_stats'],
  string: ['cnt', 'group_cnt', 'group', 'group_multiple_stats'],
  boolean: ['cnt', 'group_cnt', 'group', 'group_multiple_stats'],
  array: ['arr_concat', 'array_obj_calc'],
  object: ['obj_concat', 'nested_obj_concat']
}
const NESTED_OPS = ['sum']
const KNOWN_OPS = new Set(Object.values(OPS_BY_TYPE).flat())
const SRC_FREE_OPS = new Set(['cnt', 'group_cnt', 'group_multiple_stats'])
const SEGMENT = /^(?:[A-Za-z_$][\w$]*|0|[1-9]\d*)$/
const IS_TYPE = {
  number: Number.isFinite,
  string: (v) => typeof v === 'string',
  boolean: (v) => typeof v === 'boolean',
  array: Array.isArray,
  object: (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
}
const CACHE_MAX = 256

/**
 * Check an aggregate spec ({ name: { op, src?, group?, filter?, srcs?,
 * objOps?, nestedOps? } }) against the contract's telemetry entries and
 * return `{ state }`, the lib-stats state to run it with, or `{ error }`.
 * Sources are `metrics.<name>`, `info.<key>` (the device's info block, the
 * labels its host attached) or `deviceId`; `filter` is `{ src, eq }` with a
 * primitive `eq`. The device's config block is never a source: it is the
 * host's connection detail, credentials included. An op the
 * source's type cannot support is refused here (ERR_AGGREGATE_OP_TYPE),
 * never answered with a silently wrong number; a device whose value is
 * missing or not of the declared type is left out of that op.
 */
function validateOps (ops, telemetry) {
  if (!ops || typeof ops !== 'object' || Array.isArray(ops) || !Object.keys(ops).length) {
    return { error: 'ERR_AGGREGATE_SPEC_INVALID: ops must be a non-empty object' }
  }
  const types = new Map(telemetry.map((entry) => [entry.name, entry.type]))
  const state = { ops: {} }
  for (const [name, spec] of Object.entries(ops)) {
    if (!isSafeKey(name) || !spec || typeof spec !== 'object') return { error: `ERR_AGGREGATE_SPEC_INVALID: ${name}` }
    if (!KNOWN_OPS.has(spec.op)) return { error: `ERR_AGGREGATE_OP_UNKNOWN: ${name}: ${String(spec.op).slice(0, 64)}` }

    const compiled = { op: spec.op }
    let accepts = () => true
    if (!SRC_FREE_OPS.has(spec.op)) {
      const type = _srcType(types, spec.src)
      if (type === null) return { error: `ERR_AGGREGATE_SRC_UNKNOWN: ${name}: ${spec.src}` }
      if (!(OPS_BY_TYPE[type] || OPS_BY_TYPE.string).includes(spec.op)) return { error: `ERR_AGGREGATE_OP_TYPE: ${name}: ${spec.op} on ${type} ${spec.src}` }
      compiled.src = spec.src
      const isType = IS_TYPE[type] || ((v) => v !== undefined && v !== null)
      accepts = (entry) => isType(getVal(entry, spec.src))
    }
    if (spec.op.startsWith('group')) {
      if (_srcType(types, spec.group) === null) return { error: `ERR_AGGREGATE_GROUP_INVALID: ${name}: ${spec.group}` }
      // lib-stats drops falsy group keys, so false and 0 are grouped by name.
      compiled.group = (entry) => {
        const key = getVal(entry, spec.group)
        return key === undefined || key === null ? undefined : String(key)
      }
    }
    if (spec.op === 'group_multiple_stats') {
      if (!Array.isArray(spec.srcs) || !spec.srcs.length) return { error: `ERR_AGGREGATE_SPEC_INVALID: ${name}: srcs` }
      compiled.srcs = []
      for (const item of spec.srcs) {
        if (!item || typeof item.name !== 'string' || !isSafeKey(item.name)) return { error: `ERR_AGGREGATE_SPEC_INVALID: ${name}: srcs` }
        if (_srcType(types, item.src) === null) return { error: `ERR_AGGREGATE_SRC_UNKNOWN: ${name}: ${item.src}` }
        compiled.srcs.push({ name: item.name, src: item.src })
      }
    }
    for (const key of ['objOps', 'nestedOps']) {
      if ((spec.op === 'array_obj_calc' && key === 'objOps') || (spec.op === 'nested_obj_concat' && key === 'nestedOps')) {
        const nested = _nested(name, spec[key])
        if (nested.error) return nested
        compiled[key] = nested.items
      }
    }
    if (spec.filter !== undefined) {
      const filter = spec.filter
      if (!filter || typeof filter !== 'object' || _srcType(types, filter.src) === null || !_isPrimitive(filter.eq)) {
        return { error: `ERR_AGGREGATE_FILTER_INVALID: ${name}` }
      }
      const userFilter = accepts
      accepts = (entry) => userFilter(entry) && getVal(entry, filter.src) === filter.eq
    }
    compiled.filter = accepts
    state.ops[name] = compiled
  }
  return { state }
}

// The declared type of a source keypath, 'untyped' for info fields and
// deviceId, null when it names nothing the contract declares.
function _srcType (types, src) {
  if (typeof src !== 'string') return null
  if (src === 'deviceId') return 'untyped'
  const [root, ...rest] = src.split('.')
  if (!rest.length || !rest.every((segment) => SEGMENT.test(segment) && isSafeKey(segment))) return null
  if (root === 'info') return 'untyped'
  if (root === 'metrics' && rest.length === 1) return types.get(rest[0]) || null
  return null
}

function _nested (name, items) {
  if (!Array.isArray(items) || !items.length) return { error: `ERR_AGGREGATE_SPEC_INVALID: ${name}: nested ops` }
  const compiled = []
  for (const item of items) {
    if (!item || typeof item.src !== 'string' || !SEGMENT.test(item.src) || !isSafeKey(item.src)) return { error: `ERR_AGGREGATE_SPEC_INVALID: ${name}: nested src` }
    if (!NESTED_OPS.includes(item.op)) return { error: `ERR_AGGREGATE_OP_TYPE: ${name}: ${item.op} inside ${item.src}` }
    compiled.push({ src: item.src, op: item.op })
  }
  return { items: compiled }
}

function _isPrimitive (value) {
  return value === null || ['string', 'number', 'boolean'].includes(typeof value)
}

// The op input for one device from its stored point: errored metrics are
// dropped so an op's source filter leaves the device out of that op.
function toEntry (deviceId, data, info) {
  const metrics = {}
  for (const [name, value] of Object.entries(data)) {
    if (!_isError(value)) metrics[name] = value
  }
  return { deviceId, metrics, info: info || {} }
}

// Runs a validated state over the entries ({ deviceId, metrics, info }).
// `partial` is the pre-tally pack, what the Kernel merges across workers;
// `ops` is tallied from a merged copy so `partial` stays untouched.
function aggregate (state, entries) {
  const partial = {}
  for (const entry of entries) applyStats(state, partial, entry, entry)
  const ops = mergeStats(state, [partial])
  tallyStats(state, ops)
  return { ops, partial }
}

// Answers for an identical spec and device set within ttlMs, keyed by the
// JSON of both, until clear() (a sweep stored a point). An answer computed
// before a clear() is refused by set(): `gen` is read before the reads it
// is built from and handed back with it. Bounded: the oldest entry goes
// when CACHE_MAX is reached.
function createAggregateCache (ttlMs, now = Date.now) {
  const entries = new Map()
  let gen = 0
  return {
    get gen () {
      return gen
    },
    get (key) {
      const id = JSON.stringify(key)
      const hit = entries.get(id)
      if (!hit) return undefined
      if (now() - hit.at >= ttlMs) {
        entries.delete(id)
        return undefined
      }
      return hit.value
    },
    set (key, value, seenGen = gen) {
      if (seenGen !== gen) return
      if (entries.size >= CACHE_MAX) entries.delete(entries.keys().next().value)
      entries.set(JSON.stringify(key), { at: now(), value })
    },
    clear () {
      entries.clear()
      gen++
    }
  }
}

// ---- rollup ----

/**
 * One retention pass over the stored series: points older than
 * `retention.rawMs` are replaced by one point per closed
 * `retention.rollupIntervalMs` bucket (the mean for `number` metrics, the
 * last value otherwise; errored readings are skipped, and the last marker is
 * kept only when a bucket holds nothing else), points older than
 * `retention.keepMs` are deleted, and the blocks that frees are reclaimed.
 * A rolled point carries `n` (the points with a reading it stands for, or
 * every point when none had one) and is never rolled again. With an
 * `archive` (createArchive) a bucket's raw points are appended to it before
 * they are deleted. `cursors` (a Map the caller keeps across passes) records per device
 * how far rollup and expiry have already swept, so a pass only reads what
 * the last one left; the first pass after a restart scans everything.
 */
async function rollup (store, deviceIds, telemetry, retention, cursors, now = Date.now(), archive = null) {
  const numeric = new Set(telemetry.filter((entry) => entry.type === 'number').map((entry) => entry.name))
  const { rawMs, rollupIntervalMs, keepMs } = retention
  const rawBefore = now - rawMs
  const expireBefore = now - keepMs
  let rolled = 0

  for (const deviceId of deviceIds) {
    const cursor = cursors.get(deviceId) || { rolled: 0, expired: 0 }

    const buckets = new Map()
    for (const point of await store.range(deviceId, cursor.rolled, rawBefore)) {
      if (point.n || point.restored) continue
      const start = point.ts - (point.ts % rollupIntervalMs)
      if (start + rollupIntervalMs > rawBefore) break
      if (start < expireBefore) continue
      if (!buckets.has(start)) buckets.set(start, [])
      buckets.get(start).push(point)
    }
    // Every bucket is archived before any is deleted, so a crash between
    // the two loses nothing; one append per device keeps a day of backlog
    // at one open/fsync/close per day file instead of one per bucket.
    if (archive && buckets.size) await archive.append(deviceId, [...buckets.values()].flat())
    for (const [start, points] of buckets) {
      await store.replace(deviceId, start, start + rollupIntervalMs - 1, start, _fold(points, numeric), { n: _readings(points) || points.length })
      cursor.rolled = start + rollupIntervalMs
      rolled += points.length
    }

    if (expireBefore > cursor.expired) {
      await store.del(deviceId, cursor.expired, expireBefore - 1)
      cursor.expired = expireBefore
    }
    cursors.set(deviceId, cursor)
  }

  await store.compact()
  if (rolled) debug('rolled up %d points', rolled)
}

function _fold (points, numeric) {
  const data = {}
  const sums = {}
  for (const point of points) {
    for (const [name, value] of Object.entries(point.data)) {
      if (_isError(value)) {
        if (!(name in data) || _isError(data[name])) data[name] = value
        continue
      }
      if (numeric.has(name) && Number.isFinite(value)) {
        const sum = sums[name] || { total: 0, count: 0 }
        sum.total += value
        sum.count++
        sums[name] = sum
        data[name] = _mean(sum)
      } else {
        data[name] = value
      }
    }
  }
  return data
}

// A mean at 12 significant digits: enough for any metric a device reports,
// and free of the last-bit noise a float sum leaves (0.1 + 0.2).
function _mean ({ total, count }) {
  return Number((total / count).toPrecision(12))
}

function _readings (points) {
  return points.filter((point) => Object.values(point.data).some((value) => !_isError(value))).length
}

// ---- archive ----

const DAY_FILE = /^(\d{4}-\d{2}-\d{2})\.ndjson$/

/**
 * Cold storage for the raw points retention rolls up: append-only NDJSON
 * day files, `<dir>/<deviceId>/<YYYY-MM-DD>.ndjson` (the UTC day of the
 * point), one `{ ts, data }` per line, fsynced per append, so an operator
 * ships or prunes them with ordinary tooling. read() returns the points of
 * a range once each (a point archived twice, as after a restore and a
 * later rollup, counts once) in ts order, and skips a torn last line left
 * by a crash mid-append.
 */
function createArchive (dir) {
  // encodeURIComponent keeps '.', so '.' and '..' would resolve outside dir
  // (and a leading dot hides the folder): leading dots are encoded too.
  const deviceDir = (deviceId) => path.join(dir, encodeURIComponent(deviceId).replace(/^\.+/, (dots) => '%2E'.repeat(dots.length)))

  async function days (deviceId) {
    let names
    try {
      names = await fsp.readdir(deviceDir(deviceId))
    } catch (err) {
      if (err.code === 'ENOENT') return []
      throw err
    }
    const found = []
    for (const name of names.sort()) {
      const match = DAY_FILE.exec(name)
      if (!match) continue
      const { size } = await fsp.stat(path.join(deviceDir(deviceId), name))
      found.push({ day: match[1], bytes: size })
    }
    return found
  }

  return {
    dir,
    days,

    async append (deviceId, points) {
      const byDay = new Map()
      for (const point of points) {
        const day = _day(point.ts)
        if (!byDay.has(day)) byDay.set(day, [])
        byDay.get(day).push(JSON.stringify({ ts: point.ts, data: point.data }))
      }
      if (!byDay.size) return
      await fsp.mkdir(deviceDir(deviceId), { recursive: true })
      for (const [day, lines] of byDay) {
        const handle = await fsp.open(path.join(deviceDir(deviceId), `${day}.ndjson`), 'a')
        try {
          await handle.write(lines.join('\n') + '\n')
          await handle.sync()
        } finally {
          await handle.close()
        }
      }
      debug('archived %d points for %s', points.length, deviceId)
    },

    async read (deviceId, from, to) {
      const first = _day(from)
      const last = _day(to)
      const points = new Map()
      for (const { day } of await days(deviceId)) {
        if (day < first || day > last) continue
        const text = await fsp.readFile(path.join(deviceDir(deviceId), `${day}.ndjson`), 'utf8')
        for (const line of text.split('\n')) {
          if (!line) continue
          let point
          try {
            point = JSON.parse(line)
          } catch {
            continue
          }
          if (!Number.isInteger(point.ts) || point.ts < from || point.ts > to) continue
          if (!point.data || typeof point.data !== 'object') continue
          points.set(point.ts, { ts: point.ts, data: point.data })
        }
      }
      return [...points.values()].sort((a, b) => a.ts - b.ts)
    }
  }
}

function _day (ts) {
  return new Date(ts).toISOString().slice(0, 10)
}

module.exports = { sweep, openTelemetryStore, createPoller, snapshot, validateOps, aggregate, toEntry, createAggregateCache, OPS_BY_TYPE, rollup, createArchive }
