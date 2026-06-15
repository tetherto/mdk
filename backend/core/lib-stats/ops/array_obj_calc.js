'use strict'

const path = require('path')
const lUtils = require('../utils')

function arrayObjCalc (op, cur, entry, ext) {
  if (!cur) {
    cur = { res: {} }
  }

  if (!entry) {
    return cur
  }

  if (op.filter && !op.filter(entry)) {
    return cur
  }

  const arr = lUtils.getVal(entry, op.src)
  arr?.forEach(obj => {
    op.objOps.forEach(keyOp => {
      const val = lUtils.getVal(obj, keyOp.src)
      if (!val) return
      if (!cur.res[keyOp.src]) {
        cur.res[keyOp.src] = val
        return
      }

      const calcFn = require(path.join(__dirname, keyOp.op))
      const calcRes = calcFn.calc(keyOp, { res: cur.res[keyOp.src] }, obj)
      cur.res[keyOp.src] = calcRes.res
    })
  })

  return cur
}

module.exports = {
  calc: arrayObjCalc
}
