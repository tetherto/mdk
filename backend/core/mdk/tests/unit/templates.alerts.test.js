'use strict'

const { test } = require('brittle')
const libAlerts = require('../../lib/templates/alerts')

const specs = libAlerts.specs.miner_default

// ---------------------------------------------------------------------------
// family spec presence
// ---------------------------------------------------------------------------

test('alerts exposes default, miner_default, container_default and powermeter_default specs', (t) => {
  t.ok(libAlerts.specs.default !== undefined, 'default is set')
  t.ok(libAlerts.specs.miner_default !== undefined, 'miner_default is set')
  t.ok(libAlerts.specs.container_default !== undefined, 'container_default is set')
  t.ok(libAlerts.specs.powermeter_default !== undefined, 'powermeter_default is set')
})

test('container_default equals default', (t) => {
  t.is(libAlerts.specs.container_default, libAlerts.specs.default, 'container_default references default')
})

// ---------------------------------------------------------------------------
// miner_default probes
// ---------------------------------------------------------------------------

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

test('wrong_miner_subaccount: valid true for a well-formed online snap with configured pools', (t) => {
  const ctx = { thingConf: { pools: [{ worker_name: 'w1' }] } }
  const snap = {
    stats: { status: 'mining' },
    config: { pool_config: [{ username: 'w1.abc' }] }
  }
  t.ok(specs.wrong_miner_subaccount.valid(ctx, snap))
})

test('wrong_miner_subaccount: valid false when offline', (t) => {
  const ctx = { thingConf: { pools: [{ worker_name: 'w1' }] } }
  const snap = {
    stats: { status: 'offline' },
    config: { pool_config: [{ username: 'w1.abc' }] }
  }
  t.ok(!specs.wrong_miner_subaccount.valid(ctx, snap))
})

test('wrong_worker_name: valid true for a well-formed online snap with configured pools', (t) => {
  const ctx = { id: 'miner-1', thingConf: { pools: [{ worker_name: 'w1' }] } }
  const snap = {
    stats: { status: 'mining' },
    config: { pool_config: [{ username: 'w1.abc' }], network_config: { ip_address: '10.0.0.1' } }
  }
  t.ok(specs.wrong_worker_name.valid(ctx, snap))
})

test('wrong_worker_name: valid false when thingConf has no pools configured', (t) => {
  const ctx = { id: 'miner-1', thingConf: { pools: [] } }
  const snap = {
    stats: { status: 'mining' },
    config: { pool_config: [{ username: 'w1.abc' }], network_config: { ip_address: '10.0.0.1' } }
  }
  t.ok(!specs.wrong_worker_name.valid(ctx, snap))
})

test('ip_worker_name: valid true for a well-formed online snap with configured pools', (t) => {
  const ctx = { thingConf: { pools: [{ worker_name: 'w1' }] } }
  const snap = {
    stats: { status: 'mining' },
    config: { pool_config: [{ username: '10x0x0x1.w1' }], network_config: { ip_address: '10.0.0.1' } }
  }
  t.ok(specs.ip_worker_name.valid(ctx, snap))
})

test('ip_worker_name: valid false when snap has no config', (t) => {
  const ctx = { thingConf: { pools: [{ worker_name: 'w1' }] } }
  const snap = { stats: { status: 'mining' }, config: null }
  t.ok(!specs.ip_worker_name.valid(ctx, snap))
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
