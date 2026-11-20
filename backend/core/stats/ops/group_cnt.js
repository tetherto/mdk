'use strict'

const lUtils = require('../utils')

function groupCnt (op, cur, entry, ext) {
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

  cur.res[groupName]++

  return cur
}

function merge (op, a, b) {
  if (!a || !b) return a || b || groupCnt(op, undefined, null)

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
  calc: groupCnt,
  merge
}
