'use strict'

const test = require('brittle')
const Whatsminer = require('../../lib/whatsminer')

function makeWhatsminer (opts = {}) {
  const mockRpc = { request: async () => '{}', stop: async () => {} }
  const socketer = {
    readStrategy: 'on_end',
    rpc: () => mockRpc
  }
  return new Whatsminer({
    socketer,
    address: '127.0.0.1',
    port: 4028,
    password: 'admin',
    type: 'miner-wm-m56s',
    id: 'test-miner-1',
    conf: {},
    ...opts
  })
}

// stubs _requestWriteEndpoint, records calls, resolves per-command results
function stubWrite (miner, results = {}) {
  const calls = []
  miner._requestWriteEndpoint = async (cmd, params, json) => {
    calls.push({ cmd, params, json })
    const res = results[cmd] !== undefined ? results[cmd] : { Code: 131 }
    if (res instanceof Error) throw res
    return res
  }
  return calls
}

function stubWriteFail (miner, msg = 'ERR_WRITE_FAILED') {
  miner._requestWriteEndpoint = async () => { throw new Error(msg) }
}

const flush = () => new Promise(resolve => setImmediate(resolve))

test('restartMinerSoftware - success and failure', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  t.alike(await miner.restartMinerSoftware(), { success: true })
  t.is(calls[0].cmd, 'restart_btminer')

  stubWriteFail(miner)
  const res = await miner.restartMinerSoftware()
  t.is(res.success, false)
  t.is(res.error_msg, 'ERR_WRITE_FAILED')
})

test('factoryReset - success and failure', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  t.alike(await miner.factoryReset(), { success: true })
  t.is(calls[0].cmd, 'factory_reset')

  stubWriteFail(miner)
  t.is((await miner.factoryReset()).success, false)
})

test('updateAdminPassword - success updates stored password', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  t.alike(await miner.updateAdminPassword('newpass'), { success: true })
  t.is(calls[0].cmd, 'update_pwd')
  t.alike(calls[0].params, { old: 'admin', new: 'newpass' })
  t.is(miner.opts.password, 'newpass')
})

test('updateAdminPassword - failure', async (t) => {
  const miner = makeWhatsminer()
  stubWriteFail(miner)
  const res = await miner.updateAdminPassword('newpass')
  t.is(res.success, false)
  t.is(res.error_msg, 'ERR_WRITE_FAILED')
})

test('enableWebPools / disableWebPools - success and failure', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  t.alike(await miner.enableWebPools(), { success: true })
  t.alike(await miner.disableWebPools(), { success: true })
  t.is(calls[0].cmd, 'enable_web_pools')
  t.is(calls[1].cmd, 'disable_web_pools')

  stubWriteFail(miner)
  t.is((await miner.enableWebPools()).success, false)
  t.is((await miner.disableWebPools()).success, false)
})

test('setHostname - success and failure', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  t.alike(await miner.setHostname('rig-7'), { success: true })
  t.alike(calls[0].params, { hostname: 'rig-7' })

  stubWriteFail(miner)
  t.is((await miner.setHostname('rig-7')).success, false)
})

test('setZone - success and failure', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  t.alike(await miner.setZone('UTC-8', 'Asia/Shanghai'), { success: true })
  t.alike(calls[0].params, { timezone: 'UTC-8', zonename: 'Asia/Shanghai' })

  stubWriteFail(miner)
  t.is((await miner.setZone('UTC-8', 'Asia/Shanghai')).success, false)
})

test('reboot - fire-and-forget returns success, swallows write errors', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  t.alike(miner.reboot(), { success: true })
  await flush()
  t.is(calls[0].cmd, 'reboot')
  t.alike(calls[0].params, { respbefore: 'true' })
  t.is(calls[0].json, false)

  stubWriteFail(miner)
  t.alike(miner.reboot(), { success: true })
  await flush()
})

test('suspendMining - fire-and-forget power_off, swallows write errors', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  t.alike(miner.suspendMining(), { success: true })
  await flush()
  t.is(calls[0].cmd, 'power_off')

  stubWriteFail(miner)
  t.alike(miner.suspendMining(), { success: true })
  await flush()
})

test('resumeMining - success and failure', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  t.alike(await miner.resumeMining(), { success: true })
  t.is(calls[0].cmd, 'power_on')

  stubWriteFail(miner)
  t.is((await miner.resumeMining()).success, false)
})

test('prePowerOn - polls until complete, tolerating failed polls', async (t) => {
  const miner = makeWhatsminer()
  const responses = [
    new Error('ERR_WRITE_FAILED'),
    { Code: 131, Msg: { complete: 'false' } },
    { Code: 131, Msg: { complete: 'true' } }
  ]
  miner._requestWriteEndpoint = async (cmd) => {
    t.is(cmd, 'pre_power_on')
    const res = responses.shift()
    if (res instanceof Error) throw res
    return res
  }
  t.alike(await miner.prePowerOn(), { success: true })
  t.is(responses.length, 0)
})

test('setTempOffset - success and failure', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  t.alike(await miner.setTempOffset(-2), { success: true })
  t.alike(calls[0].params, { temp_offset: -2 })

  stubWriteFail(miner)
  t.is((await miner.setTempOffset(-2)).success, false)
})

test('setPowerOffCool - maps boolean state to flag', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  t.alike(await miner.setPowerOffCool(true), { success: true })
  t.alike(await miner.setPowerOffCool(false), { success: true })
  t.alike(calls[0].params, { poweroff_cool: '1' })
  t.alike(calls[1].params, { poweroff_cool: '0' })

  stubWriteFail(miner)
  t.is((await miner.setPowerOffCool(true)).success, false)
})

test('setFanZeroSpeed - maps boolean state to flag', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  t.alike(await miner.setFanZeroSpeed(true), { success: true })
  t.alike(await miner.setFanZeroSpeed(false), { success: true })
  t.alike(calls[0].params, { fan_zero_speed: '1' })
  t.alike(calls[1].params, { fan_zero_speed: '0' })

  stubWriteFail(miner)
  t.is((await miner.setFanZeroSpeed(true)).success, false)
})

test('setFrequency - success and failure', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  t.alike(await miner.setFrequency(-10), { success: true })
  t.is(calls[0].cmd, 'set_target_freq')
  t.alike(calls[0].params, { percent: -10 })

  stubWriteFail(miner)
  t.is((await miner.setFrequency(-10)).success, false)
})

test('enableFastBoot / disableFastBoot - success and failure', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  t.alike(await miner.enableFastBoot(), { success: true })
  t.alike(await miner.disableFastBoot(), { success: true })
  t.is(calls[0].cmd, 'enable_btminer_fast_boot')
  t.is(calls[1].cmd, 'disable_btminer_fast_boot')

  stubWriteFail(miner)
  t.is((await miner.enableFastBoot()).success, false)
  t.is((await miner.disableFastBoot()).success, false)
})

test('setPowerLimit - stringifies power, success and failure', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  t.alike(await miner.setPowerLimit(3300), { success: true })
  t.alike(calls[0].params, { power_limit: '3300' })

  stubWriteFail(miner)
  t.is((await miner.setPowerLimit(3300)).success, false)
})

test('setUpfreqSpeed - stringifies speed, success and failure', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  t.alike(await miner.setUpfreqSpeed(5), { success: true })
  t.alike(calls[0].params, { upfreq_speed: '5' })

  stubWriteFail(miner)
  t.is((await miner.setUpfreqSpeed(5)).success, false)
})

test('setPowerMode - power_on OK triggers set_<mode>_power', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  t.alike(await miner.setPowerMode('low'), { success: true })
  await flush()
  t.is(calls[0].cmd, 'power_on')
  t.is(calls[1].cmd, 'set_low_power')
})

test('setPowerMode - power_on not OK skips mode switch', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner, { power_on: { Code: 14 } })
  t.alike(await miner.setPowerMode('normal'), { success: true })
  await flush()
  t.is(calls.length, 1)
})

test('setPowerMode - power_on failure still resolves success', async (t) => {
  const miner = makeWhatsminer()
  stubWriteFail(miner)
  t.alike(await miner.setPowerMode('high'), { success: true })
})

test('setPowerMode - sleep suspends mining', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  t.alike(await miner.setPowerMode('sleep'), { success: true })
  await flush()
  t.is(calls[0].cmd, 'power_off')
})

test('setPowerMode - invalid mode throws', async (t) => {
  const miner = makeWhatsminer()
  stubWrite(miner)
  await t.exception(miner.setPowerMode('turbo'), /ERR_INVALID_MODE/)
})

test('setPowerPct - rejects pct above 200', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  const res = await miner.setPowerPct(250)
  t.is(res.success, false)
  t.ok(res.error_msg.includes('higher than 200%'))
  t.is(calls.length, 0)
})

test('setPowerPct - rejects pct above 100 for air-cooled types', async (t) => {
  const miner = makeWhatsminer({ type: 'miner-wm-m30sp' })
  const calls = stubWrite(miner)
  const res = await miner.setPowerPct(150)
  t.is(res.success, false)
  t.ok(res.error_msg.includes('liquid-cooled'))
  t.is(calls.length, 0)
})

test('setPowerPct - allows pct above 100 for liquid-cooled types', async (t) => {
  const miner = makeWhatsminer({ type: 'miner-wm-m56s' })
  const calls = stubWrite(miner)
  t.alike(await miner.setPowerPct(150), { success: true })
  t.alike(calls[0].params, { percent: '150' })
})

test('setPowerPct - regular pct and failure', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  t.alike(await miner.setPowerPct(90), { success: true })
  t.alike(calls[0].params, { percent: '90' })

  stubWriteFail(miner)
  t.is((await miner.setPowerPct(90)).success, false)
})

test('setLED - enabled fires red+green and schedules auto reset', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  const realSetTimeout = global.setTimeout
  let scheduledMs = null
  global.setTimeout = (fn, ms) => { scheduledMs = ms; return { unref () {} } }
  try {
    t.alike(await miner.setLED(true), { success: true })
  } finally {
    global.setTimeout = realSetTimeout
  }
  t.is(calls.length, 2)
  t.is(calls[0].params.color, 'red')
  t.is(calls[1].params.color, 'green')
  t.is(scheduledMs, 2 * 60 * 1000)
})

test('setLED - disabled sets auto param', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  t.alike(await miner.setLED(false), { success: true })
  t.alike(calls[0].params, { param: 'auto' })
})

test('setLED - write failure returns error_msg', async (t) => {
  const miner = makeWhatsminer()
  stubWriteFail(miner)
  const res = await miner.setLED(false)
  t.is(res.success, false)
  t.is(res.error_msg, 'ERR_WRITE_FAILED')
})

test('setPools - skips when pools are unchanged', async (t) => {
  const miner = makeWhatsminer()
  miner.getPools = async () => [{ url: 'stratum+tcp://p1:1', user: 'w1' }]
  const calls = stubWrite(miner)
  const res = await miner.setPools([{ url: 'stratum+tcp://p1:1', worker_name: 'w1', worker_password: 'x' }], false)
  t.is(res.success, true)
  t.is(res.message, 'Pools are same, skipping')
  t.is(calls.length, 0)
})

test('setPools - updates pools and reboots', async (t) => {
  const miner = makeWhatsminer()
  miner.getPools = async () => []
  let rebooted = false
  miner.reboot = () => { rebooted = true; return { success: true } }
  const calls = stubWrite(miner)
  const res = await miner.setPools([{ url: 'stratum+tcp://p2:2', worker_name: 'w2', worker_password: 'pw' }])
  t.alike(res, { success: true })
  t.ok(rebooted)
  t.is(calls[0].cmd, 'update_pools')
  t.is(calls[0].params.pool1, 'stratum+tcp://p2:2')
  t.is(calls[0].params.worker1, 'w2.test-miner-1')
  t.is(calls[0].params.passwd1, 'pw')
  t.is(calls[0].params.pool2, '')
  t.is(calls[0].params.pool3, '')
})

test('setPools - write failure returns error_msg', async (t) => {
  const miner = makeWhatsminer()
  miner.getPools = async () => []
  stubWriteFail(miner)
  const res = await miner.setPools([{ url: 'stratum+tcp://p2:2', worker_name: 'w2', worker_password: 'pw' }])
  t.is(res.success, false)
  t.is(res.error_msg, 'ERR_WRITE_FAILED')
})

test('getPools - returns empty array when device sends no POOLS', async (t) => {
  const miner = makeWhatsminer()
  miner._requestReadEndpoint = async () => ({})
  t.alike(await miner.getPools(), [])
})

test('updateFirmware - success wraps response, failure returns error_msg', async (t) => {
  const miner = makeWhatsminer()
  miner._requestWriteFirmwareEndpoint = async () => ({ Code: 131, Msg: 'ok' })
  t.alike(await miner.updateFirmware('/tmp/fw.bin'), { data: { Code: 131, Msg: 'ok' } })

  miner._requestWriteFirmwareEndpoint = async () => { throw new Error('ERR_INVALID_FIRMWARE') }
  const res = await miner.updateFirmware('/tmp/fw.bin')
  t.is(res.success, false)
  t.is(res.error_msg, 'ERR_INVALID_FIRMWARE')
})

test('setNetworkInformation - dhcp mode', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  t.alike(await miner.setNetworkInformation({ dhcp: true }), { success: true })
  t.is(calls[0].cmd, 'net_config')
  t.alike(calls[0].params, { param: 'dhcp' })
})

test('setNetworkInformation - static mode', async (t) => {
  const miner = makeWhatsminer()
  const calls = stubWrite(miner)
  const res = await miner.setNetworkInformation({
    dhcp: false,
    network: { ip: '10.0.0.2', mask: '255.255.255.0', gateway: '10.0.0.1' },
    dns: ['1.1.1.1', '8.8.8.8']
  })
  t.alike(res, { success: true })
  t.alike(calls[0].params, {
    ip: '10.0.0.2',
    mask: '255.255.255.0',
    gate: '10.0.0.1',
    dns: '1.1.1.1 8.8.8.8',
    host: ''
  })
})

test('setNetworkInformation - failure returns error_msg', async (t) => {
  const miner = makeWhatsminer()
  stubWriteFail(miner)
  const res = await miner.setNetworkInformation({ dhcp: true })
  t.is(res.success, false)
  t.is(res.error_msg, 'ERR_WRITE_FAILED')
})
