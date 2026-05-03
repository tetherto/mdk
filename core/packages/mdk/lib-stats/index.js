'use strict'

const path = require('path')

function applyStats (state, pack, entry, ext) {
  const opKeys = Object.keys(state.ops)

  opKeys.forEach(ok => {
    const op = state.ops[ok]

    const met = require(path.join(__dirname, 'ops', op.op))

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

    const met = require(path.join(__dirname, 'ops', op.op))

    if (!pack[ok]) {
      return
    }

    if (met.tally) {
      pack[ok] = met.tally(op, pack[ok])
    }

    pack[ok] = pack[ok].res
  })
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
  tallyStats
}
