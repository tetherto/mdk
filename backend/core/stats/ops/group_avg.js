'use strict'

const lUtils = require('../utils')

function groupAvg (op, cur, entry, ext) {
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
    cur.res[groupName] = { acc: 0, cnt: 0, res: 0 }
  }

  const val = lUtils.getVal(entry, op.src)

  cur.res[groupName].acc += val ? +val : 0
  cur.res[groupName].cnt++

  return cur
}

function tally (op, cur) {
  for (const key in cur.res) {
    if (cur.res[key].cnt) {
      cur.res[key] = cur.res[key].acc / cur.res[key].cnt
    } else {
      cur.res[key] = null
    }
  }
  return cur
}

function merge (op, a, b) {
  if (!a || !b) return a || b || groupAvg(op, undefined, null)

  const res = lUtils.createResMap()
  for (const key in a.res) {
    if (lUtils.isSafeKey(key)) res[key] = { acc: a.res[key].acc, cnt: a.res[key].cnt, res: 0 }
  }
  for (const key in b.res) {
    if (!lUtils.isSafeKey(key)) continue
    const prev = res[key] || { acc: 0, cnt: 0 }
    res[key] = { acc: prev.acc + b.res[key].acc, cnt: prev.cnt + b.res[key].cnt, res: 0 }
  }

  return { res }
}

module.exports = {
  calc: groupAvg,
  tally,
  merge
}
