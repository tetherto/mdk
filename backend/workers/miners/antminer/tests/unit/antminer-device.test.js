'use strict'

const test = require('brittle')
const Antminer = require('../../lib/antminer.js')
const { STATUS, POWER_MODE } = require('../../../../../core/mdk').constants

async function createMiner (fetchImpl, opts = {}) {
  const miner = new Antminer({
    address: '127.0.0.1',
    port: 80,
    username: 'root',
    password: 'root',
    ...opts
  })
  while (!miner._digestClient) await new Promise(resolve => setImmediate(resolve))
  miner.client = { fetch: fetchImpl }
  return miner
}

function res (body, ok = true) {
  return {
    ok,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body))
  }
}

function failingFetch () {
  return async () => { throw new Error('ERR_CONN') }
}

test('validateWriteAction delegates non-setPowerMode actions to Miner', async (t) => {
  const miner = await createMiner(failingFetch())
  t.is(miner.validateWriteAction('setLED', true), 1)
  try {
    miner.validateWriteAction('setLED', 'yes')
    t.fail('expected throw')
  } catch (err) {
    t.is(err.message, 'ERR_SET_LED_ENABLED_INVALID')
  }
})

test('getVersion returns error result when request fails', async (t) => {
  const miner = await createMiner(failingFetch())
  const out = await miner.getVersion()
  t.is(out.success, false)
  t.is(out.error, 'ERR_CONN')
})

test('getVersion maps miner_type and fw_version', async (t) => {
  const miner = await createMiner(async () => res({ miner_type: 'Antminer S21', fw_version: 'fw-1' }))
  const out = await miner.getVersion()
  t.is(out.success, true)
  t.is(out.platform, 'Antminer S21')
  t.is(out.antminer.firmware, 'fw-1')
})

test('getSummary returns zeroed data when request fails', async (t) => {
  const miner = await createMiner(failingFetch())
  const out = await miner.getSummary()
  t.is(out.success, false)
  t.is(out.error, 'ERR_NO_DATA')
  t.is(out.mhs_av, 0)
  t.is(out.elapsed, 0)
})

test('getMinerStats maps boards with s19xp pic layout and caches prev hashrate', async (t) => {
  const stats = {
    STATS: [{
      'miner-mode': '0',
      rate_avg: 100,
      rate_5s: 90,
      rate_30m: 95,
      chain: [{
        freq_avg: 500,
        rate_real: 0,
        rate_ideal: 110,
        hw: 1,
        temp_pic: [40, 45, 50, 55],
        temp_pcb: [50, 51, 52, 53],
        temp_chip: [60, 61, 62, 63]
      }]
    }]
  }
  const miner = await createMiner(async () => res(stats), { type: 's19xp' })
  const first = await miner.getMinerStats()
  t.is(first.success, true)
  t.is(first.minerMode, 0)
  t.is(first.prev_mhs, null)
  t.is(first.boards[0].ghs_av, 0)
  t.is(first.boards[0].temp.outlet, 45)
  t.is(first.boards[0].temp.inlet, 55)
  const second = await miner.getMinerStats()
  t.is(second.prev_mhs, 100000)
})

test('getMinerStats uses fixed pic indexes for non-s19xp types', async (t) => {
  const stats = {
    STATS: [{
      'miner-mode': '0',
      rate_avg: 100,
      rate_5s: 90,
      rate_30m: 95,
      chain: [{
        freq_avg: 500,
        rate_real: 80,
        rate_ideal: 110,
        hw: 0,
        temp_pic: [40, 45, 50, 55],
        temp_pcb: [50, 51, 52, 53],
        temp_chip: [60, 61, 62, 63]
      }]
    }]
  }
  const miner = await createMiner(async () => res(stats), { type: 's21' })
  const out = await miner.getMinerStats()
  t.is(out.boards[0].ghs_av, 80)
  t.is(out.boards[0].temp.outlet, 45)
  t.is(out.boards[0].temp.inlet, 50)
})

test('getMinerStats returns empty boards when chain is not an array', async (t) => {
  const stats = {
    STATS: [{ 'miner-mode': '1', rate_avg: 0, rate_5s: 0, rate_30m: 0 }]
  }
  const miner = await createMiner(async () => res(stats))
  const out = await miner.getMinerStats()
  t.alike(out.boards, [])
  t.is(out.minerMode, 1)
})

test('getMinerStats returns placeholder boards when request fails', async (t) => {
  const miner = await createMiner(failingFetch())
  const out = await miner.getMinerStats()
  t.is(out.success, false)
  t.is(out.error, 'ERR_NO_DATA')
  t.is(out.boards.length, 3)
  t.is(out.minerMode, 1)
})

test('getErrors maps known warning codes via ErrorMap', async (t) => {
  const miner = await createMiner(async () => res({ error_message: 'P:2' }))
  const out = await miner.getErrors()
  t.is(out.success, true)
  t.alike(out.errors, [{
    name: 'low_temp_protection',
    message: 'low_temp_protection',
    code: 'P:2'
  }])
})

test('getErrors returns empty errors for None', async (t) => {
  const miner = await createMiner(async () => res({ error_message: 'None' }))
  const out = await miner.getErrors()
  t.is(out.success, true)
  t.alike(out.errors, [])
})

test('getErrors fails on non-ok response', async (t) => {
  const miner = await createMiner(async () => res({}, false))
  const out = await miner.getErrors()
  t.is(out.success, false)
  t.alike(out.errors, [])
})

test('getErrors fails on old firmware API response', async (t) => {
  const miner = await createMiner(async () => res('error 6060 cmd'))
  const out = await miner.getErrors()
  t.is(out.success, false)
  t.alike(out.errors, [])
})

test('getErrors returns undefined for unrecognized payload shapes', async (t) => {
  const miner = await createMiner(async () => res({ error_message: 'X:9', extra: 1 }))
  const out = await miner.getErrors()
  t.is(out, undefined)
})

test('getPools maps POOLS entries', async (t) => {
  const miner = await createMiner(async () => res({
    POOLS: [{
      index: 0,
      url: 'stratum+tcp://p1:3333',
      user: 'w1',
      status: 'Alive',
      priority: 0,
      accepted: 10,
      rejected: 2,
      stale: 1,
      diff: '1',
      diffa: 5
    }]
  }))
  const out = await miner.getPools()
  t.is(out.length, 1)
  t.is(out[0].username, 'w1')
  t.is(out[0].difficulty_accepted, 5)
})

test('getPools returns empty array when POOLS missing', async (t) => {
  const miner = await createMiner(async () => res({}))
  t.alike(await miner.getPools(), [])
})

test('getPools returns empty array when request fails', async (t) => {
  const miner = await createMiner(failingFetch())
  t.alike(await miner.getPools(), [])
})

test('getDeviceConfiguration maps miner conf fields', async (t) => {
  const miner = await createMiner(async () => res({
    'api-listen': true,
    'bitmain-fan-ctrl': false,
    'bitmain-fan-pwm': '90',
    'bitmain-freq': '485',
    'bitmain-voltage': '1980',
    'bitmain-ccdelay': '0',
    'bitmain-work-mode': '0',
    'bitmain-freq-level': '100'
  }))
  const out = await miner.getDeviceConfiguration()
  t.is(out.success, true)
  t.is(out.fan_speed, 90)
  t.is(out.frequency, 485)
})

test('getDeviceConfiguration returns error result when request fails', async (t) => {
  const miner = await createMiner(failingFetch())
  const out = await miner.getDeviceConfiguration()
  t.is(out.success, false)
  t.is(out.error, 'ERR_CONN')
})

test('_getMinerConf falls back to empty pools when pools is not an array', async (t) => {
  const miner = await createMiner(async () => res({ 'bitmain-fan-ctrl': true }))
  const out = await miner._getMinerConf()
  t.alike(out.pools, [])
  t.is(out['bitmain-fan-ctrl'], true)
})

test('_getMinerConf returns error result when request fails', async (t) => {
  const miner = await createMiner(failingFetch())
  const out = await miner._getMinerConf()
  t.is(out.success, false)
  t.is(out.error, 'ERR_CONN')
})

test('getFrequency parses bitmain-freq', async (t) => {
  const miner = await createMiner(async () => res({ 'bitmain-freq': '485.5' }))
  t.is(await miner.getFrequency(), 485.5)
})

test('getFrequency returns 0 when request fails', async (t) => {
  const miner = await createMiner(failingFetch())
  t.is(await miner.getFrequency(), 0.0)
})

test('setPowerMode posts miner-mode 1 for SLEEP and 0 for NORMAL', async (t) => {
  const posted = []
  const fetchImpl = async (url, opts) => {
    if (opts && opts.method === 'POST') posted.push(JSON.parse(opts.body))
    return res({ pools: [] })
  }
  const miner = await createMiner(fetchImpl)
  t.alike(await miner.setPowerMode(POWER_MODE.SLEEP), { success: true })
  t.alike(await miner.setPowerMode(POWER_MODE.NORMAL), { success: true })
  await new Promise(resolve => setImmediate(resolve))
  t.is(posted[0]['miner-mode'], 1)
  t.is(posted[1]['miner-mode'], 0)
})

test('setPowerMode rejects invalid mode', async (t) => {
  const miner = await createMiner(failingFetch())
  const out = await miner.setPowerMode('turbo')
  t.is(out.success, false)
  t.is(out.error, 'ERR_INVALID_MODE')
})

test('setFan posts fan-ctrl and reports request status', async (t) => {
  let body
  const miner = await createMiner(async (url, opts) => {
    if (opts && opts.method === 'POST') body = JSON.parse(opts.body)
    return res({ pools: [] })
  })
  t.alike(await miner.setFan(true), { success: true })
  t.is(body['bitmain-fan-ctrl'], true)
})

test('setFan returns error result when request fails', async (t) => {
  const miner = await createMiner(failingFetch())
  const out = await miner.setFan(true)
  t.is(out.success, false)
  t.is(out.error, 'ERR_CONN')
})

test('setFanSpeed posts stringified speed', async (t) => {
  let body
  const miner = await createMiner(async (url, opts) => {
    if (opts && opts.method === 'POST') body = JSON.parse(opts.body)
    return res({ pools: [] })
  })
  t.alike(await miner.setFanSpeed(75), { success: true })
  t.is(body['bitmain-fan-pwn'], '75')
})

test('setFanSpeed returns error result when request fails', async (t) => {
  const miner = await createMiner(failingFetch())
  const out = await miner.setFanSpeed(75)
  t.is(out.success, false)
})

test('getPowerValue parses power reading for supported types', async (t) => {
  const miner = await createMiner(async () => res('miner power:3500'), { type: 's21' })
  t.alike(await miner.getPowerValue(), { success: true, power: 3500 })
})

test('getPowerValue returns error result for supported type when request fails', async (t) => {
  const miner = await createMiner(failingFetch(), { type: 's19xp_h' })
  const out = await miner.getPowerValue()
  t.is(out.success, false)
  t.is(out.error, 'ERR_CONN')
})

test('getPowerValue returns undefined power for unsupported types', async (t) => {
  const miner = await createMiner(failingFetch(), { type: 's19xp' })
  t.alike(await miner.getPowerValue(), { success: true, power: undefined })
})

test('getNetworkInformation maps DHCP config', async (t) => {
  const miner = await createMiner(async () => res({
    nettype: 'DHCP',
    ipaddress: '10.0.0.2',
    macaddr: 'aa:bb',
    conf_hostname: 'am1',
    netmask: '255.255.255.0'
  }))
  const out = await miner.getNetworkInformation()
  t.is(out.type, 'dhcp')
  t.is(out.network.gateway, undefined)
  t.is(out.network.dns, undefined)
})

test('getNetworkInformation maps static config with dns list', async (t) => {
  const miner = await createMiner(async () => res({
    nettype: 'Static',
    ipaddress: '10.0.0.2',
    macaddr: 'aa:bb',
    conf_hostname: 'am1',
    netmask: '255.255.255.0',
    conf_gateway: '10.0.0.1',
    conf_dnsservers: '1.1.1.1,8.8.8.8'
  }))
  const out = await miner.getNetworkInformation()
  t.is(out.type, 'static')
  t.is(out.network.gateway, '10.0.0.1')
  t.alike(out.network.dns, ['1.1.1.1', '8.8.8.8'])
})

test('getNetworkInformation returns error result when request fails', async (t) => {
  const miner = await createMiner(failingFetch())
  const out = await miner.getNetworkInformation()
  t.is(out.success, false)
})

test('setNetworkInformation posts static settings', async (t) => {
  let body
  const miner = await createMiner(async (url, opts) => {
    body = JSON.parse(opts.body)
    return res({})
  })
  const out = await miner.setNetworkInformation({
    type: 'static',
    network: {
      hostname: 'am1',
      ip: '10.0.0.2',
      mask: '255.255.255.0',
      gateway: '10.0.0.1',
      dns: ['1.1.1.1', '8.8.8.8']
    }
  })
  t.alike(out, { success: true })
  t.is(body.ipPro, 2)
  t.is(body.ipDns, '1.1.1.1,8.8.8.8')
})

test('setNetworkInformation posts empty fields for dhcp', async (t) => {
  let body
  const miner = await createMiner(async (url, opts) => {
    body = JSON.parse(opts.body)
    return res({})
  })
  const out = await miner.setNetworkInformation({
    type: 'dhcp',
    network: { hostname: 'am1' }
  })
  t.alike(out, { success: true })
  t.is(body.ipPro, 1)
  t.is(body.ipAddress, '')
  t.is(body.ipDns, '')
})

test('setNetworkInformation returns error result when request fails', async (t) => {
  const miner = await createMiner(failingFetch())
  const out = await miner.setNetworkInformation({ type: 'dhcp', network: { hostname: 'am1' } })
  t.is(out.success, false)
})

test('setPools skips update when pools are unchanged', async (t) => {
  const miner = await createMiner(async (url) => {
    if (url.includes('pools.cgi')) {
      return res({
        POOLS: [
          { index: 0, url: 'stratum+tcp://p1:3333', user: 'w.dev1', status: 'Alive' },
          { index: 1, url: '', user: '', status: 'Dead' },
          { index: 2, url: '', user: '', status: 'Dead' }
        ]
      })
    }
    return res({ pools: [] })
  }, { id: 'dev1' })
  const out = await miner.setPools([{ url: 'stratum+tcp://p1:3333', worker_name: 'w', worker_password: 'x' }])
  t.is(out.success, true)
  t.is(out.message, 'Pools are same, skipping')
})

test('setPools posts new pools and triggers reboot', async (t) => {
  const calls = []
  const miner = await createMiner(async (url, opts) => {
    calls.push(url)
    if (url.includes('pools.cgi')) return res({ POOLS: [] })
    if (opts && opts.method === 'POST') {
      const body = JSON.parse(opts.body)
      t.is(body.pools.length, 3)
      t.is(body.pools[0].user, 'w.dev1')
      return res({})
    }
    return res({ pools: [] })
  }, { id: 'dev1' })
  const out = await miner.setPools([{ url: 'stratum+tcp://p2:3333', worker_name: 'w', worker_password: 'x' }])
  t.is(out.success, true)
  await new Promise(resolve => setImmediate(resolve))
  t.ok(calls.some(url => url.includes('reboot.cgi')))
})

test('setPools returns error result for non-array pools', async (t) => {
  const miner = await createMiner(failingFetch())
  const out = await miner.setPools('not-pools')
  t.is(out.success, false)
  t.is(out.error, 'ERR_INVALID_ARG_TYPE')
})

test('setFrequency posts stringified frequency', async (t) => {
  let body
  const miner = await createMiner(async (url, opts) => {
    if (opts && opts.method === 'POST') body = JSON.parse(opts.body)
    return res({ pools: [] })
  })
  t.alike(await miner.setFrequency(485), { success: true })
  t.is(body['bitmain-freq'], '485')
})

test('setFrequency returns error result when request fails', async (t) => {
  const miner = await createMiner(failingFetch())
  const out = await miner.setFrequency(485)
  t.is(out.success, false)
  t.is(out.error, 'ERR_CONN')
})

test('setLED schedules auto-off when enabling and reports response status', async (t) => {
  let body
  const miner = await createMiner(async (url, opts) => {
    body = JSON.parse(opts.body)
    return res({})
  })
  t.alike(await miner.setLED(true), { success: true })
  t.is(body.blink, true)
  t.alike(await miner.setLED(false), { success: true })
  t.is(body.blink, false)
})

test('setLED returns error result when request fails', async (t) => {
  const miner = await createMiner(failingFetch())
  const out = await miner.setLED(false)
  t.is(out.success, false)
})

test('getLED returns error result when request fails', async (t) => {
  const miner = await createMiner(failingFetch())
  const out = await miner.getLED()
  t.is(out.success, false)
  t.is(out.error, 'ERR_CONN')
})

test('updateFirmware is not implemented', async (t) => {
  const miner = await createMiner(failingFetch())
  await t.exception(miner.updateFirmware('fw.bin'), /ERR_NOT_IMPL/)
})

test('updateAdminPassword updates stored password on P000', async (t) => {
  const miner = await createMiner(async () => res({ code: 'P000' }))
  t.alike(await miner.updateAdminPassword('newpass'), { success: true })
  t.is(miner.opts.password, 'newpass')
})

test('updateAdminPassword returns device code on failure', async (t) => {
  const miner = await createMiner(async () => res({ code: 'P001' }))
  const out = await miner.updateAdminPassword('newpass')
  t.is(out.success, false)
  t.is(out.error, 'P001')
})

test('updateAdminPassword returns error result when request fails', async (t) => {
  const miner = await createMiner(failingFetch())
  const out = await miner.updateAdminPassword('newpass')
  t.is(out.success, false)
  t.is(out.error, 'ERR_CONN')
})

test('_prepErrors flags all_pools_dead when every pool is dead', async (t) => {
  const miner = await createMiner(failingFetch())
  const out = miner._prepErrors({
    pools: [{ status: 'Dead' }, { status: 'Dead' }],
    errors: { errors: [] }
  })
  t.is(out.isErrored, true)
  t.is(out.errors[0].name, 'all_pools_dead')
})

test('_calcPowerW floors parsed power to 2 decimals', async (t) => {
  const miner = await createMiner(failingFetch())
  t.is(miner._calcPowerW({ power: '123.456' }), 123.45)
})

test('_calcHashrates floors summary rates', async (t) => {
  const miner = await createMiner(failingFetch())
  t.alike(miner._calcHashrates({ mhs_av: 100.129, mhs_5s: 90.111, mhs_30m: 95.555 }), {
    avg: 100.12,
    t_5s: 90.11,
    t_5m: 95.55,
    t_30m: 95.55
  })
})

test('_calcEfficiency returns undefined when power is missing for s19xp_h', async (t) => {
  const miner = await createMiner(failingFetch(), { type: 's19xp_h' })
  t.is(miner._calcEfficiency({ power: undefined }, { mhs_av: 100 }), undefined)
})

test('_prepSnap reports error status and errors when device has warnings', async (t) => {
  const miner = await createMiner(async (url) => {
    if (url.includes('summary.cgi')) {
      return res({ SUMMARY: [{ rate_avg: 100, rate_5s: 90, rate_30m: 95, elapsed: 10, bestshare: 1 }] })
    }
    if (url.includes('stats.cgi')) {
      return res({
        STATS: [{
          'miner-mode': '0',
          rate_avg: 100,
          rate_5s: 90,
          rate_30m: 95,
          chain: [{
            freq_avg: 500,
            rate_real: 80,
            rate_ideal: 110,
            hw: 0,
            temp_pic: [40, 45, 50, 55],
            temp_pcb: [50, 51, 52, 53],
            temp_chip: [60, 61, 62, 63]
          }]
        }]
      })
    }
    if (url.includes('pools.cgi')) {
      return res({
        POOLS: [{ index: 0, url: 'stratum+tcp://p1:3333', user: 'w', status: 'Alive', accepted: '10', rejected: '1', stale: '0' }]
      })
    }
    if (url.includes('get_miner_conf.cgi')) {
      return res({
        pools: [{ url: 'stratum+tcp://p1:3333', user: 'w', pass: 'x' }],
        'bitmain-fan-ctrl': false,
        'bitmain-fan-pwm': '100',
        'bitmain-freq': '485',
        'bitmain-voltage': '1980',
        'bitmain-ccdelay': '0',
        'bitmain-work-mode': '0',
        'bitmain-freq-level': '100'
      })
    }
    if (url.includes('get_network_info.cgi')) {
      return res({ nettype: 'DHCP', ipaddress: '10.0.0.2', macaddr: 'aa:bb', conf_hostname: 'am1', netmask: '255.255.255.0' })
    }
    if (url.includes('get_blink_status.cgi')) return res({ blink: false })
    if (url.includes('miner_type.cgi')) return res({ miner_type: 'Antminer S21', fw_version: 'fw-1' })
    if (url.includes('/warning')) return res({ error_message: 'P:2' })
    if (url.includes('/miner_power')) return res('miner power:3500')
    throw new Error('ERR_UNEXPECTED_URL')
  }, { type: 's21', nominalEfficiencyWThs: 17.5 })

  const snap = await miner._prepSnap()
  t.is(snap.stats.status, STATUS.ERROR)
  t.is(snap.stats.errors.length, 1)
  t.is(snap.stats.errors[0].name, 'low_temp_protection')
  t.is(snap.stats.nominal_efficiency_w_ths, 17.5)
  t.is(snap.stats.power_w, 3500)
  t.is(snap.stats.uptime_ms, 10000)
  t.is(snap.config.power_mode, POWER_MODE.NORMAL)
  t.is(snap.config.suspended, false)
  t.is(snap.config.firmware_ver, 'fw-1')
  t.is(snap.config.network_config.mode, 'dhcp')
})
