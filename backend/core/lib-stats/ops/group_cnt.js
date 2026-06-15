'use strict'

function groupCnt (op, cur, entry, ext) {
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
    cur.res[groupName] = 0
  }

  cur.res[groupName]++

  return cur
}

module.exports = {
  calc: groupCnt
}
