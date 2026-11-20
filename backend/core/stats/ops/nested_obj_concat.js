'use strict'

const lUtils = require('../utils')
const { getOp } = require('./index')

function nestedObjConcat (op, cur, entry, ext) {
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
      const currObj = cur.res[keys]
      const newObj = val[keys]
      if (typeof newObj === 'object' && op.nestedOps) {
        concatNestedObj(currObj, newObj, op.nestedOps)
      }
    }
  }

  return cur
}

const concatNestedObj = (currObj, newObj, ops) => {
  if (!currObj || typeof currObj !== 'object') return
  for (const key in newObj) {
    if (!lUtils.isSafeKey(key)) continue
    const keyOp = ops.find(v => v.src === key)
    if (keyOp) {
      const calcFn = getOp(keyOp.op)
      const calcRes = calcFn.calc(keyOp, currObj[key] && { res: currObj[key] }, newObj)
      currObj[key] = calcRes.res
    }
    if (typeof newObj[key] === 'object' && !Array.isArray(newObj[key])) {
      concatNestedObj(currObj[key], newObj[key], ops)
    }
  }
}

// Accumulated values are the entries' own objects and the walk mutates them
// in place, so the left side is copied before the right side is folded in.
function cloneNested (val) {
  if (Array.isArray(val)) return val.map(cloneNested)
  if (!val || typeof val !== 'object') return val
  const out = {}
  for (const key in val) {
    if (lUtils.isSafeKey(key)) out[key] = cloneNested(val[key])
  }
  return out
}

function merge (op, a, b) {
  if (!a || !b) return a || b || nestedObjConcat(op, undefined, null)

  const res = lUtils.createResMap()
  for (const key in a.res) {
    if (lUtils.isSafeKey(key)) res[key] = cloneNested(a.res[key])
  }
  for (const key in b.res) {
    if (!lUtils.isSafeKey(key)) continue
    if (!res[key]) {
      res[key] = cloneNested(b.res[key])
    } else if (typeof b.res[key] === 'object' && op.nestedOps) {
      concatNestedObj(res[key], b.res[key], op.nestedOps)
    }
  }

  return { res }
}

module.exports = {
  calc: nestedObjConcat,
  merge
}
