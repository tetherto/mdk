'use strict'

const { getVal, groupBy } = require('./utils')
const { getOp } = require('./ops')

function applyStats (state, pack, entry, ext) {
  const opKeys = Object.keys(state.ops)

  opKeys.forEach(ok => {
    const op = state.ops[ok]

    const met = getOp(op.op)

    if (!met.calc) {
      return
    }

    pack[ok] = met.calc(op, pack[ok], entry, ext)
  })
}

function tallyStats (state, pack) {
  const opKeys = Object.keys(state.ops)

  opKeys.forEach(ok => {
    const op = state.ops[ok]

    const met = getOp(op.op)

    if (!pack[ok]) {
      return
    }

    if (met.tally) {
      pack[ok] = met.tally(op, pack[ok])
    }

    pack[ok] = pack[ok].res
  })
}

// `packs` are the partial packs of every collector that answered; the
// caller drops non-responders, so each one is an object (possibly `{}`).
function mergeStats (state, packs) {
  const opKeys = Object.keys(state.ops)
  const pack = {}

  opKeys.forEach(ok => {
    const op = state.ops[ok]

    const met = getOp(op.op)

    if (!met.merge) {
      throw new Error(`ERR_STATS_OP_NOT_MERGEABLE: ${op.op}`)
    }

    pack[ok] = packs.reduce((acc, partial) => met.merge(op, acc, partial[ok]), met.merge(op, undefined, undefined))
  })

  return pack
}

const DEFAULT_TIMEFRAMES = [
  ['5m', '0 */5 * * * *'],
  ['30m', '0 */30 * * * *'],
  ['3h', '0 0 */3 * * *'],
  ['1D', '0 0 0 * * *']
]

module.exports = {
  defaults: {
    timeframes: DEFAULT_TIMEFRAMES
  },
  applyStats,
  tallyStats,
  mergeStats,
  getVal,
  groupBy
}
