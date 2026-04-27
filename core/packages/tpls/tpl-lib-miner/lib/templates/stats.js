'use strict'

const libStats = require('../../../tpl-lib-thing/lib/templates/stats')
const { groupBy } = require('miningos-lib-stats/utils')
const { hasErrorAndPositiveHashrate } = require('../utils')
const { STATUS, POWER_MODE, MAINTENANCE } = require('../utils/constants')

libStats.conf.skipTagPrefixes = ['pos-', 'id-', 'code-', 'site-']

libStats.specs.miner_default = {
  ops: {
    ...libStats.specs.default.ops,
    hashrate_mhs_1m_sum: {
      op: 'sum',
      src: 'last.snap.stats.hashrate_mhs.t_5m'
    },
    hashrate_mhs_1m_group_sum: {
      op: 'group_sum',
      src: 'last.snap.stats.hashrate_mhs.t_5m',
      group: groupBy('info.container')
    },
    hashrate_mhs_1m_avg: {
      op: 'avg',
      src: 'last.snap.stats.hashrate_mhs.t_5m'
    },
    hashrate_mhs_1m_cnt: {
      op: 'cnt',
      src: 'last.snap.stats.hashrate_mhs.t_5m',
      filter: function (entry) {
        return (
          entry?.info?.container !== MAINTENANCE &&
          entry?.last?.snap?.stats?.hashrate_mhs?.t_5m != null
        )
      }
    },
    hashrate_mhs_1m_cnt_active: {
      op: 'cnt',
      src: 'last.snap.stats.hashrate_mhs.t_5m',
      filter: function (entry) {
        return entry?.last?.snap?.stats?.status === STATUS.MINING
      }
    },
    offline_or_sleeping_miners_cnt: {
      op: 'cnt',
      filter: function (entry) {
        return (
          entry?.info?.container !== MAINTENANCE &&
          [STATUS.OFFLINE, STATUS.SLEEPING].includes(entry?.last?.snap?.stats?.status)
        )
      }
    },
    online_or_minor_error_miners_cnt: {
      op: 'cnt',
      filter: function (entry) {
        return (
          entry?.info?.container !== MAINTENANCE &&
          entry?.last?.snap?.stats?.status === STATUS.MINING
        )
      }
    },
    error_miners_cnt: {
      op: 'cnt',
      filter: function (entry) {
        return (
          entry?.info?.container !== MAINTENANCE &&
          entry?.last?.snap?.stats?.status === STATUS.ERROR
        )
      }
    },
    not_mining_miners_cnt: {
      op: 'cnt',
      filter: function (entry) {
        return (
          entry?.info?.container !== MAINTENANCE &&
          entry?.last?.snap?.stats?.status === STATUS.NOT_MINING
        )
      }
    },
    power_w_sum: {
      op: 'sum',
      src: 'last.snap.stats.power_w'
    },
    power_w_avg: {
      op: 'avg',
      src: 'last.snap.stats.power_w'
    },
    power_w_type_group_sum: {
      op: 'group_sum',
      src: 'last.snap.stats.power_w',
      group: groupBy('type'),
      filter: (entry) => {
        return entry?.info?.container !== MAINTENANCE
      }
    },
    power_w_type_group_avg: {
      op: 'group_avg',
      src: 'last.snap.stats.power_w',
      group: groupBy('type'),
      filter: (entry) => {
        return entry?.info?.container !== MAINTENANCE
      }
    },
    power_w_container_group_sum: {
      op: 'group_sum',
      src: 'last.snap.stats.power_w',
      group: groupBy('info.container')
    },
    power_w_container_group_avg: {
      op: 'group_avg',
      src: 'last.snap.stats.power_w',
      group: groupBy('info.container')
    },
    uptime_ms_avg: {
      op: 'avg',
      src: 'last.snap.stats.uptime_ms'
    },
    frequency_mhz_avg: {
      op: 'avg',
      src: 'last.snap.stats.frequency_mhz.avg'
    },
    efficiency_w_ths_avg: {
      op: 'avg',
      src: 'last.snap.stats.efficiency_w_ths'
    },
    temperature_c_avg: {
      op: 'avg',
      src: 'last.snap.stats.temperature_c.avg'
    },
    temperature_c_group_avg: {
      op: 'group_avg',
      src: 'last.snap.stats.temperature_c.avg',
      group: groupBy('info.container')
    },
    temperature_c_group_max: {
      op: 'group_max',
      src: 'last.snap.stats.temperature_c.max',
      group: groupBy('info.container')
    },
    offline_cnt: {
      op: 'group_cnt',
      group: groupBy('info.container'),
      filter: (entry) => {
        return (
          entry?.info?.container !== MAINTENANCE &&
          entry?.last?.snap?.stats?.status === STATUS.OFFLINE
        )
      }
    },
    error_cnt: {
      op: 'group_cnt',
      group: groupBy('info.container'),
      filter: (entry) => {
        return (
          entry?.info?.container !== MAINTENANCE &&
          entry?.last?.snap?.stats?.status === STATUS.ERROR
        )
      }
    },
    not_mining_cnt: {
      op: 'group_cnt',
      group: groupBy('info.container'),
      filter: (entry) => {
        return (
          entry?.info?.container !== MAINTENANCE &&
          entry?.last?.snap?.stats?.status === STATUS.NOT_MINING
        )
      }
    },
    power_mode_sleep_cnt: {
      op: 'group_cnt',
      group: groupBy('info.container'),
      filter: (entry) => {
        return entry?.last?.snap?.stats?.status === STATUS.SLEEPING
      }
    },
    power_mode_low_cnt: {
      op: 'group_cnt',
      group: groupBy('info.container'),
      filter: (entry) => {
        return entry?.last?.snap?.stats?.status === STATUS.MINING && entry?.last?.snap?.config?.power_mode === POWER_MODE.LOW
      }
    },
    power_mode_normal_cnt: {
      op: 'group_cnt',
      group: groupBy('info.container'),
      filter: (entry) => {
        return entry?.last?.snap?.stats?.status === STATUS.MINING && entry?.last?.snap?.config?.power_mode === POWER_MODE.NORMAL
      }
    },
    power_mode_high_cnt: {
      op: 'group_cnt',
      group: groupBy('info.container'),
      filter: (entry) => {
        return entry?.last?.snap?.stats?.status === STATUS.MINING && entry?.last?.snap?.config?.power_mode === POWER_MODE.HIGH
      }
    },
    power_mode_low_include_error_cnt: {
      op: 'group_cnt',
      group: groupBy('info.container'),
      filter: (entry) => {
        return hasErrorAndPositiveHashrate(entry) && entry?.last?.snap?.config?.power_mode === POWER_MODE.LOW
      }
    },
    power_mode_normal_include_error_cnt: {
      op: 'group_cnt',
      group: groupBy('info.container'),
      filter: (entry) => {
        return hasErrorAndPositiveHashrate(entry) && entry?.last?.snap?.config?.power_mode === POWER_MODE.NORMAL
      }
    },
    power_mode_high_include_error_cnt: {
      op: 'group_cnt',
      group: groupBy('info.container'),
      filter: (entry) => {
        return hasErrorAndPositiveHashrate(entry) && entry?.last?.snap?.config?.power_mode === POWER_MODE.HIGH
      }
    },
    type_cnt: {
      op: 'group_cnt',
      group: groupBy('type'),
      filter: (entry) => {
        return entry?.info?.container !== MAINTENANCE && entry?.last?.snap
      }
    },
    offline_type_cnt: {
      op: 'group_cnt',
      group: groupBy('type'),
      filter: (entry) => {
        return (
          entry?.info?.container !== MAINTENANCE &&
          entry?.last?.snap?.stats?.status === STATUS.OFFLINE
        )
      }
    },
    maintenance_type_cnt: {
      op: 'group_cnt',
      group: groupBy('type'),
      filter: (entry) => {
        return entry?.info?.container === MAINTENANCE
      }
    },
    online_positive_hashrate_type_cnt: {
      op: 'group_cnt',
      group: groupBy('type'),
      filter: (entry) => {
        const { status, hashrate_mhs: hashrateMHS } = entry?.last?.snap?.stats || {}
        return (
          entry?.info?.container !== MAINTENANCE &&
          status !== STATUS.OFFLINE &&
          hashrateMHS?.t_5m > 0
        )
      }
    },
    online_without_hashrate_type_cnt: {
      op: 'group_cnt',
      group: groupBy('type'),
      filter: (entry) => {
        const { status, hashrate_mhs: hashrateMHS } = entry?.last?.snap?.stats || {}
        return (
          entry?.info?.container !== MAINTENANCE &&
          status !== STATUS.OFFLINE &&
          (!hashrateMHS?.t_5m || hashrateMHS?.t_5m === 0)
        )
      }
    },
    error_type_cnt: {
      op: 'group_cnt',
      group: groupBy('type'),
      filter: (entry) => {
        return (
          entry?.info?.container !== MAINTENANCE &&
          entry?.last?.snap?.stats?.status === STATUS.ERROR
        )
      }
    },
    not_mining_type_cnt: {
      op: 'group_cnt',
      group: groupBy('type'),
      filter: (entry) => {
        return (
          entry?.info?.container !== MAINTENANCE &&
          entry?.last?.snap?.stats?.status === STATUS.NOT_MINING
        )
      }
    },
    power_mode_sleep_type_cnt: {
      op: 'group_cnt',
      group: groupBy('type'),
      filter: (entry) => {
        return entry?.last?.snap?.stats?.status === STATUS.SLEEPING
      }
    },
    power_mode_low_type_cnt: {
      op: 'group_cnt',
      group: groupBy('type'),
      filter: (entry) => {
        return entry?.last?.snap?.stats?.status === STATUS.MINING && entry?.last?.snap?.config?.power_mode === POWER_MODE.LOW
      }
    },
    power_mode_normal_type_cnt: {
      op: 'group_cnt',
      group: groupBy('type'),
      filter: (entry) => {
        return entry?.last?.snap?.stats?.status === STATUS.MINING && entry?.last?.snap?.config?.power_mode === POWER_MODE.NORMAL
      }
    },
    power_mode_high_type_cnt: {
      op: 'group_cnt',
      group: groupBy('type'),
      filter: (entry) => {
        return entry?.last?.snap?.stats?.status === STATUS.MINING && entry?.last?.snap?.config?.power_mode === POWER_MODE.HIGH
      }
    },
    hashrate_mhs_1m_type_group_sum: {
      op: 'group_sum',
      src: 'last.snap.stats.hashrate_mhs.t_5m',
      group: groupBy('type'),
      filter: (entry) => {
        return entry?.info?.container !== MAINTENANCE
      }
    },
    hashrate_mhs_1m_type_group_avg: {
      op: 'group_avg',
      src: 'last.snap.stats.hashrate_mhs.t_5m',
      group: groupBy('type')
    },
    efficiency_w_ths_type_group_avg: {
      op: 'group_avg',
      src: 'last.snap.stats.efficiency_w_ths',
      group: groupBy('type')
    },
    hashrate_mhs_1m_container_group_sum: {
      op: 'group_sum',
      src: 'last.snap.stats.hashrate_mhs.t_5m',
      group: groupBy('info.container')
    },
    hashrate_mhs_1m_container_group_avg: {
      op: 'group_avg',
      src: 'last.snap.stats.hashrate_mhs.t_5m',
      group: groupBy('info.container')
    },
    efficiency_w_ths_container_group_avg: {
      op: 'group_avg',
      src: 'last.snap.stats.efficiency_w_ths',
      group: groupBy('info.container')
    },
    hashrate_mhs_5m_active_container_group_cnt: {
      op: 'group_cnt',
      group: groupBy('info.container'),
      filter: (entry) => entry?.last?.snap?.stats?.hashrate_mhs?.t_5m
    },
    nominal_hashrate_mhs_avg: {
      op: 'avg',
      src: 'info.nominalHashrateMhs'
    },
    nominal_efficiency_w_ths_avg: {
      op: 'avg',
      src: 'last.snap.stats.nominal_efficiency_w_ths'
    },
    nominal_hashrate_mhs_sum: {
      op: 'sum',
      src: 'info.nominalHashrateMhs'
    },
    nominal_efficiency_w_ths_sum: {
      op: 'sum',
      src: 'last.snap.stats.nominal_efficiency_w_ths'
    },
    hashrate_mhs_5m_sum: {
      op: 'sum',
      src: 'last.snap.stats.hashrate_mhs.t_5m'
    },
    hashrate_mhs_5m_avg: {
      op: 'avg',
      src: 'last.snap.stats.hashrate_mhs.t_5m'
    },
    hashrate_mhs_5m_cnt: {
      op: 'cnt',
      src: 'last.snap.stats.hashrate_mhs.t_5m'
    },
    hashrate_mhs_5m_cnt_active: {
      op: 'cnt',
      src: 'last.snap.stats.hashrate_mhs.t_5m',
      filter: function (entry) {
        return entry?.last?.snap?.stats?.status === STATUS.MINING
      }
    },
    hashrate_mhs_5m_type_group_sum: {
      op: 'group_sum',
      src: 'last.snap.stats.hashrate_mhs.t_5m',
      group: groupBy('type')
    },
    hashrate_mhs_5m_type_group_avg: {
      op: 'group_avg',
      src: 'last.snap.stats.hashrate_mhs.t_5m',
      group: groupBy('type')
    },
    hashrate_mhs_5m_container_group_sum: {
      op: 'group_sum',
      src: 'last.snap.stats.hashrate_mhs.t_5m',
      group: groupBy('info.container')
    },
    hashrate_mhs_5m_container_group_avg: {
      op: 'group_avg',
      src: 'last.snap.stats.hashrate_mhs.t_5m',
      group: groupBy('info.container')
    },
    miner_inventory_status_group_cnt: {
      op: 'group_cnt',
      group: groupBy('info.status')
    },
    miner_inventory_location_group_cnt: {
      op: 'group_cnt',
      group: groupBy('info.location')
    }
  }
}

module.exports = libStats
