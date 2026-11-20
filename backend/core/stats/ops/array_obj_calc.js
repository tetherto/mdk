'use strict'

const lUtils = require('../utils')
const { getOp } = require('./index')

function arrayObjCalc (op, cur, entry, ext) {
  if (!cur) {
    cur = { res: lUtils.createResMap() }
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
      if (!lUtils.isSafeKey(keyOp.src)) return
      const val = lUtils.getVal(obj, keyOp.src)
      if (!val) return
      if (!cur.res[keyOp.src]) {
        cur.res[keyOp.src] = val
        return
      }

      const calcFn = getOp(keyOp.op)
      const calcRes = calcFn.calc(keyOp, { res: cur.res[keyOp.src] }, obj)
      cur.res[keyOp.src] = calcRes.res
    })
  })

  return cur
}

function merge (op, a, b) {
  if (!a || !b) return a || b || arrayObjCalc(op, undefined, null)

  const res = lUtils.createResMap()
  op.objOps.forEach(keyOp => {
    if (!lUtils.isSafeKey(keyOp.src)) return
    const av = a.res[keyOp.src]
    const bv = b.res[keyOp.src]
    if (av === undefined || bv === undefined) {
      if (av !== undefined || bv !== undefined) res[keyOp.src] = av ?? bv
      return
    }

    res[keyOp.src] = getOp(keyOp.op).merge(keyOp, { res: av }, { res: bv }).res
  })

  return { res }
}

module.exports = {
  calc: arrayObjCalc,
  merge
}
