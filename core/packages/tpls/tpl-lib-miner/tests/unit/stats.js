'use strict'

const { test } = require('brittle')
const { STATUS, POWER_MODE, MAINTENANCE } = require('../../lib/utils/constants')

let libStats
try {
  libStats = require('../../lib/templates/stats')
} catch (e) {
  test.skip('lib/templates/stats requires deps', (t) => {
    t.pass('skipped')
  })
}

if (libStats && libStats.specs?.miner_default) {
  const specs = libStats.specs.miner_default

  test('stats: miner_default spec exists with ops', (t) => {
    t.ok(specs.ops)
    t.ok(specs.ops.hashrate_mhs_1m_sum)
    t.ok(specs.ops.offline_or_sleeping_miners_cnt)
    t.ok(specs.ops.online_or_minor_error_miners_cnt)
    t.ok(specs.ops.error_miners_cnt)
  })

  test('stats: conf has skipTagPrefixes', (t) => {
    t.ok(libStats.conf.skipTagPrefixes)
    t.ok(libStats.conf.skipTagPrefixes.includes('pos-'))
    t.ok(libStats.conf.skipTagPrefixes.includes('id-'))
  })

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
}
