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

module.exports = {
  calc: arrConcat
}
