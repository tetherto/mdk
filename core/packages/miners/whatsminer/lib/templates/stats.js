'use strict'

const libStats = require('../../../../tpls/tpl-lib-miner/lib/templates/stats')
const { STATUS } = require('../../../../tpls/tpl-lib-miner/lib/utils/constants')
const { getVal } = require('../../../../mdk/lib-stats/utils')

const MINOR_ERROR_CODES_M56S_M30_SET = new Set(
  [203, 204, 205, 206, 219, 236, 248, 270, 275, 320, 321, 322, 620, 714, 901, 2320, 2330, 2350, 5140, 5141]
)

const MINOR_ERROR_CODES_M53_SET = new Set(
  [202, 205, 264, 265, 266, 267, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280]
)

function groupByMinerInfo (entry, ext) {
  return `${getVal(ext, 'info.container')}-${getVal(ext, 'info.pos')}`
}

function checkIfAllErrorsAreMinor (entry, minorErrorCodesSet) {
  return entry?.last?.snap?.stats?.status === STATUS.ERROR &&
    entry?.last?.snap?.errors?.every(error => minorErrorCodesSet.has(error.code))
}

function getSharedOps (minorErrorCodesSet) {
  return {
    online_or_minor_error_miners_cnt: {
      op: 'cnt',
      filter: function (entry) {
        return (
          entry?.last?.snap?.stats?.status === STATUS.MINING ||
          checkIfAllErrorsAreMinor(entry, minorErrorCodesSet)
        )
      }
    },
    error_miners_cnt: {
      op: 'cnt',
      filter: function (entry) {
        return (
          entry?.last?.snap?.stats?.status === STATUS.ERROR &&
          !checkIfAllErrorsAreMinor(entry, minorErrorCodesSet)
        )
      }
    }
  }
}

const sharedPoolStats = {
  pools_accepted_shares_total: {
    op: 'sum',
    src: 'last.snap.stats.all_pools_shares.accepted'
  },
  pools_rejected_shares_total: {
    op: 'sum',
    src: 'last.snap.stats.all_pools_shares.rejected'
  },
  pools_stale_shares_total: {
    op: 'sum',
    src: 'last.snap.stats.all_pools_shares.stale'
  }
}

libStats.specs = {
  miner: {
    ops: {
      ...libStats.specs.miner_default.ops,
      ...sharedPoolStats
    }
  },
  'miner-wm-m30s': {
    ops: getSharedOps(MINOR_ERROR_CODES_M56S_M30_SET)
  },
  'miner-wm-m56s': {
    ops: getSharedOps(MINOR_ERROR_CODES_M56S_M30_SET)
  },
  'miner-wm-m53s': {
    ops: getSharedOps(MINOR_ERROR_CODES_M53_SET)
  },
  'miner-wm-m63': {
    ops: {
      hashrate_mhs_1m_group: {
        op: 'group',
        src: 'last.snap.stats.hashrate_mhs.t_1m',
        group: groupByMinerInfo
      },
      power_mode_group: {
        op: 'group',
        src: 'last.snap.config.power_mode',
        group: groupByMinerInfo
      },
      power_w_group: {
        op: 'group',
        src: 'last.snap.stats.power_w',
        group: groupByMinerInfo
      },
      status_group: {
        op: 'group',
        src: 'last.snap.stats.status',
        group: groupByMinerInfo
      }
    }
  }
}

module.exports = libStats
