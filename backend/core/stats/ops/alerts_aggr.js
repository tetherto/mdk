'use strict'

const lUtils = require('./../utils')

function alertsAggr (op, cur, entry, ext) {
  if (!cur) {
    cur = { res: lUtils.createResMap() }
  }

  if (!entry) {
    return cur
  }

  if (op.filter && !op.filter(entry)) {
    return cur
  }

  const groups = lUtils.getVal(entry, op.src)

  if (!groups) {
    return cur
  }

  Object.keys(groups).forEach(gk => {
    if (!lUtils.isSafeKey(gk)) return
    const gv = groups[gk]

    if (!cur.res[gk]) {
      cur.res[gk] = 0
    }

    cur.res[gk] += gv
  })

  return cur
}

module.exports = {
  calc: alertsAggr
}
