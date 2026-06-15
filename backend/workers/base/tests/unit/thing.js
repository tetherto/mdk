'use strict'

const test = require('brittle')
const Thing = require('../../lib/thing')

class ConcreteThing extends Thing {
  constructor (type, opts, snapData = null, shouldThrow = false) {
    super(type, opts)
    this._snapData = snapData
    this._shouldThrow = shouldThrow
  }

  async _prepSnap () {
    if (this._shouldThrow) throw new Error(this._shouldThrow)
    return this._snapData
  }

  validateWriteAction () {
    return true
  }
}

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

test('Thing constructor sets defaults', (t) => {
  const thg = new ConcreteThing('miner', {})
  t.is(thg._type, 'miner')
  t.is(thg._lastSeen, null)
  t.alike(thg._errorLog, [])
  t.is(thg.lastSnap, null)
  t.is(thg.opts.lastSeenTimeout, 30000)
})

test('Thing constructor accepts custom lastSeenTimeout', (t) => {
  const thg = new ConcreteThing('miner', { lastSeenTimeout: 5000 })
  t.is(thg.opts.lastSeenTimeout, 5000)
})

test('Thing constructor merges conf.timeout into opts', (t) => {
  const thg = new ConcreteThing('miner', { conf: { timeout: 3000 } })
  t.is(thg.opts.timeout, 3000)
})

// ---------------------------------------------------------------------------
// updateLastSeen / isThingOnline
// ---------------------------------------------------------------------------

test('isThingOnline returns false when never seen', (t) => {
  const thg = new ConcreteThing('miner', {})
  t.absent(thg.isThingOnline())
})

test('isThingOnline returns true immediately after updateLastSeen', (t) => {
  const thg = new ConcreteThing('miner', { lastSeenTimeout: 30000 })
  thg.updateLastSeen()
  t.ok(thg.isThingOnline())
})

test('isThingOnline returns false after timeout has elapsed', async (t) => {
  const thg = new ConcreteThing('miner', { lastSeenTimeout: 1 })
  thg.updateLastSeen()
  await new Promise(resolve => setTimeout(resolve, 10))
  t.absent(thg.isThingOnline())
})

// ---------------------------------------------------------------------------
// validateWriteAction / _prepSnap — abstract method guards on base class
// ---------------------------------------------------------------------------

test('base Thing.validateWriteAction throws ERR_NO_IMPL', (t) => {
  const thg = new Thing('miner', {})
  t.exception(() => thg.validateWriteAction(), /ERR_NO_IMPL/)
})

test('base Thing._prepSnap throws ERR_NO_IMPL', async (t) => {
  const thg = new Thing('miner', {})
  await t.exception(thg._prepSnap.bind(thg), /ERR_NO_IMPL/)
})

// ---------------------------------------------------------------------------
// _handleErrorUpdates
// ---------------------------------------------------------------------------

test('_handleErrorUpdates replaces error log', (t) => {
  const thg = new ConcreteThing('miner', {})
  thg._handleErrorUpdates([{ code: 'E1' }])
  t.is(thg._errorLog.length, 1)
  thg._handleErrorUpdates([{ code: 'E2' }, { code: 'E3' }])
  t.is(thg._errorLog.length, 2)
  t.is(thg._errorLog[0].code, 'E2')
})

test('_handleErrorUpdates clears error log when passed empty array', (t) => {
  const thg = new ConcreteThing('miner', {})
  thg._handleErrorUpdates([{ code: 'E1' }])
  thg._handleErrorUpdates([])
  t.is(thg._errorLog.length, 0)
})

// ---------------------------------------------------------------------------
// getSnap — success path
// ---------------------------------------------------------------------------

test('getSnap returns structured success snap', async (t) => {
  const thg = new ConcreteThing('miner', {}, { stats: { status: 'ok' }, config: { freq: 650 } })
  const snap = await thg.getSnap()
  t.ok(snap.success)
  t.alike(snap.stats, { status: 'ok' })
  t.alike(snap.config, { freq: 650 })
  t.alike(snap.raw_errors, [])
})

test('getSnap includes raw_errors from errorLog', async (t) => {
  const thg = new ConcreteThing('miner', {}, { stats: {}, config: {} })
  thg._handleErrorUpdates([{ code: 'E1' }])
  const snap = await thg.getSnap()
  t.is(snap.raw_errors.length, 1)
})

test('getSnap stores result in lastSnap', async (t) => {
  const thg = new ConcreteThing('miner', {}, { stats: {}, config: {} })
  const snap = await thg.getSnap()
  t.is(thg.lastSnap, snap)
})

// ---------------------------------------------------------------------------
// getSnap — error paths
// ---------------------------------------------------------------------------

test('getSnap returns offline snap when thing is offline and _prepSnap throws', async (t) => {
  const thg = new ConcreteThing('miner', { lastSeenTimeout: 30000 }, null, 'ERR_OFFLINE')
  const snap = await thg.getSnap()
  t.absent(snap.success)
  t.is(snap.stats.status, 'offline')
})

test('getSnap returns error snap when thing is online and _prepSnap throws non-offline error', async (t) => {
  const thg = new ConcreteThing('miner', { lastSeenTimeout: 30000 }, null, 'ERR_SOMETHING_ELSE')
  thg.updateLastSeen()
  const snap = await thg.getSnap()
  t.absent(snap.success)
  t.is(snap.stats.status, 'error')
  t.ok(Array.isArray(snap.stats.errors))
})

test('getSnap returns offline snap when thing has never been seen and throws', async (t) => {
  const thg = new ConcreteThing('miner', {}, null, 'ERR_SOMETHING')
  const snap = await thg.getSnap()
  t.absent(snap.success)
  t.is(snap.stats.status, 'offline')
})

// ---------------------------------------------------------------------------
// getRealtimeData
// ---------------------------------------------------------------------------

test('getRealtimeData returns null before first getSnap', async (t) => {
  const thg = new ConcreteThing('miner', {}, { stats: {}, config: {} })
  t.is(await thg.getRealtimeData(), null)
})

test('getRealtimeData returns lastSnap after getSnap is called', async (t) => {
  const thg = new ConcreteThing('miner', {}, { stats: { status: 'ok' }, config: {} })
  await thg.getSnap()
  const rtd = await thg.getRealtimeData()
  t.ok(rtd.success)
})
