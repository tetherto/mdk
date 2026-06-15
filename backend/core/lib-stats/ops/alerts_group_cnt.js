'use strict'

const lUtils = require('./../utils')

function alertsGroupCnt (op, cur, entry, ext) {
  if (!cur) {
    cur = { res: {} }
  }

  if (!entry) {
    return cur
  }

  if (op.filter && !op.filter(entry)) {
    return cur
  }

  const alerts = lUtils.getVal(entry, op.src)

  if (!alerts) {
    return cur
  }

  alerts.forEach(al => {
    if (!al.severity) {
      al.severity = 'medium'
    }

    if (!cur.res[al.severity]) {
      cur.res[al.severity] = 0
    }

    cur.res[al.severity]++
  })

  return cur
}

module.exports = {
  calc: alertsGroupCnt
}
