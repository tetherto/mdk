'use strict'

function cnt (op, cur, entry, ext) {
  if (!cur) {
    cur = { res: 0 }
  }

  if (op.filter && !op.filter(entry)) {
    return cur
  }

  cur.res++

  return cur
}

module.exports = {
  calc: cnt
}
