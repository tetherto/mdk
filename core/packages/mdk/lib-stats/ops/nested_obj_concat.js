'use strict'

const path = require('path')
const lUtils = require('../utils')

function nestedObjConcat (op, cur, entry, ext) {
  if (!cur) {
    cur = { res: {} }
  }

  if (!entry) {
    return cur
  }

  if (op.filter && !op.filter(entry)) {
    return cur
  }

  const val = lUtils.getVal(entry, op.src)
  for (const keys in val) {
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
  for (const key in newObj) {
    const keyOp = ops.find(v => v.src === key)
    if (keyOp) {
      const calcFn = require(path.join(__dirname, keyOp.op))
      const calcRes = calcFn.calc(keyOp, currObj[key] && { res: currObj[key] }, newObj)
      currObj[key] = calcRes.res
    }
    if (typeof newObj[key] === 'object' && !Array.isArray(newObj[key])) {
      concatNestedObj(currObj[key], newObj[key], ops)
    }
  }
}

module.exports = {
  calc: nestedObjConcat
}
