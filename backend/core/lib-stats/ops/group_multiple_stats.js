'use strict'

const lUtils = require('../utils')

function groupMultipleStats (op, cur, entry, ext) {
  if (!cur) {
    cur = { res: {} }
  }

  if (!entry) {
    return cur
  }

  if (!op.srcs || !Array.isArray(op.srcs)) {
    return cur
  }

  if (op.filter && !op.filter(entry)) {
    return cur
  }

  if (!op.group) {
    return cur
  }
  const groupName = op.group(entry, ext)

  if (!groupName) {
    return cur
  }

  cur.res[groupName] = op.srcs.reduce(
    (prev, src) => ({ ...prev, [src.name]: lUtils.getVal(entry, src.src) }),
    {}
  )
  return cur
}

module.exports = {
  calc: groupMultipleStats
}
