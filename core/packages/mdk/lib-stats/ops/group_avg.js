'use strict'

const lUtils = require('../utils')

function groupAvg (op, cur, entry, ext) {
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

module.exports = {
  calc: groupAvg,
  tally
}
