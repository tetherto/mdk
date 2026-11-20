'use strict'

const lUtils = require('./../utils')

function sum (op, cur, entry, ext) {
  if (!cur) {
    cur = { res: 0 }
  }

  if (!entry) {
    return cur
  }

  if (op.filter && !op.filter(entry, ext)) {
    return cur
  }

  const val = lUtils.getVal(entry, op.src)

  cur.res += val ? +val : 0

  return cur
}

function merge (op, a, b) {
  if (!a || !b) return a || b || sum(op, undefined, null)

  return { res: a.res + b.res }
}

module.exports = {
  calc: sum,
  merge
}
