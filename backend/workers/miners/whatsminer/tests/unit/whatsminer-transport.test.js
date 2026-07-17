'use strict'

const test = require('brittle')
const CryptoJS = require('crypto-js')
const Whatsminer = require('../../lib/whatsminer')
const { STATUS } = require('../../../../../core/mdk').constants

const TOKEN = { sign: 'test-sign', key: 'test-key' }

function makeWhatsminer (responses = [], opts = {}) {
  const requests = []
  const mockRpc = {
    request: async (payload) => {
      requests.push(payload)
      const res = responses.shift()
      if (res instanceof Error) throw res
      return res
    },
    stop: async () => { mockRpc.stopped = true }
  }
  const socketer = {
    readStrategy: 'on_end',
    rpc: () => mockRpc
  }
  const miner = new Whatsminer({
    socketer,
    address: '127.0.0.1',
    port: 4028,
    password: 'admin',
    type: 'miner-wm-m56s',
    id: 'test-miner-1',
    conf: {},
    ...opts
  })
  return { miner, requests, mockRpc }
}

// mirrors the device-side envelope: AES-ECB over SHA256(key), hex plaintext
function encryptedFrame (data, key = TOKEN.key) {
  const enc = CryptoJS.AES.encrypt(JSON.stringify(data), CryptoJS.SHA256(key), { mode: CryptoJS.mode.ECB }).toString()
  return JSON.stringify({ enc })
}

function stubToken (miner) {
  let refreshes = 0
  miner._refreshToken = async () => {
    refreshes++
    miner.token = { ...TOKEN }
  }
  return () => refreshes
}

test('close - stops the rpc client', async (t) => {
  const { miner, mockRpc } = makeWhatsminer()
  await miner.close()
  t.ok(mockRpc.stopped)
})

test('_requestMiner - parses json responses and updates last seen', async (t) => {
  const { miner, requests } = makeWhatsminer(['{"a":1}'])
  t.is(miner.isThingOnline(), false)
  t.alike(await miner._requestMiner({ cmd: 'x' }), { a: 1 })
  t.is(requests[0], '{"cmd":"x"}')
  t.is(miner.isThingOnline(), true)
})

test('_requestMiner - returns raw response when json disabled', async (t) => {
  const { miner } = makeWhatsminer(['raw-bytes'])
  t.is(await miner._requestMiner({ cmd: 'x' }, false), 'raw-bytes')
})

test('_requestReadEndpoint - wraps transport failures as ERR_READ_FAILED', async (t) => {
  const { miner } = makeWhatsminer([new Error('ECONNREFUSED')])
  await t.exception(miner._requestReadEndpoint('summary'), /ERR_READ_FAILED/)
})

test('_getToken - derives token from salt handshake', async (t) => {
  const { miner } = makeWhatsminer()
  miner._requestReadEndpoint = async (cmd) => {
    t.is(cmd, 'get_token')
    return { Code: 131, Msg: { time: '0000', salt: '5QAHiKMb', newsalt: 'kowEj187' } }
  }
  const token = await miner._getToken()
  t.ok(token.token.startsWith('0000,kowEj187,'))
  t.is(token.token, `0000,kowEj187,${token.sign}`)
  t.is(typeof token.key, 'string')
  t.ok(token.key.length > 0)
  t.absent(token.key.includes('$'))
})

test('_getToken - throws on fetch limit code 136', async (t) => {
  const { miner } = makeWhatsminer()
  miner._requestReadEndpoint = async () => ({ Code: 136 })
  await t.exception(miner._getToken(), /ERR_TOKEN_FETCH_IP_LIMIT/)
})

test('_refreshToken - caches token and rethrows failures', async (t) => {
  const { miner } = makeWhatsminer()
  miner._getToken = async () => ({ token: 't', sign: 's', key: 'k' })
  await miner._refreshToken()
  t.alike(miner.token, { token: 't', sign: 's', key: 'k' })

  miner._getToken = async () => { throw new Error('ERR_TOKEN_FETCH_IP_LIMIT') }
  await t.exception(miner._refreshToken(), /ERR_TOKEN_FETCH_IP_LIMIT/)
})

test('_requestWriteEndpoint - empty response resolves null', async (t) => {
  const { miner } = makeWhatsminer([''])
  stubToken(miner)
  t.is(await miner._requestWriteEndpoint('reboot', { respbefore: 'true' }, false), null)
})

test('_requestWriteEndpoint - unencrypted error response retries then throws', async (t) => {
  const { miner } = makeWhatsminer([
    JSON.stringify({ Code: 45, Msg: 'Permission denied' }),
    JSON.stringify({ Code: 45, Msg: 'Permission denied' }),
    JSON.stringify({ Code: 45, Msg: 'Permission denied' })
  ])
  const refreshes = stubToken(miner)
  await t.exception(miner._requestWriteEndpoint('power_on'), /Permission denied/)
  t.is(refreshes(), 3)
  t.is(miner.token, undefined)
})

test('_requestWriteEndpoint - retries on stale token code 135 then succeeds', async (t) => {
  const { miner } = makeWhatsminer([
    encryptedFrame({ Code: 135, Msg: 'check token err' }),
    encryptedFrame({ Code: 131, Msg: 'API command OK' })
  ])
  const refreshes = stubToken(miner)
  const res = await miner._requestWriteEndpoint('power_on')
  t.is(res.Code, 131)
  t.is(refreshes(), 2)
})

test('_requestWriteEndpoint - exhausts retries on persistent code 135', async (t) => {
  const { miner } = makeWhatsminer([
    encryptedFrame({ Code: 135 }),
    encryptedFrame({ Code: 135 }),
    encryptedFrame({ Code: 135 })
  ])
  stubToken(miner)
  t.is(await miner._requestWriteEndpoint('power_on'), null)
})

test('_requestWriteFirmwareEndpoint - encrypts command and targets miner platform', async (t) => {
  const { miner } = makeWhatsminer()
  stubToken(miner)
  miner.getVersion = async () => ({ chip: 'c', platform: 'H616', whatsminer: { api: '2', firmware: 'f' } })
  let captured = null
  miner._requestUpdateMiner = async (command, file, key, platform) => {
    captured = { command: JSON.parse(command), file, key, platform }
    return { Code: 131, Msg: 'ok' }
  }
  const res = await miner._requestWriteFirmwareEndpoint('/tmp/fw.bin')
  t.is(res.Code, 131)
  t.is(captured.file, '/tmp/fw.bin')
  t.is(captured.key, TOKEN.key)
  t.is(captured.platform, 'h616')
  t.is(captured.command.enc, 1)
  t.is(typeof captured.command.data, 'string')
})

test('getDevices / getDevicesInfo / getErrors / getMinerInfo - tolerate empty responses', async (t) => {
  const { miner } = makeWhatsminer()
  miner._requestReadEndpoint = async () => ({})
  t.is(await miner.getDevices(), undefined)
  t.is(await miner.getDevicesInfo(), undefined)
  t.is(await miner.getErrors(), undefined)
  t.is(await miner.getMinerInfo(), undefined)
})

function stubSnapReads (miner, { errors, minerInfo }) {
  miner.getMinerStats = async () => ({
    elapsed: '100',
    mhs_av: '295000000',
    mhs_5s: '294000000',
    mhs_1m: '295000000',
    mhs_5m: '296000000',
    mhs_15m: '293000000',
    freq_avg: '808.5',
    target_freq: '720',
    env_temp: '35.5',
    power: '3300.7',
    power_rate: '30.05',
    power_mode: 'Normal'
  })
  miner.getPools = async () => [{ url: 'stratum+tcp://p1:1', user: 'w1', accepted: '5', rejected: '1', stale: '0' }]
  miner.getDevices = async () => [{
    chip_frequency: '535.5',
    temperature: '68.2',
    chip_temp_min: '60.1',
    chip_temp_max: '70.9',
    chip_temp_avg: '65.5'
  }]
  miner.getErrors = async () => errors
  miner.getMinerInfo = async () => minerInfo
  miner.getVersion = async () => ({ chip: 'c', platform: 'H616', whatsminer: { api: '2.0.5', firmware: '20230714.15.Rel' } })
}

const BASE_MINER_INFO = {
  proto: 'dhcp',
  ip: '10.0.0.5',
  dns: '1.1.1.1 8.8.8.8',
  gateway: '10.0.0.1',
  netmask: '255.255.255.0',
  ledstat: 'auto'
}

test('_prepSnap - healthy miner snapshot', async (t) => {
  const { miner } = makeWhatsminer()
  stubSnapReads(miner, { errors: [], minerInfo: { ...BASE_MINER_INFO } })

  const snap = await miner._prepSnap()
  t.is(snap.stats.status, STATUS.MINING)
  t.is(snap.stats.errors, undefined)
  t.is(snap.stats.are_all_errors_minor, false)
  t.is(snap.stats.power_w, 3300.7)
  t.is(snap.stats.uptime_ms, 100000)
  t.is(snap.stats.miner_specific.upfreq_speed, undefined)
  t.alike(snap.stats.all_pools_shares, { accepted: 5, rejected: 1, stale: 0 })
  t.alike(snap.config.network_config.dns, ['1.1.1.1', '8.8.8.8'])
  t.is(snap.config.power_mode, 'normal')
  t.is(snap.config.suspended, false)
  t.is(snap.config.led_status, false)
  t.is(snap.config.firmware_ver, '20230714.15.Rel')
})

test('_prepSnap - errored miner snapshot includes errors and upfreq speed', async (t) => {
  const { miner } = makeWhatsminer()
  const errors = [{ name: 'power_protecting', message: 'Error code 203', code: '203' }]
  stubSnapReads(miner, {
    errors,
    minerInfo: { ...BASE_MINER_INFO, ledstat: 'manual', upfreq_speed: '5' }
  })

  const snap = await miner._prepSnap()
  t.is(snap.stats.status, STATUS.ERROR)
  t.alike(snap.stats.errors, errors)
  t.is(snap.stats.are_all_errors_minor, false)
  t.is(snap.stats.miner_specific.upfreq_speed, 5)
  t.is(snap.config.led_status, true)
  t.alike(miner._errorLog, errors)
})
