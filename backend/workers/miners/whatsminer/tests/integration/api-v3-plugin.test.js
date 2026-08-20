'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')
const test = require('brittle')
const plugin = require('../../plugin')
const apiV3Mock = require('../../mock/api-v3-server')
const { startWhatsminerWorker } = require('../..')
const WhatsminerApiV2Client = require('../../lib/whatsminer-api-v2-client')
const WhatsminerApiV3Client = require('../../lib/whatsminer-api-v3-client')
const { WorkerRuntime } = require('../../../../../core/mdk-worker')
const { loadPlugin } = require('../../../../../core/mdk-worker/lib/plugin-loader')
const { ACTIONS, MESSAGE_TYPES, PROTOCOL_VERSION } = require('../../../../../core/kernel/lib/protocol/actions')

function handler (name) {
  return loadPlugin(plugin).handlers.telemetry.get(name)
}

function commandHandler (name) {
  return loadPlugin(plugin).handlers.commands.get(name)
}

function request (action, payload, deviceId) {
  return {
    id: `request-${action}`,
    version: PROTOCOL_VERSION,
    type: MESSAGE_TYPES.REQUEST,
    action,
    sender: 'kernel:integration-test',
    target: null,
    deviceId,
    timestamp: Date.now(),
    payload
  }
}

test('api-v3 plugin - auto-detection prefers API v3 on a custom port', async (t) => {
  const mock = apiV3Mock.createServer()
  const address = await mock.ready
  const device = await plugin.connect({
    address: '127.0.0.1',
    port: address.port,
    password: 'super'
  }, { deviceId: 'WM-V3-AUTO' })
  t.teardown(async () => {
    await plugin.disconnect(device)
    await mock.close()
  })

  t.ok(device instanceof WhatsminerApiV3Client)
  t.is(mock.requests[0].cmd, 'get.device.info')
})

test('api-v3 plugin - explicit API version serves telemetry and authenticated writes on a custom port', async (t) => {
  const mock = apiV3Mock.createServer({ fragmentResponses: true })
  const address = await mock.ready
  const config = {
    address: '127.0.0.1',
    port: address.port,
    password: 'super',
    apiVersion: '3.0.3',
    type: 'miner-wm-m50s'
  }
  const device = await plugin.connect(config, { deviceId: 'WM-V3-MOCK' })
  const ctx = Object.freeze({ deviceId: 'WM-V3-MOCK', device, config, services: null })
  t.teardown(async () => {
    await plugin.disconnect(device)
    await mock.close()
  })

  t.ok(device instanceof WhatsminerApiV3Client)
  t.not(device instanceof WhatsminerApiV2Client)

  t.is(await handler('hashrate_rt')(ctx, {}), 101.84)
  t.is(await handler('hashrate_avg')(ctx, {}), 101.84)
  t.is(await handler('power')(ctx, {}), 3247.64)
  t.is(await handler('temperature')(ctx, {}), 92.9)
  t.is(await handler('fan_speed_in')(ctx, {}), 4980)
  t.is(await handler('fan_speed_out')(ctx, {}), 5070)
  t.is(await handler('status')(ctx, {}), 'mining')
  t.is(await handler('uptime')(ctx, {}), 1175)
  t.is(await handler('accepted_shares')(ctx, {}), 0)
  t.is(await handler('rejected_shares')(ctx, {}), 0)
  t.is(await handler('pool_url')(ctx, {}), 'stratum+tcp://pool.example:3333')
  t.is(await handler('efficiency')(ctx, {}), 31.88)
  t.is(await handler('power_mode')(ctx, {}), 'normal')
  t.is(await handler('api_version')(ctx, {}), '3.0.3')
  t.is((await handler('firmware_info')(ctx, {})).whatsminer.firmware, '20260819.mock')
  t.is((await handler('device_info')(ctx, {})).ip, '192.168.2.136')
  t.is((await handler('psu_info')(ctx, {})).serialNumber, 'PSU-MOCK')
  t.is((await handler('miner_stats')(ctx, {})).mhs_av, 101847000)
  t.is((await handler('hashboards')(ctx, {}))[0].slot, 0)
  t.is((await handler('pools')(ctx, {}))[0].url, 'stratum+tcp://pool.example:3333')
  t.alike(await handler('errors')(ctx, {}), [])

  const snap = await handler('snap')(ctx, {})
  t.is(snap.success, true)
  t.is(snap.stats.status, 'mining')
  t.absent('t_5s' in snap.stats.hashrate_mhs)
  t.absent('t_5m' in snap.stats.hashrate_mhs)
  t.is(snap.config.firmware_ver, '20260819.mock')
  t.is(snap.config.network_config.ip_address, '192.168.2.136')
  t.alike(await commandHandler('setLED')(ctx, { enabled: false }), { success: true })
  t.alike(await commandHandler('setPowerMode')(ctx, { mode: 'sleep' }), { success: true })
  t.is(mock.state.service, 'stop')
  t.alike(await commandHandler('setPowerMode')(ctx, { mode: 'low' }), { success: true })
  t.is(mock.state.service, 'start')
  t.is(mock.state.setting['power-mode'], 'low')
  const powerModeRequests = mock.requests.filter(request =>
    request.cmd === 'set.miner.service' || request.cmd === 'set.miner.power_mode')
  t.alike(powerModeRequests.map(request => [request.cmd, request.param]), [
    ['set.miner.service', 'stop'],
    ['set.miner.service', 'start'],
    ['set.miner.power_mode', 'low']
  ])
  t.alike(await commandHandler('setPowerPct')(ctx, { pct: 90 }), { success: true })
  t.is(mock.state.setting['power-percent'], 90)
  t.alike(await commandHandler('setupPools')(ctx, {
    appendId: false,
    pools: [{
      url: 'stratum+tcp://new-pool.example:3333',
      worker_name: 'worker',
      worker_password: 'x'
    }]
  }), { success: true })
  t.is(mock.state.pools[0].url, 'stratum+tcp://new-pool.example:3333')
  const logs = await commandHandler('downloadLogs')(ctx, {})
  t.is(logs.success, true)
  t.is(logs.encoding, 'base64')
  t.alike(Buffer.from(logs.data, 'base64'), mock.state.logData)
  t.is(logs.sha256.length, 64)
  t.alike(await commandHandler('setNetwork')(ctx, {
    network: {
      dhcp: false,
      ip: '192.168.2.30',
      netmask: '255.255.255.0',
      gateway: '192.168.2.1',
      dns: '192.168.2.53'
    }
  }), { success: true })
  t.is(mock.state.deviceInfo.network.ip, '192.168.2.30')
  t.alike(await commandHandler('setHostname')(ctx, { hostname: 'WhatsMiner-136' }), { success: true })
  t.is(mock.state.deviceInfo.network.hostname, 'WhatsMiner-136')
  const firmwareData = Buffer.from('mock H616 firmware')
  const firmware = {
    filename: 'whatsminer-h616.bin',
    encoding: 'base64',
    size: firmwareData.length,
    sha256: crypto.createHash('sha256').update(firmwareData).digest('hex'),
    data: firmwareData.toString('base64')
  }
  const firmwareResult = await commandHandler('updateFirmware')(ctx, { firmware })
  t.is(firmwareResult.success, true)
  t.alike(mock.state.firmwareData, firmwareData)
  t.alike(await commandHandler('reboot')(ctx, {}), { success: true })

  const writeRequests = mock.requests.filter(request => request.cmd.startsWith('set.'))
  t.ok(writeRequests.length >= 8)
  t.ok(writeRequests.every(request => request.ts && request.token && request.account === 'super'))
  t.is(typeof writeRequests.find(request => request.cmd === 'set.miner.pools').param, 'string')
  t.ok(mock.requests.length > 0)
  t.ok(mock.requests.every(request => request.cmd.includes('.')))
})

test('api-v3 plugin - WorkerRuntime invokes telemetry and command handlers through protocol envelopes', async (t) => {
  const mock = apiV3Mock.createServer({ fragmentResponses: true })
  const address = await mock.ready
  const runtime = new WorkerRuntime(plugin, {
    workerId: 'whatsminer-v3-worker',
    devices: [{
      deviceId: 'WM-V3-RUNTIME',
      config: {
        address: '127.0.0.1',
        port: address.port,
        password: 'super',
        apiVersion: '3.0.3',
        type: 'miner-wm-m50s'
      }
    }]
  })
  await runtime._openContexts()
  t.teardown(async () => {
    await runtime._closeContexts()
    await mock.close()
  })

  const telemetry = await runtime.handleRequest(request(
    ACTIONS.TELEMETRY_PULL,
    { query: { type: 'hashrate_rt' } },
    'WM-V3-RUNTIME'
  ))
  t.is(telemetry.action, ACTIONS.TELEMETRY_RESPONSE)
  t.is(telemetry.payload.name, 'hashrate_rt')
  t.is(telemetry.payload.value, 101.84)

  const command = await runtime.handleRequest(request(
    ACTIONS.COMMAND_REQUEST,
    { commandId: 'cmd-led-auto', command: 'setLED', params: { enabled: false } },
    'WM-V3-RUNTIME'
  ))
  t.is(command.action, ACTIONS.COMMAND_RESULT)
  t.is(command.payload.status, 'SUCCESS')
  t.alike(command.payload.result, { success: true })
  t.ok(mock.requests.some(item => item.cmd === 'set.system.led'))

  const logs = await runtime.handleRequest(request(
    ACTIONS.COMMAND_REQUEST,
    { commandId: 'cmd-download-logs', command: 'downloadLogs', params: {} },
    'WM-V3-RUNTIME'
  ))
  t.is(logs.payload.status, 'SUCCESS')
  t.is(logs.payload.result.encoding, 'base64')
  t.alike(Buffer.from(logs.payload.result.data, 'base64'), mock.state.logData)

  const network = await runtime.handleRequest(request(
    ACTIONS.COMMAND_REQUEST,
    {
      commandId: 'cmd-set-network',
      command: 'setNetwork',
      params: { network: { dhcp: true } }
    },
    'WM-V3-RUNTIME'
  ))
  t.is(network.payload.status, 'SUCCESS')
  t.alike(network.payload.result, { success: true })
  t.is(mock.state.deviceInfo.network.proto, 'dhcp')

  const firmwareData = Buffer.from('runtime firmware')
  const firmware = await runtime.handleRequest(request(
    ACTIONS.COMMAND_REQUEST,
    {
      commandId: 'cmd-update-firmware',
      command: 'updateFirmware',
      params: {
        firmware: {
          filename: 'whatsminer-h616.bin',
          encoding: 'base64',
          size: firmwareData.length,
          sha256: crypto.createHash('sha256').update(firmwareData).digest('hex'),
          data: firmwareData.toString('base64')
        }
      }
    },
    'WM-V3-RUNTIME'
  ))
  t.is(firmware.payload.status, 'SUCCESS')
  t.alike(mock.state.firmwareData, firmwareData)

  runtime.getDeviceContext('WM-V3-RUNTIME').device.setLED = async () => ({
    success: false,
    error_msg: 'ERR_API_V3_TIMEOUT'
  })
  const failed = await runtime.handleRequest(request(
    ACTIONS.COMMAND_REQUEST,
    { commandId: 'cmd-led-timeout', command: 'setLED', params: { enabled: true } },
    'WM-V3-RUNTIME'
  ))
  t.is(failed.payload.status, 'FAILED')
  t.is(failed.payload.error, 'ERR_API_V3_TIMEOUT')
})

test('api-v3 plugin - packaged worker boot provisions and serves an API v3 miner', async (t) => {
  const mock = apiV3Mock.createServer({ fragmentResponses: true })
  const address = await mock.ready
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'whatsminer-v3-boot-'))
  const handle = await startWhatsminerWorker({
    workerId: 'whatsminer-v3-boot-worker',
    model: 'm56s',
    storeDir: path.join(root, 'store'),
    conf: {
      thing: {
        allowDuplicateIPs: true,
        collectSnapsItvMs: 60000,
        storeSnapItvMs: 60000
      }
    },
    seedDevices: [{
      id: 'WM-V3-BOOT',
      info: {},
      opts: {
        address: '127.0.0.1',
        port: address.port,
        password: 'super',
        apiVersion: '3.0.3'
      }
    }]
  })
  t.teardown(async () => {
    await handle.stop()
    await mock.close()
    fs.rmSync(root, { recursive: true, force: true })
  })

  const ctx = handle.runtime.getDeviceContext('WM-V3-BOOT')
  t.ok(ctx)
  t.ok(ctx.device instanceof WhatsminerApiV3Client)

  const telemetry = await handle.runtime.handleRequest(request(
    ACTIONS.TELEMETRY_PULL,
    { query: { type: 'api_version' } },
    'WM-V3-BOOT'
  ))
  t.is(telemetry.payload.value, '3.0.3')

  const command = await handle.runtime.handleRequest(request(
    ACTIONS.COMMAND_REQUEST,
    { commandId: 'cmd-v3-boot-led', command: 'setLED', params: { enabled: false } },
    'WM-V3-BOOT'
  ))
  t.is(command.payload.status, 'SUCCESS')
  t.ok(mock.requests.some(item => item.cmd === 'set.system.led'))

  const networkCalls = await handle.services.actions.getWriteCalls({
    query: {},
    action: 'setNetwork',
    params: [{ dhcp: true }]
  })
  t.is(networkCalls.reqVotes, 1)
  t.alike(networkCalls.calls.map(call => call.id), ['WM-V3-BOOT'])
})
