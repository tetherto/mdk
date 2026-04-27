'use strict'

const { test } = require('brittle')

let libAlerts
try {
  libAlerts = require('../../lib/templates/alerts')
} catch (e) {
  test.skip('lib/templates/alerts requires miningos-tpl-lib-thing', (t) => {
    t.pass('skipped')
  })
}

if (libAlerts && libAlerts.specs && libAlerts.specs.miner_default) {
  const specs = libAlerts.specs.miner_default

  test('wrong_miner_pool: valid false when no pool config', (t) => {
    const ctx = { thingConf: { pools: [] } }
    const snap = { config: {} }
    t.ok(!specs.wrong_miner_pool.valid(ctx, snap))
  })

  test('wrong_miner_pool: probe true when config pools empty', (t) => {
    const ctx = { thingConf: { pools: [] } }
    const snap = {
      config: {
        pool_config: [{ url: 'x' }]
      }
    }
    t.ok(specs.wrong_miner_pool.probe(ctx, snap))
  })

  test('wrong_miner_subaccount: probe true when worker_name not in username', (t) => {
    const ctx = {
      thingConf: {
        pools: [{ worker_name: 'worker1' }]
      }
    }
    const snap = {
      config: {
        pool_config: [{ username: 'other.thing' }]
      }
    }
    t.ok(specs.wrong_miner_subaccount.probe(ctx, snap))
  })

  test('wrong_miner_subaccount: probe false when worker_name in username', (t) => {
    const ctx = {
      thingConf: {
        pools: [{ worker_name: 'worker1' }]
      }
    }
    const snap = {
      config: {
        pool_config: [{ username: 'worker1.abc' }]
      }
    }
    t.not(specs.wrong_miner_subaccount.probe(ctx, snap))
  })

  test('wrong_worker_name: probe true when id and ip not in username', (t) => {
    const ctx = { id: 'miner-1', thingConf: { pools: [{ worker_name: 'w1' }] } }
    const snap = {
      config: {
        pool_config: [{ username: 'other.thing' }],
        network_config: { ip_address: '192.168.1.1' }
      }
    }
    t.ok(specs.wrong_worker_name.probe(ctx, snap))
  })

  test('ip_worker_name: probe true when IP formatted in username', (t) => {
    const ctx = { thingConf: { pools: [{ worker_name: 'w1' }] } }
    const snap = {
      config: {
        pool_config: [
          { username: '192x168x1x1.w1' }
        ],
        network_config: { ip_address: '192.168.1.1' }
      }
    }
    t.ok(specs.ip_worker_name.probe(ctx, snap))
  })
}
