'use strict'

const test = require('brittle')
const path = require('path')
const { getVal, groupBy, parseKeypath } = require('../../utils')

// The pre-walker implementation, kept here only as the reference the walker
// must match for every keypath the shipped templates use.
function legacyGetVal (entry, keypath) {
  // eslint-disable-next-line no-new-func
  return new Function('root', `try { return root.${keypath}; } catch(e){ return undefined; }`)(entry)
}

// Keypaths passed to groupBy() in the templates (closures, so not
// discoverable by walking the specs below).
const GROUP_BY_KEYPATHS = [
  'info.container',
  'info.location',
  'info.pos',
  'info.status',
  'type'
]

const TEMPLATE_FILES = [
  '../../../mdk/lib/templates/stats.js',
  '../../../../workers/containers/bitdeer/lib/templates/stats.js',
  '../../../../workers/containers/antspace/lib/templates/stats.js',
  '../../../../workers/temperature/seneca/lib/templates/stats.js'
]

function collectSrcKeypaths (node, out = new Set(), seen = new Set()) {
  if (!node || typeof node !== 'object' || seen.has(node)) return out
  seen.add(node)
  for (const [k, v] of Object.entries(node)) {
    if (k === 'src' && typeof v === 'string') out.add(v)
    else collectSrcKeypaths(v, out, seen)
  }
  return out
}

function templateKeypaths () {
  const keypaths = new Set(GROUP_BY_KEYPATHS)
  for (const rel of TEMPLATE_FILES) {
    const tpl = require(path.join(__dirname, rel))
    collectSrcKeypaths(tpl.specs, keypaths)
  }
  return [...keypaths]
}

// Build an entry where every keypath resolves to a distinct value.
function buildEntry (keypaths) {
  const root = {}
  keypaths.forEach((kp, i) => {
    const segs = parseKeypath(kp)
    let cur = root
    segs.forEach((seg, j) => {
      if (j === segs.length - 1) {
        cur[seg] = `v${i}`
        return
      }
      if (cur[seg] === undefined || typeof cur[seg] !== 'object') {
        cur[seg] = /^\d+$/.test(segs[j + 1]) ? [] : {}
      }
      cur = cur[seg]
    })
  })
  return root
}

test('getVal matches the legacy resolver for every template keypath', (t) => {
  const keypaths = templateKeypaths()
  t.ok(keypaths.length > 20, `collected ${keypaths.length} keypaths`)
  t.ok(keypaths.some((kp) => kp.includes('[0]')), 'covers indexed keypaths')

  const full = buildEntry(keypaths)
  const fixtures = [full, {}, { last: null }, { last: { snap: {} } }, { info: 'x' }]
  for (const kp of keypaths) {
    for (const entry of fixtures) {
      t.alike(getVal(entry, kp), legacyGetVal(entry, kp), `${kp}`)
    }
  }
})

test('getVal keeps the null/function/undefined-root behaviour', (t) => {
  t.is(getVal({ a: 1 }, ''), null)
  t.is(getVal({ a: 1 }, null), null)
  t.is(getVal({ a: 1 }, 42), null)
  t.is(getVal({ a: 2 }, (e) => e.a * 2), 4)
  t.is(getVal(undefined, 'a.b'), undefined)
  t.is(getVal(null, 'a'), undefined)
  t.is(getVal({ a: { b: 0 } }, 'a.b'), 0)
  t.is(getVal({ a: 'str' }, 'a.length'), 3)
  t.is(getVal({ a: [{ b: 5 }] }, 'a[0].b'), 5)
  t.is(getVal({ a: { 'x-y': 7 } }, "a['x-y']"), 7)
  t.is(getVal({ a: { k: 8 } }, 'a["k"]'), 8)
})

test('getVal refuses prototype-reaching segments', (t) => {
  for (const kp of ['__proto__', 'a.__proto__', 'constructor', 'a.constructor.prototype', "a['__proto__']", 'a["constructor"]']) {
    t.exception(() => getVal({ a: {} }, kp), /ERR_STATS_KEYPATH_FORBIDDEN/, kp)
  }
})

test('getVal rejects keypaths outside the grammar instead of evaluating them', (t) => {
  const bad = [
    '.a',
    'a..b',
    'a.0',
    'a;process.exit(1)',
    'a.b()',
    'a[b]',
    'a[0',
    'constructor.constructor("return process")()',
    'a b',
    'x'.repeat(600)
  ]
  for (const kp of bad) {
    t.exception(() => getVal({}, kp), /ERR_STATS_KEYPATH_(INVALID|FORBIDDEN)/, kp.slice(0, 40))
  }
})

test('groupBy resolves against ext and returns null without ext', (t) => {
  const fn = groupBy('info.container')
  t.is(fn({}, { info: { container: 'c1' } }), 'c1')
  t.is(fn({}, null), null)
  t.exception(() => groupBy('__proto__')({}, {}), /ERR_STATS_KEYPATH_FORBIDDEN/)
})
