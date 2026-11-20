'use strict'

const lUtils = require('./../utils')

function arrConcat (op, cur, entry, ext) {
  if (!cur) {
    cur = { res: [] }
  }

  if (!entry) {
    return cur
  }

  if (op.filter && !op.filter(entry)) {
    return cur
  }

  const val = lUtils.getVal(entry, op.src)

  if (val !== null && val !== undefined) cur.res = cur.res.concat(val)

  return cur
}

function merge (op, a, b) {
  if (!a || !b) return a || b || arrConcat(op, undefined, null)

  return { res: a.res.concat(b.res) }
}

module.exports = {
  calc: arrConcat,
  merge
}
