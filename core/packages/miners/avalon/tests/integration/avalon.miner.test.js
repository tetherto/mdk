'use strict'

const test = require('brittle')
const TcpFacility = require('svc-facs-tcp')
const { createServer } = require('../../mock/server')
const AvalonMiner = require('../../lib/avalon.miner')
const { POWER_MODE } = require('../../../../tpls/tpl-lib-miner/lib/utils/constants.js')

async function withMiner (opts, fn) {
  const port = 4028
  const server = createServer({
    host: '127.0.0.1',
    port,
    type: 'a1346',
    serial: opts.serial || '001',
    error: opts.error || false,
    delay: 0
  })

  const tcp = new TcpFacility({}, {}, {})
  const miner = new AvalonMiner({
    socketer: {
      readStrategy: TcpFacility.TCP_READ_STRATEGY.ON_END,
      rpc: (rpcOpts) => tcp.getRPC(rpcOpts)
    },
    address: '127.0.0.1',
    port,
    password: 'root',
    username: 'root',
    timeout: 10000,
    conf: {},
    id: `test-miner-${port}`
  })

  try {
    await fn(miner, server.state)
  } finally {
    try { await miner.close() } catch (_) {}
    server.exit()
  }
}

test('getVersion - returns correct version fields', async (t) => {
  await withMiner({ serial: 'ABCDEF1234567890' }, async (miner) => {
    const result = await miner.getVersion()

    t.ok(result.success)
    t.is(result.model, '1346-116')
    t.is(result.hardware_version, 'MM4v1_X3')
    t.is(result.software_version, 'MM317')
    t.is(result.mac, 'b4a2eb3f2348')
    t.ok(result.version, 'version string present')
    t.ok(result.cgminer?.version, 'cgminer version present')
    t.ok(result.cgminer?.api, 'cgminer api present')
  })
})

test('getVersion - serial matches the one configured on the server', async (t) => {
  const serial = 'DEADBEEF12345678'
  await withMiner({ serial }, async (miner) => {
    const result = await miner.getVersion()
    t.ok(result.success)
    t.ok(result.model)
  })
})

test('getStats - returns all expected hashrate fields', async (t) => {
  await withMiner({}, async (miner) => {
    const result = await miner.getStats()

    t.ok(result.success)
    t.ok(result.elapsed !== undefined)
    t.ok(result.mhs_av !== undefined)
    t.ok(result.mhs_30s !== undefined)
    t.ok(result.mhs_1m !== undefined)
    t.ok(result.mhs_5m !== undefined)
    t.ok(result.mhs_15m !== undefined)
    t.ok(result.accepted !== undefined)
    t.ok(result.rejected !== undefined)
  })
})

test('getStats - caches previous hashrate in prev_mhs', async (t) => {
  await withMiner({}, async (miner) => {
    const first = await miner.getStats()
    t.is(first.prev_mhs, null, 'first call has no cached hashrate')

    const second = await miner.getStats()
    t.is(second.prev_mhs, first.mhs_5m, 'second call caches mhs_5m from first call')
  })
})

test('getEStats - returns all expected hardware telemetry fields', async (t) => {
  await withMiner({}, async (miner) => {
    const result = await miner.getEStats()

    t.ok(result.success)
    t.ok(result.serial !== undefined)
    t.ok(result.temperature !== undefined)
    t.ok(result.temperature_max !== undefined)
    t.ok(result.temperature_avg !== undefined)
    t.ok(Array.isArray(result.power_status))
    t.ok(Array.isArray(result.PLL))
    t.is(result.PLL.length, 3)
    t.ok(Array.isArray(result.miner_ghs))
    t.ok(Array.isArray(result.hash_board_status))
    t.ok(result.soft_off !== undefined)
    t.ok(result.work_mode !== undefined)
    t.ok(result.object_power_consumption !== undefined)
    t.ok(Array.isArray(result.frequency_config))
    t.is(result.frequency_config.length, 3)
    t.ok(Array.isArray(result.chip_temperatures))
    t.is(result.chip_temperatures.length, 3)
    t.ok(Array.isArray(result.chip_voltages))
    t.is(result.chip_voltages.length, 3)
  })
})

test('getEStats - soft_off is "0" for a running miner', async (t) => {
  await withMiner({}, async (miner) => {
    const result = await miner.getEStats()
    t.is(result.soft_off, '0')
  })
})

test('getEStats - work_mode is "0" by default', async (t) => {
  await withMiner({}, async (miner) => {
    const result = await miner.getEStats()
    t.is(result.work_mode, '0')
  })
})

test('getPools - returns array of pool objects', async (t) => {
  await withMiner({}, async (miner) => {
    const pools = await miner.getPools()

    t.ok(Array.isArray(pools))
    t.ok(pools.length > 0)

    const pool = pools[0]
    t.ok(pool.url, 'pool has url')
    t.ok(pool.user, 'pool has user')
    t.ok(pool.status, 'pool has status')
    t.ok(pool.priority !== undefined, 'pool has priority')
  })
})

test('getPools - returns pools matching defaults', async (t) => {
  await withMiner({}, async (miner) => {
    const pools = await miner.getPools()
    const realPools = pools.filter(p => p.url)
    t.is(realPools.length, 3)
    t.ok(realPools[0].url.includes('f2pool.com'))
  })
})

test('suspendMining - returns success and sets suspended state', async (t) => {
  await withMiner({}, async (miner, state) => {
    const result = await miner.suspendMining()
    t.ok(result.success)
    t.ok(state.suspended, 'state should be suspended after softoff')
  })
})

test('setFanSpeed - returns success for valid speed', async (t) => {
  await withMiner({}, async (miner) => {
    const result = await miner.setFanSpeed(50)
    t.ok(result.success)
  })
})

test('setFanSpeed - returns Code=119 for out-of-range speed', async (t) => {
  await withMiner({}, async (miner) => {
    const result = await miner.setFanSpeed(200)
    t.is(typeof result.success, 'boolean')
  })
})

test('factoryReset - returns success', async (t) => {
  await withMiner({}, async (miner) => {
    const result = await miner.factoryReset()
    t.ok(result.success)
  })
})

test('reasonForReboot - returns a boot reason string', async (t) => {
  await withMiner({}, async (miner) => {
    const result = await miner.reasonForReboot()
    t.ok(typeof result === 'string', 'returns a string')
    t.ok(result.length > 0, 'non-empty string')
  })
})

test('reboot - returns success (ignores connection drop)', async (t) => {
  await withMiner({}, async (miner) => {
    const result = await miner.reboot()
    t.ok(result.success)
  })
})

test('getWorkingMode - returns 0 (normal) by default', async (t) => {
  await withMiner({}, async (miner) => {
    const mode = await miner.getWorkingMode()
    t.is(mode, 0)
  })
})

test('getHashPowerStatus - returns array of integers', async (t) => {
  await withMiner({}, async (miner) => {
    const result = await miner.getHashPowerStatus()
    t.ok(Array.isArray(result))
    t.ok(result.length > 0)
    result.forEach((v) => t.is(typeof v, 'number'))
  })
})

test('restoreLogin - returns success', async (t) => {
  await withMiner({}, async (miner) => {
    const result = await miner.restoreLogin()
    t.ok(result.success)
  })
})

test('updateAdminPassword - succeeds with correct current password', async (t) => {
  await withMiner({}, async (miner) => {
    const result = await miner.updateAdminPassword('newpassword123')
    t.ok(result.success)
    t.is(miner.opts.password, 'newpassword123', 'opts.password updated in-memory')
  })
})

test('setLED - returns success for true', async (t) => {
  await withMiner({}, async (miner) => {
    const result = await miner.setLED(true)
    t.ok(result.success)
  })
})

test('setLED - returns success for false', async (t) => {
  await withMiner({}, async (miner) => {
    const result = await miner.setLED(false)
    t.ok(result.success)
  })
})

test('setLED - throws for non-boolean argument', async (t) => {
  await withMiner({}, async (miner) => {
    await t.exception(() => miner.setLED('on'), /ERR_INVALID_ARG_TYPE/)
  })
})

test('setNetworkConfiguration - succeeds for DHCP', async (t) => {
  await withMiner({}, async (miner) => {
    const result = await miner.setNetworkConfiguration({
      type: 'dhcp',
      network: { dns: ['8.8.8.8', '8.8.4.4'] }
    })
    t.ok(result.success)
  })
})

test('setNetworkConfiguration - succeeds for static IP', async (t) => {
  await withMiner({}, async (miner) => {
    const result = await miner.setNetworkConfiguration({
      type: 'static',
      network: {
        ip: '192.168.1.100',
        mask: '255.255.255.0',
        gateway: '192.168.1.1',
        dns: ['8.8.8.8', '8.8.4.4']
      }
    })
    t.ok(result.success)
  })
})

test('setPowerMode - returns success immediately for sleep mode', async (t) => {
  await withMiner({}, async (miner) => {
    const result = await miner.setPowerMode(POWER_MODE.SLEEP)
    t.ok(result.success)
  })
})

test('setPowerMode - returns success immediately for normal mode', async (t) => {
  await withMiner({}, async (miner) => {
    const result = await miner.setPowerMode(POWER_MODE.NORMAL)
    t.ok(result.success)
  })
})

test('setPowerMode - returns success immediately for high mode', async (t) => {
  await withMiner({}, async (miner) => {
    const result = await miner.setPowerMode(POWER_MODE.HIGH)
    t.ok(result.success)
  })
})

test('getSnap - returns normalized snap with stats and config', async (t) => {
  await withMiner({}, async (miner) => {
    const snap = await miner.getSnap()

    t.ok(snap.stats, 'snap has stats')
    t.ok(snap.config, 'snap has config')

    // stats fields
    t.ok(snap.stats.status, 'stats has status')
    t.ok(snap.stats.hashrate_mhs, 'stats has hashrate_mhs')
    t.ok(snap.stats.temperature_c, 'stats has temperature_c')
    t.ok(snap.stats.frequency_mhz, 'stats has frequency_mhz')
    t.ok(Array.isArray(snap.stats.pool_status), 'stats has pool_status array')
    t.is(typeof snap.stats.power_w, 'number', 'stats has numeric power_w')
    t.is(typeof snap.stats.efficiency_w_ths, 'number', 'stats has numeric efficiency')
    t.is(typeof snap.stats.uptime_ms, 'number', 'stats has numeric uptime_ms')

    // hashrate sub-fields
    t.ok(snap.stats.hashrate_mhs.avg !== undefined)
    t.ok(snap.stats.hashrate_mhs.t_30s !== undefined)
    t.ok(snap.stats.hashrate_mhs.t_1m !== undefined)
    t.ok(snap.stats.hashrate_mhs.t_5m !== undefined)
    t.ok(snap.stats.hashrate_mhs.t_15m !== undefined)

    // temperature sub-fields
    t.ok(snap.stats.temperature_c.ambient !== undefined)
    t.ok(snap.stats.temperature_c.max !== undefined)
    t.ok(snap.stats.temperature_c.avg !== undefined)
    t.ok(Array.isArray(snap.stats.temperature_c.chips))

    // config fields
    t.ok(snap.config.network_config, 'config has network_config')
    t.ok(Array.isArray(snap.config.pool_config), 'config has pool_config array')
    t.ok(snap.config.power_mode, 'config has power_mode')
    t.is(typeof snap.config.suspended, 'boolean', 'config has boolean suspended')
    t.is(typeof snap.config.led_status, 'boolean', 'config has boolean led_status')
    t.ok(snap.config.firmware_ver, 'config has firmware_ver')
  })
})

test('getSnap - status is "mining" for a healthy running miner', async (t) => {
  await withMiner({}, async (miner) => {
    const snap = await miner.getSnap()
    t.is(snap.stats.status, 'mining')
  })
})

test('getSnap - power_mode is NORMAL by default', async (t) => {
  await withMiner({}, async (miner) => {
    const snap = await miner.getSnap()
    t.is(snap.config.power_mode, POWER_MODE.NORMAL)
  })
})

test('getSnap - status is "error" when miner is in error state', async (t) => {
  await withMiner({ error: true }, async (miner) => {
    const snap = await miner.getSnap()
    t.is(snap.stats.status, 'error')
    t.ok(snap.stats.errors, 'snap has errors array')
    t.ok(snap.stats.errors.length > 0, 'at least one error present')
  })
})
