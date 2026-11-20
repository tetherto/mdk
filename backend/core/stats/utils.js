'use strict'

// Keypaths are a small, fixed grammar — `a.b.c`, `a[0].b`, `a['k']` — walked
// segment by segment. They used to be compiled with `new Function`, which made
// any caller-influenced keypath arbitrary code; the walker below cannot do more
// than read properties, and refuses the prototype-reaching names outright.
const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype'])
const SEGMENT_RE = /^(?:\.?([A-Za-z_$][\w$]*)|\[(\d+)\]|\[(?:'([^'\\]*)'|"([^"\\]*)")\])/
const MAX_KEYPATH_LENGTH = 512
const MAX_CACHED_KEYPATHS = 1024

const _parsed = new Map()

function parseKeypath (keypath) {
  const cached = _parsed.get(keypath)
  if (cached) return cached

  if (keypath.length > MAX_KEYPATH_LENGTH) throw new Error('ERR_STATS_KEYPATH_INVALID: keypath too long')

  const segments = []
  let rest = keypath
  while (rest.length) {
    const m = SEGMENT_RE.exec(rest)
    // A leading `.` is only valid between segments, never first.
    if (!m || (segments.length === 0 && rest[0] === '.')) {
      throw new Error(`ERR_STATS_KEYPATH_INVALID: ${keypath}`)
    }
    const seg = m[1] ?? m[2] ?? m[3] ?? m[4]
    if (FORBIDDEN_SEGMENTS.has(seg)) {
      throw new Error(`ERR_STATS_KEYPATH_FORBIDDEN: ${keypath}`)
    }
    segments.push(seg)
    rest = rest.slice(m[0].length)
  }
  if (!segments.length) throw new Error(`ERR_STATS_KEYPATH_INVALID: ${keypath}`)

  if (_parsed.size >= MAX_CACHED_KEYPATHS) _parsed.clear()
  _parsed.set(keypath, segments)
  return segments
}

// Same semantics as the old compiled `root.<keypath>` inside try/catch: any
// missing (null/undefined) link yields undefined instead of throwing.
function pathResolve (keypath) {
  const segments = parseKeypath(keypath)
  return (root) => {
    let cur = root
    for (const seg of segments) {
      if (cur === null || cur === undefined) return undefined
      cur = cur[seg]
    }
    return cur
  }
}

function getVal (entry, src) {
  if (!src) {
    return null
  }

  if (typeof src === 'function') {
    return src(entry)
  }

  if (typeof src === 'string') {
    return pathResolve(src)(entry)
  }

  return null
}

// Result maps in the stats ops are keyed by data (device `info.container`,
// alert severities, snapshot object keys). They are created without a
// prototype and these names are skipped, so a hostile key can neither reach
// nor pollute Object.prototype.
function isSafeKey (key) {
  return typeof key !== 'symbol' && !FORBIDDEN_SEGMENTS.has(String(key))
}

function createResMap () {
  return Object.create(null)
}

const groupBy = (field) => {
  return (entry, ext) => {
    if (!ext) {
      return null
    }
    return getVal(ext, field)
  }
}

module.exports = {
  getVal,
  groupBy,
  parseKeypath,
  isSafeKey,
  createResMap
}
