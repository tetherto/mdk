'use strict'

const lUtils = require('./../utils')

function avg (op, cur, entry, ext) {
  if (!cur) {
    cur = { acc: 0, cnt: 0, res: 0 }
  }

  if (!entry) {
    return cur
  }

  if (op.filter && !op.filter(entry)) {
    return cur
  }

  const val = lUtils.getVal(entry, op.src)

  cur.acc += val ? +val : 0

  cur.cnt++

  return cur
}

function tally (op, cur) {
  if (cur.cnt) {
    cur = {
      res: cur.acc / cur.cnt
    }
  } else {
    cur = { res: 0 }
  }

  return cur
}

module.exports = {
  calc: avg,
  tally
}
