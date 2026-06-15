'use strict'

const lUtils = require('../utils')

function groupSum (op, cur, entry, ext) {
  if (!cur) {
    cur = { res: {} }
  }

  if (!entry) {
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

  if (!cur.res[groupName]) {
    cur.res[groupName] = 0
  }

  const val = lUtils.getVal(entry, op.src)

  cur.res[groupName] += val ? +val : 0

  return cur
}

module.exports = {
  calc: groupSum
}
