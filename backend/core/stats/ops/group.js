'use strict'

const lUtils = require('./../utils')

function group (op, cur, entry, ext) {
  if (!cur) {
    cur = { res: lUtils.createResMap() }
  }

  if (!entry) {
    return cur
  }

  if (!op.src) {
    return cur
  }

  if (op.filter && !op.filter(entry)) {
    return cur
  }

  if (!op.group) {
    return cur
  }
  const groupName = op.group(entry, ext)

  if (!groupName || !lUtils.isSafeKey(groupName)) {
    return cur
  }

  cur.res[groupName] = lUtils.getVal(entry, op.src)

  return cur
}

function merge (op, a, b) {
  if (!a || !b) return a || b || group(op, undefined, null)

  const res = lUtils.createResMap()
  for (const side of [a.res, b.res]) {
    for (const key in side) {
      if (lUtils.isSafeKey(key)) res[key] = side[key]
    }
  }

  return { res }
}

module.exports = {
  calc: group,
  merge
}
