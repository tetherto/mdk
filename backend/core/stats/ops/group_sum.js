'use strict'

const lUtils = require('../utils')

function groupSum (op, cur, entry, ext) {
  if (!cur) {
    cur = { res: lUtils.createResMap() }
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

  if (!groupName || !lUtils.isSafeKey(groupName)) {
    return cur
  }

  if (!cur.res[groupName]) {
    cur.res[groupName] = 0
  }

  const val = lUtils.getVal(entry, op.src)

  cur.res[groupName] += val ? +val : 0

  return cur
}

function merge (op, a, b) {
  if (!a || !b) return a || b || groupSum(op, undefined, null)

  const res = lUtils.createResMap()
  for (const key in a.res) {
    if (lUtils.isSafeKey(key)) res[key] = a.res[key]
  }
  for (const key in b.res) {
    if (!lUtils.isSafeKey(key)) continue
    res[key] = key in res ? res[key] + b.res[key] : b.res[key]
  }

  return { res }
}

module.exports = {
  calc: groupSum,
  merge
}
