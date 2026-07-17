'use strict'

const { test } = require('brittle')
const { STATUS, POWER_MODE, MAINTENANCE } = require('../../lib/things/constants')
const libStats = require('../../lib/templates/stats')

const specs = libStats.specs.miner_default

// ---------------------------------------------------------------------------
// family spec presence
// ---------------------------------------------------------------------------

test('stats: miner_default spec exists with ops', (t) => {
  t.ok(specs.ops)
  t.ok(specs.ops.hashrate_mhs_1m_sum)
  t.ok(specs.ops.offline_or_sleeping_miners_cnt)
  t.ok(specs.ops.online_or_minor_error_miners_cnt)
  t.ok(specs.ops.error_miners_cnt)
})

test('stats: base conf and miner conf have skipTagPrefixes', (t) => {
  t.ok(libStats.conf.skipTagPrefixes.includes('id-'))
  t.ok(libStats.conf.skipTagPrefixes.includes('code-'))
  t.ok(libStats.minerConf.skipTagPrefixes.includes('pos-'))
  t.ok(libStats.minerConf.skipTagPrefixes.includes('id-'))
  t.ok(libStats.minerConf.skipTagPrefixes.includes('site-'))
})

test('stats: powermeter_default and sensor_default reuse default ops', (t) => {
  t.ok(libStats.specs.powermeter_default)
  t.alike(libStats.specs.powermeter_default.ops, libStats.specs.default.ops)
  t.ok(libStats.specs.sensor_default)
  t.alike(libStats.specs.sensor_default.ops, libStats.specs.default.ops)
})

test('stats: container_default has expected container ops', (t) => {
  const ops = libStats.specs.container_default.ops
  t.ok(ops, 'has ops')
  t.ok(ops.container_status, 'container_status op')
  t.ok(ops.container_power_w_sum, 'container_power_w_sum op')
  t.ok(ops.container_power_w, 'container_power_w op')
  t.ok(ops.container_nominal_hashrate_mhs_sum, 'container_nominal_hashrate_mhs_sum op')
  t.ok(ops.container_nominal_hashrate_mhs_avg, 'container_nominal_hashrate_mhs_avg op')
  t.ok(ops.container_nominal_efficiency_w_ths_avg, 'container_nominal_efficiency_w_ths_avg op')
  t.ok(ops.container_nominal_miner_capacity_sum, 'container_nominal_miner_capacity_sum op')
})

test('stats: container_default extends default ops', (t) => {
  t.ok(libStats.specs.default !== undefined, 'default specs exist')
  t.ok(libStats.specs.container_default.ops.alerts_cnt, 'default op present')
  t.ok(libStats.specs.container_default.ops.container_status, 'container-specific op present')
})

// ---------------------------------------------------------------------------
// miner_default filters
// ---------------------------------------------------------------------------

test('stats: offline_or_sleeping_miners_cnt filter', (t) => {
  const filter = specs.ops.offline_or_sleeping_miners_cnt.filter
  t.ok(filter)

  t.ok(filter({ info: { container: 'c1' }, last: { snap: { stats: { status: STATUS.OFFLINE } } } }))
  t.ok(filter({ info: { container: 'c1' }, last: { snap: { stats: { status: STATUS.SLEEPING } } } }))
  t.ok(!filter({ info: { container: MAINTENANCE }, last: { snap: { stats: { status: STATUS.OFFLINE } } } }))
  t.ok(!filter({ info: { container: 'c1' }, last: { snap: { stats: { status: STATUS.MINING } } } }))
})

test('stats: online_or_minor_error_miners_cnt filter', (t) => {
  const filter = specs.ops.online_or_minor_error_miners_cnt.filter
  t.ok(filter)

  t.ok(filter({ info: { container: 'c1' }, last: { snap: { stats: { status: STATUS.MINING } } } }))
  t.ok(!filter({ info: { container: MAINTENANCE }, last: { snap: { stats: { status: STATUS.MINING } } } }))
  t.ok(!filter({ info: { container: 'c1' }, last: { snap: { stats: { status: STATUS.OFFLINE } } } }))
})

test('stats: error_miners_cnt filter', (t) => {
  const filter = specs.ops.error_miners_cnt.filter
  t.ok(filter)

  t.ok(filter({ info: { container: 'c1' }, last: { snap: { stats: { status: STATUS.ERROR } } } }))
  t.ok(!filter({ info: { container: MAINTENANCE }, last: { snap: { stats: { status: STATUS.ERROR } } } }))
  t.ok(!filter({ info: { container: 'c1' }, last: { snap: { stats: { status: STATUS.MINING } } } }))
})

test('stats: power_mode_low_cnt filter', (t) => {
  const filter = specs.ops.power_mode_low_cnt.filter
  t.ok(filter)

  t.ok(filter({
    info: { container: 'c1' },
    last: { snap: { stats: { status: STATUS.MINING }, config: { power_mode: POWER_MODE.LOW } } }
  }))
  t.ok(!filter({
    info: { container: 'c1' },
    last: { snap: { stats: { status: STATUS.MINING }, config: { power_mode: POWER_MODE.NORMAL } } }
  }))
})

test('stats: hashrate_mhs_1m_cnt filter excludes MAINTENANCE', (t) => {
  const filter = specs.ops.hashrate_mhs_1m_cnt.filter
  t.ok(filter)

  t.ok(filter({
    info: { container: 'c1' },
    last: { snap: { stats: { hashrate_mhs: { t_5m: 100 } } } }
  }))
  t.ok(!filter({
    info: { container: MAINTENANCE },
    last: { snap: { stats: { hashrate_mhs: { t_5m: 100 } } } }
  }))
})

test('stats: type_cnt filter', (t) => {
  const filter = specs.ops.type_cnt.filter
  t.ok(filter)

  t.ok(filter({ info: { container: 'c1' }, last: { snap: {} } }))
  t.ok(!filter({ info: { container: MAINTENANCE }, last: { snap: {} } }))
  t.ok(!filter({ info: { container: 'c1' }, last: {} }))
})

// ---------------------------------------------------------------------------
// remaining miner_default filters (previously uncovered)
// ---------------------------------------------------------------------------

test('stats: hashrate_mhs_1m_cnt_active filter', (t) => {
  const filter = specs.ops.hashrate_mhs_1m_cnt_active.filter
  t.ok(filter({ last: { snap: { stats: { status: STATUS.MINING } } } }))
  t.ok(!filter({ last: { snap: { stats: { status: STATUS.OFFLINE } } } }))
})

test('stats: not_mining_miners_cnt filter', (t) => {
  const filter = specs.ops.not_mining_miners_cnt.filter
  t.ok(filter({ info: { container: 'c1' }, last: { snap: { stats: { status: STATUS.NOT_MINING } } } }))
  t.ok(!filter({ info: { container: MAINTENANCE }, last: { snap: { stats: { status: STATUS.NOT_MINING } } } }))
  t.ok(!filter({ info: { container: 'c1' }, last: { snap: { stats: { status: STATUS.MINING } } } }))
})

test('stats: power_w_type_group_sum filter excludes MAINTENANCE', (t) => {
  const filter = specs.ops.power_w_type_group_sum.filter
  t.ok(filter({ info: { container: 'c1' } }))
  t.ok(!filter({ info: { container: MAINTENANCE } }))
})

test('stats: power_w_type_group_avg filter excludes MAINTENANCE', (t) => {
  const filter = specs.ops.power_w_type_group_avg.filter
  t.ok(filter({ info: { container: 'c1' } }))
  t.ok(!filter({ info: { container: MAINTENANCE } }))
})

test('stats: offline_cnt filter', (t) => {
  const filter = specs.ops.offline_cnt.filter
  t.ok(filter({ info: { container: 'c1' }, last: { snap: { stats: { status: STATUS.OFFLINE } } } }))
  t.ok(!filter({ info: { container: MAINTENANCE }, last: { snap: { stats: { status: STATUS.OFFLINE } } } }))
  t.ok(!filter({ info: { container: 'c1' }, last: { snap: { stats: { status: STATUS.MINING } } } }))
})

test('stats: error_cnt filter', (t) => {
  const filter = specs.ops.error_cnt.filter
  t.ok(filter({ info: { container: 'c1' }, last: { snap: { stats: { status: STATUS.ERROR } } } }))
  t.ok(!filter({ info: { container: MAINTENANCE }, last: { snap: { stats: { status: STATUS.ERROR } } } }))
})

test('stats: not_mining_cnt filter', (t) => {
  const filter = specs.ops.not_mining_cnt.filter
  t.ok(filter({ info: { container: 'c1' }, last: { snap: { stats: { status: STATUS.NOT_MINING } } } }))
  t.ok(!filter({ info: { container: MAINTENANCE }, last: { snap: { stats: { status: STATUS.NOT_MINING } } } }))
})

test('stats: power_mode_sleep_cnt filter', (t) => {
  const filter = specs.ops.power_mode_sleep_cnt.filter
  t.ok(filter({ last: { snap: { stats: { status: STATUS.SLEEPING } } } }))
  t.ok(!filter({ last: { snap: { stats: { status: STATUS.MINING } } } }))
})

test('stats: power_mode_normal_cnt filter', (t) => {
  const filter = specs.ops.power_mode_normal_cnt.filter
  t.ok(filter({ last: { snap: { stats: { status: STATUS.MINING }, config: { power_mode: POWER_MODE.NORMAL } } } }))
  t.ok(!filter({ last: { snap: { stats: { status: STATUS.MINING }, config: { power_mode: POWER_MODE.LOW } } } }))
})

test('stats: power_mode_high_cnt filter', (t) => {
  const filter = specs.ops.power_mode_high_cnt.filter
  t.ok(filter({ last: { snap: { stats: { status: STATUS.MINING }, config: { power_mode: POWER_MODE.HIGH } } } }))
  t.ok(!filter({ last: { snap: { stats: { status: STATUS.MINING }, config: { power_mode: POWER_MODE.LOW } } } }))
})

test('stats: power_mode_low_include_error_cnt filter', (t) => {
  const filter = specs.ops.power_mode_low_include_error_cnt.filter
  t.ok(filter({
    info: { container: 'c1' },
    last: { snap: { stats: { errors: ['e1'], hashrate_mhs: { t_5m: 1 } }, config: { power_mode: POWER_MODE.LOW } } }
  }))
  t.ok(!filter({
    info: { container: 'c1' },
    last: { snap: { stats: { errors: [], hashrate_mhs: { t_5m: 1 } }, config: { power_mode: POWER_MODE.LOW } } }
  }))
})

test('stats: power_mode_normal_include_error_cnt filter', (t) => {
  const filter = specs.ops.power_mode_normal_include_error_cnt.filter
  t.ok(filter({
    info: { container: 'c1' },
    last: { snap: { stats: { errors: ['e1'], hashrate_mhs: { t_5m: 1 } }, config: { power_mode: POWER_MODE.NORMAL } } }
  }))
  t.ok(!filter({
    info: { container: 'c1' },
    last: { snap: { stats: { errors: ['e1'], hashrate_mhs: { t_5m: 1 } }, config: { power_mode: POWER_MODE.LOW } } }
  }))
})

test('stats: power_mode_high_include_error_cnt filter', (t) => {
  const filter = specs.ops.power_mode_high_include_error_cnt.filter
  t.ok(filter({
    info: { container: 'c1' },
    last: { snap: { stats: { errors: ['e1'], hashrate_mhs: { t_5m: 1 } }, config: { power_mode: POWER_MODE.HIGH } } }
  }))
  t.ok(!filter({
    info: { container: 'c1' },
    last: { snap: { stats: { errors: ['e1'], hashrate_mhs: { t_5m: 1 } }, config: { power_mode: POWER_MODE.LOW } } }
  }))
})

test('stats: offline_type_cnt filter', (t) => {
  const filter = specs.ops.offline_type_cnt.filter
  t.ok(filter({ info: { container: 'c1' }, last: { snap: { stats: { status: STATUS.OFFLINE } } } }))
  t.ok(!filter({ info: { container: MAINTENANCE }, last: { snap: { stats: { status: STATUS.OFFLINE } } } }))
})

test('stats: maintenance_type_cnt filter', (t) => {
  const filter = specs.ops.maintenance_type_cnt.filter
  t.ok(filter({ info: { container: MAINTENANCE } }))
  t.ok(!filter({ info: { container: 'c1' } }))
})

test('stats: online_positive_hashrate_type_cnt filter', (t) => {
  const filter = specs.ops.online_positive_hashrate_type_cnt.filter
  t.ok(filter({
    info: { container: 'c1' },
    last: { snap: { stats: { status: STATUS.MINING, hashrate_mhs: { t_5m: 10 } } } }
  }))
  t.ok(!filter({
    info: { container: 'c1' },
    last: { snap: { stats: { status: STATUS.OFFLINE, hashrate_mhs: { t_5m: 10 } } } }
  }))
})

test('stats: online_without_hashrate_type_cnt filter', (t) => {
  const filter = specs.ops.online_without_hashrate_type_cnt.filter
  t.ok(filter({
    info: { container: 'c1' },
    last: { snap: { stats: { status: STATUS.MINING, hashrate_mhs: { t_5m: 0 } } } }
  }))
  t.ok(!filter({
    info: { container: 'c1' },
    last: { snap: { stats: { status: STATUS.MINING, hashrate_mhs: { t_5m: 10 } } } }
  }))
})

test('stats: error_type_cnt filter', (t) => {
  const filter = specs.ops.error_type_cnt.filter
  t.ok(filter({ info: { container: 'c1' }, last: { snap: { stats: { status: STATUS.ERROR } } } }))
  t.ok(!filter({ info: { container: MAINTENANCE }, last: { snap: { stats: { status: STATUS.ERROR } } } }))
})

test('stats: not_mining_type_cnt filter', (t) => {
  const filter = specs.ops.not_mining_type_cnt.filter
  t.ok(filter({ info: { container: 'c1' }, last: { snap: { stats: { status: STATUS.NOT_MINING } } } }))
  t.ok(!filter({ info: { container: MAINTENANCE }, last: { snap: { stats: { status: STATUS.NOT_MINING } } } }))
})

test('stats: power_mode_sleep_type_cnt filter', (t) => {
  const filter = specs.ops.power_mode_sleep_type_cnt.filter
  t.ok(filter({ last: { snap: { stats: { status: STATUS.SLEEPING } } } }))
  t.ok(!filter({ last: { snap: { stats: { status: STATUS.MINING } } } }))
})

test('stats: power_mode_low_type_cnt filter', (t) => {
  const filter = specs.ops.power_mode_low_type_cnt.filter
  t.ok(filter({ last: { snap: { stats: { status: STATUS.MINING }, config: { power_mode: POWER_MODE.LOW } } } }))
  t.ok(!filter({ last: { snap: { stats: { status: STATUS.MINING }, config: { power_mode: POWER_MODE.NORMAL } } } }))
})

test('stats: power_mode_normal_type_cnt filter', (t) => {
  const filter = specs.ops.power_mode_normal_type_cnt.filter
  t.ok(filter({ last: { snap: { stats: { status: STATUS.MINING }, config: { power_mode: POWER_MODE.NORMAL } } } }))
  t.ok(!filter({ last: { snap: { stats: { status: STATUS.MINING }, config: { power_mode: POWER_MODE.LOW } } } }))
})

test('stats: power_mode_high_type_cnt filter', (t) => {
  const filter = specs.ops.power_mode_high_type_cnt.filter
  t.ok(filter({ last: { snap: { stats: { status: STATUS.MINING }, config: { power_mode: POWER_MODE.HIGH } } } }))
  t.ok(!filter({ last: { snap: { stats: { status: STATUS.MINING }, config: { power_mode: POWER_MODE.LOW } } } }))
})

test('stats: hashrate_mhs_1m_type_group_sum filter excludes MAINTENANCE', (t) => {
  const filter = specs.ops.hashrate_mhs_1m_type_group_sum.filter
  t.ok(filter({ info: { container: 'c1' } }))
  t.ok(!filter({ info: { container: MAINTENANCE } }))
})

test('stats: hashrate_mhs_5m_active_container_group_cnt filter', (t) => {
  const filter = specs.ops.hashrate_mhs_5m_active_container_group_cnt.filter
  t.ok(filter({ last: { snap: { stats: { hashrate_mhs: { t_5m: 5 } } } } }))
  t.ok(!filter({ last: { snap: { stats: { hashrate_mhs: { t_5m: 0 } } } } }))
})

test('stats: hashrate_mhs_5m_cnt_active filter', (t) => {
  const filter = specs.ops.hashrate_mhs_5m_cnt_active.filter
  t.ok(filter({ last: { snap: { stats: { status: STATUS.MINING } } } }))
  t.ok(!filter({ last: { snap: { stats: { status: STATUS.OFFLINE } } } }))
})
