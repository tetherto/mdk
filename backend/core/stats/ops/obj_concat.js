'use strict'

const lUtils = require('../utils')

function objConcat (op, cur, entry, ext) {
  if (!cur) {
    cur = { res: lUtils.createResMap() }
  }

  if (!entry) {
    return cur
  }

  if (op.filter && !op.filter(entry)) {
    return cur
  }

  const val = lUtils.getVal(entry, op.src)
  for (const keys in val) {
    if (!lUtils.isSafeKey(keys)) continue
    if (!cur.res[keys]) {
      cur.res[keys] = val[keys]
    } else {
      cur.res[keys] += val[keys]
    }
  }

  return cur
}

function merge (op, a, b) {
  if (!a || !b) return a || b || objConcat(op, undefined, null)

  const res = lUtils.createResMap()
  for (const key in a.res) {
    if (lUtils.isSafeKey(key)) res[key] = a.res[key]
  }
  for (const key in b.res) {
    if (!lUtils.isSafeKey(key)) continue
    res[key] = res[key] ? res[key] + b.res[key] : b.res[key]
  }

  return { res }
}

module.exports = {
  calc: objConcat,
  merge
}
