'use strict'

const test = require('brittle')
const { STATUS, POWER_MODE } = require('../../../../../core/mdk').constants

const status = require('../../plugin/src/telemetry/status')
const temperature = require('../../plugin/src/telemetry/temperature')
const uptime = require('../../plugin/src/telemetry/uptime')
const hashrateRt = require('../../plugin/src/telemetry/hashrate-rt')
const hashrateAvg = require('../../plugin/src/telemetry/hashrate-avg')
const power = require('../../plugin/src/telemetry/power')
const powerMode = require('../../plugin/src/telemetry/power-mode')
const poolUrl = require('../../plugin/src/telemetry/pool-url')
const efficiency = require('../../plugin/src/telemetry/efficiency')
const fanSpeedIn = require('../../plugin/src/telemetry/fan-speed-in')
const fanSpeedOut = require('../../plugin/src/telemetry/fan-speed-out')
const acceptedShares = require('../../plugin/src/telemetry/accepted-shares')
const rejectedShares = require('../../plugin/src/telemetry/rejected-shares')
const apiVersion = require('../../plugin/src/telemetry/api-version')
const firmwareInfo = require('../../plugin/src/telemetry/firmware-info')
const deviceInfo = require('../../plugin/src/telemetry/device-info')
const psuInfo = require('../../plugin/src/telemetry/psu-info')
const minerStats = require('../../plugin/src/telemetry/miner-stats')
const hashboards = require('../../plugin/src/telemetry/hashboards')
const poolsTelemetry = require('../../plugin/src/telemetry/pools')
const errorsTelemetry = require('../../plugin/src/telemetry/errors')
const snap = require('../../plugin/src/telemetry/snap')
const commandResult = require('../../plugin/src/commands/command-result')
const setPowerPct = require('../../plugin/src/commands/set-power-pct')
const setupPools = require('../../plugin/src/commands/setup-pools')
const downloadLogs = require('../../plugin/src/commands/download-logs')
const setNetwork = require('../../plugin/src/commands/set-network')
const setHostname = require('../../plugin/src/commands/set-hostname')
const updateFirmware = require('../../plugin/src/commands/update-firmware')
const crypto = require('node:crypto')

function makeCtx ({ stats = {}, errors = [], pools = [], devices = [], info = {}, psu = {}, version = {} } = {}) {
  const device = {
    apiVersion: '3.0.0',
    fetchDeviceData: (fn) => fn(),
    getMinerStats: async () => stats,
    getErrors: async () => errors,
    getPools: async () => pools,
    getDevices: async () => devices,
    getMinerInfo: async () => info,
    getPSUInformation: async () => psu,
    getVersion: async () => version,
    getSnap: async () => ({ success: true, stats: { status: 'mining' } })
  }
  return { device }
}

test('telemetry/status - error, mining and sleeping states', async (t) => {
  t.is(await status(makeCtx({ errors: [{ code: '203' }] })), STATUS.ERROR)
  t.is(await status(makeCtx({ stats: { mhs_av: '295000000' } })), STATUS.MINING)
  t.is(await status(makeCtx({ stats: { mhs_av: '0' } })), STATUS.SLEEPING)
  t.is(await status(makeCtx({ errors: undefined, stats: { mhs_av: undefined } })), STATUS.SLEEPING)
})

test('telemetry/temperature - parses value with zero fallback', async (t) => {
  t.is(await temperature(makeCtx({ stats: { temperature: '68.5' } })), 68.5)
  t.is(await temperature(makeCtx({ stats: {} })), 0)
})

test('telemetry/uptime - prefers uptime, falls back to elapsed then zero', async (t) => {
  t.is(await uptime(makeCtx({ stats: { uptime: '500', elapsed: '100' } })), 500)
  t.is(await uptime(makeCtx({ stats: { uptime: '0', elapsed: '100' } })), 100)
  t.is(await uptime(makeCtx({ stats: {} })), 0)
})

test('telemetry/hashrate-rt - converts MHS to THS floored', async (t) => {
  t.is(await hashrateRt(makeCtx({ stats: { hs_rt: '295123456' } })), 295.12)
  t.is(await hashrateRt(makeCtx({ stats: {} })), 0)
})

test('telemetry/hashrate-avg - converts MHS to THS floored', async (t) => {
  t.is(await hashrateAvg(makeCtx({ stats: { mhs_av: '295123456' } })), 295.12)
  t.is(await hashrateAvg(makeCtx({ stats: {} })), 0)
})

test('telemetry/power - floors watts with zero fallback', async (t) => {
  t.is(await power(makeCtx({ stats: { power: '3456.789' } })), 3456.78)
  t.is(await power(makeCtx({ stats: {} })), 0)
})

test('telemetry/power-mode - sleep when idle, lowercased mode otherwise', async (t) => {
  t.is(await powerMode(makeCtx({ stats: { mhs_av: '0', power_mode: 'Normal' } })), POWER_MODE.SLEEP)
  t.is(await powerMode(makeCtx({ stats: { mhs_av: '295000000', power_mode: 'High' } })), 'high')
  t.is(await powerMode(makeCtx({ stats: { mhs_av: '295000000' } })), undefined)
})

test('telemetry/pool-url - first pool url with empty fallback', async (t) => {
  t.is(await poolUrl(makeCtx({ pools: [{ url: 'stratum+tcp://p1:1' }] })), 'stratum+tcp://p1:1')
  t.is(await poolUrl(makeCtx({ pools: [] })), '')
})

test('telemetry/efficiency - floors power rate with zero fallback', async (t) => {
  t.is(await efficiency(makeCtx({ stats: { power_rate: '30.059' } })), 30.05)
  t.is(await efficiency(makeCtx({ stats: {} })), 0)
})

test('telemetry/fan speeds - parse with zero fallback', async (t) => {
  t.is(await fanSpeedIn(makeCtx({ stats: { fan_speed_in: '4500' } })), 4500)
  t.is(await fanSpeedIn(makeCtx({ stats: {} })), 0)
  t.is(await fanSpeedOut(makeCtx({ stats: { fan_speed_out: '4620' } })), 4620)
  t.is(await fanSpeedOut(makeCtx({ stats: {} })), 0)
})

test('telemetry/shares - parse integers with zero fallback', async (t) => {
  t.is(await acceptedShares(makeCtx({ stats: { accepted: '42' } })), 42)
  t.is(await acceptedShares(makeCtx({ stats: {} })), 0)
  t.is(await acceptedShares(makeCtx({ stats: {}, pools: [{ accepted: '313' }, { accepted: '7' }] })), 320)
  t.is(await rejectedShares(makeCtx({ stats: { rejected: '7' } })), 7)
  t.is(await rejectedShares(makeCtx({ stats: {} })), 0)
  t.is(await rejectedShares(makeCtx({ stats: {}, pools: [{ rejected: '2' }, { rejected: '1' }] })), 3)
})

test('telemetry/detailed channels - expose normalized client data', async (t) => {
  const data = {
    stats: { mhs_av: 101847000 },
    errors: [{ code: '203', name: 'Power protection' }],
    pools: [{ url: 'stratum+tcp://p1:1', user: 'worker' }],
    devices: [{ slot: 0, effective_chips: 120 }],
    info: { type: 'M50S', ip: '192.168.2.136' },
    psu: { name: 'P221C', serialNumber: 'PSU-MOCK' },
    version: { platform: 'H616', whatsminer: { firmware: '20260819.mock' } }
  }
  const ctx = makeCtx(data)

  t.is(await apiVersion(ctx), '3.0.0')
  t.alike(await firmwareInfo(ctx), data.version)
  t.alike(await deviceInfo(ctx), data.info)
  t.alike(await psuInfo(ctx), data.psu)
  t.alike(await minerStats(ctx), data.stats)
  t.alike(await hashboards(ctx), data.devices)
  t.alike(await poolsTelemetry(ctx), data.pools)
  t.alike(await errorsTelemetry(ctx), data.errors)
})

test('telemetry/errors - returns an array when a legacy client omits errors', async (t) => {
  t.alike(await errorsTelemetry(makeCtx({ errors: undefined })), [])
})

test('telemetry/snap - delegates to device.getSnap', async (t) => {
  t.alike(await snap(makeCtx()), { success: true, stats: { status: 'mining' } })
})

test('commands/setup-pools - explicit pools honour appendId flag', async (t) => {
  const calls = []
  const ctx = {
    device: {
      setPools: async (pools, appendId) => { calls.push({ pools, appendId }); return { success: true } },
      setupPools: async () => ({ success: true, fromConf: true })
    }
  }
  const pools = [{ url: 'stratum+tcp://p1:1', worker_name: 'w1' }]
  t.alike(await setupPools(ctx, { pools }), { success: true })
  t.alike(await setupPools(ctx, { pools, appendId: false }), { success: true })
  t.is(calls[0].appendId, true)
  t.is(calls[1].appendId, false)
})

test('commands/setup-pools - falls back to configured pools', async (t) => {
  const ctx = {
    device: {
      setPools: async () => { throw new Error('ERR_UNEXPECTED_CALL') },
      setupPools: async () => ({ success: true, fromConf: true })
    }
  }
  t.alike(await setupPools(ctx, {}), { success: true, fromConf: true })
  t.alike(await setupPools(ctx, { pools: [] }), { success: true, fromConf: true })
})

test('commands - device failures become handler errors', async (t) => {
  t.exception(() => commandResult({ success: false, error_msg: 'ERR_API_V3_TIMEOUT' }), /ERR_API_V3_TIMEOUT/)
  t.exception(() => commandResult({ success: false }), /ERR_COMMAND_FAILED/)

  const ctx = {
    device: {
      setPools: async () => ({ success: false, error_msg: 'ERR_NO_PERMISSION' }),
      setupPools: async () => ({ success: false, error_msg: 'ERR_FAIL' })
    }
  }
  await t.exception(setupPools(ctx, { pools: [{ url: 'stratum+tcp://p1:1' }] }), /ERR_NO_PERMISSION/)
  await t.exception(setupPools(ctx, {}), /ERR_FAIL/)
  await t.exception(setupPools(ctx, { pools: {} }), /ERR_INVALID_ARG_TYPE/)
})

test('commands/set-power-pct - validates input before calling the device', async (t) => {
  let calls = 0
  const ctx = {
    device: {
      setPowerPct: async () => { calls++; return { success: true } }
    }
  }

  await t.exception(setPowerPct(ctx, { pct: '90' }), /ERR_INVALID_ARG_TYPE/)
  await t.exception(setPowerPct(ctx, { pct: Number.NaN }), /ERR_INVALID_ARG_TYPE/)
  await t.exception(setPowerPct(ctx, { pct: -1 }), /ERR_POWER_PCT_NOT_SUPPORTED/)
  await t.exception(setPowerPct(ctx, { pct: 201 }), /ERR_POWER_PCT_NOT_SUPPORTED/)
  t.alike(await setPowerPct(ctx, { pct: 90 }), { success: true })
  t.is(calls, 1)
})

test('commands/download-logs - returns archive metadata and surfaces failures', async (t) => {
  const result = {
    success: true,
    filename: 'whatsminer-logs.tgz',
    encoding: 'base64',
    size: 3,
    sha256: 'hash',
    data: 'YWJj'
  }
  t.alike(await downloadLogs({ device: { downloadLogs: async () => result } }, {}), result)
  await t.exception(downloadLogs({
    device: { downloadLogs: async () => ({ success: false, error_msg: 'ERR_LOG_DOWNLOAD_INCOMPLETE' }) }
  }, {}), /ERR_LOG_DOWNLOAD_INCOMPLETE/)
})

test('commands/set-network - validates and normalizes DHCP and static IPv4 settings', async (t) => {
  const calls = []
  const ctx = {
    device: {
      setNetworkInformation: async (network) => {
        calls.push(network)
        return { success: true }
      }
    }
  }

  t.alike(await setNetwork(ctx, { network: { dhcp: true } }), { success: true })
  t.alike(await setNetwork(ctx, {
    network: {
      dhcp: false,
      ip: '192.168.2.20',
      netmask: '255.255.255.0',
      gateway: '192.168.2.1',
      dns: ['192.168.2.53', '192.168.2.54']
    }
  }), { success: true })
  t.alike(calls, [
    { dhcp: true },
    {
      dhcp: false,
      ip: '192.168.2.20',
      netmask: '255.255.255.0',
      gateway: '192.168.2.1',
      dns: '192.168.2.53 192.168.2.54'
    }
  ])

  await t.exception(setNetwork(ctx, { network: { dhcp: false } }), /ERR_NETWORK_ADDRESS_INVALID/)
  await t.exception(setNetwork(ctx, { network: { dhcp: false, ip: 'not-an-ip' } }), /ERR_NETWORK_ADDRESS_INVALID/)
  await t.exception(setNetwork(ctx, {}), /ERR_NETWORK_CONFIG_INVALID/)
})

test('commands/set-hostname - validates before calling the device', async (t) => {
  const calls = []
  const ctx = { device: { setHostname: async (value) => { calls.push(value); return { success: true } } } }
  t.alike(await setHostname(ctx, { hostname: 'WhatsMiner-136' }), { success: true })
  t.alike(calls, ['WhatsMiner-136'])
  await t.exception(setHostname(ctx, { hostname: '-invalid' }), /ERR_HOSTNAME_INVALID/)
})

test('commands/update-firmware - decodes verified firmware before calling the device', async (t) => {
  const content = Buffer.from('mock firmware payload')
  const firmware = {
    filename: 'whatsminer-h616.bin',
    encoding: 'base64',
    size: content.length,
    sha256: crypto.createHash('sha256').update(content).digest('hex'),
    data: content.toString('base64')
  }
  let uploaded
  const result = await updateFirmware({
    device: {
      conf: {},
      updateFirmware: async (data) => { uploaded = data; return { success: true, size: data.length } }
    }
  }, { firmware })
  t.ok(uploaded.equals(content))
  t.is(result.filename, firmware.filename)
  t.is(result.sourceSha256, firmware.sha256)

  await t.exception(updateFirmware({ device: { conf: {} } }, {
    firmware: { ...firmware, sha256: '0'.repeat(64) }
  }), /ERR_FIRMWARE_SHA256_MISMATCH/)
})
