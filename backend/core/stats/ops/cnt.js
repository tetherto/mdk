'use strict'

function cnt (op, cur, entry, ext) {
  if (!cur) {
    cur = { res: 0 }
  }

  if (op.filter && !op.filter(entry)) {
    return cur
  }

  cur.res++

  return cur
}

function merge (op, a, b) {
  // Not calc(op, undefined, null): cnt has no null-entry guard and would count it.
  if (!a || !b) return a || b || { res: 0 }

  return { res: a.res + b.res }
}

module.exports = {
  calc: cnt,
  merge
}
