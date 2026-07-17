'use strict'

const net = require('net')
const test = require('brittle')
const plugin = require('../../plugin')
const amMock = require('../../mock/server')
const { loadPlugin } = require('../../../../../core/mdk-worker/lib/plugin-loader')

const MOCK_PORT = 14081

function waitForPort (host, port, options = {}) {
  const timeout = options.timeout ?? 5000
  const interval = options.interval ?? 100
  return new Promise((resolve, reject) => {
    const start = Date.now()
    function tryConnect () {
      const socket = new net.Socket()
      const onError = () => {
        socket.destroy()
        if (Date.now() - start >= timeout) {
          reject(new Error(`Timeout waiting for ${host}:${port}`))
        } else {
          setTimeout(tryConnect, interval)
        }
      }
      socket.setTimeout(500)
      socket.once('error', onError)
      socket.once('timeout', onError)
      socket.once('connect', () => {
        socket.destroy()
        resolve()
      })
      socket.connect(port, host)
    }
    tryConnect()
  })
}

async function createDevice (t, opts = {}) {
  const port = opts.port || MOCK_PORT
  const mock = amMock.createServer({
    host: '127.0.0.1',
    port,
    type: opts.type || 's21',
    serial: 'AM-T1',
    password: 'root'
  })
  await waitForPort('127.0.0.1', port)

  const config = {
    address: '127.0.0.1',
    port,
    errPort: port,
    username: 'root',
    password: 'root',
    type: `miner-am-${opts.type || 's21'}`
  }
  const device = await plugin.connect(config, { deviceId: 'AM-T1' })

  t.teardown(() => mock.stop())

  return { device, ctx: Object.freeze({ deviceId: 'AM-T1', device, config, services: null }) }
}

function handler (section, name) {
  return loadPlugin(plugin).handlers[section].get(name)
}

test('plugin loads: every contract entry has a working handler module', (t) => {
  const loaded = loadPlugin(plugin)
  t.is(loaded.handlers.telemetry.size, 10)
  t.is(loaded.handlers.commands.size, 4)
  for (const entry of loaded.publishedContract.capabilities.telemetry) {
    t.is(entry.handler, undefined, `${entry.name} handler path stripped from published contract`)
  }
})

test('connect validates the device config', async (t) => {
  await t.exception(plugin.connect({ address: '127.0.0.1' }, { deviceId: 'x' }), /ERR_DEVICE_CONFIG_INVALID/)
})

test('telemetry handlers translate the Bitmain HTTP API', async (t) => {
  const { ctx } = await createDevice(t)

  const hashrateAvg = await handler('telemetry', 'hashrate_avg')(ctx, {})
  t.ok(typeof hashrateAvg === 'number' && hashrateAvg > 0, `hashrate_avg ${hashrateAvg} TH/s`)

  const power = await handler('telemetry', 'power')(ctx, {})
  t.ok(typeof power === 'number', `power ${power} W`)

  const temperature = await handler('telemetry', 'temperature')(ctx, {})
  t.ok(typeof temperature === 'number', `temperature ${temperature} C`)

  const status = await handler('telemetry', 'status')(ctx, {})
  t.ok(['mining', 'sleeping', 'error'].includes(status), `status ${status}`)

  const powerMode = await handler('telemetry', 'power_mode')(ctx, {})
  t.ok(['sleep', 'normal'].includes(powerMode), `power_mode ${powerMode}`)

  const uptime = await handler('telemetry', 'uptime')(ctx, {})
  t.ok(typeof uptime === 'number', `uptime ${uptime} ms`)

  const accepted = await handler('telemetry', 'accepted_shares')(ctx, {})
  t.ok(typeof accepted === 'number', `accepted_shares ${accepted}`)

  const rejected = await handler('telemetry', 'rejected_shares')(ctx, {})
  t.ok(typeof rejected === 'number', `rejected_shares ${rejected}`)
})

test('snap handler returns the full legacy snapshot shape', async (t) => {
  const { ctx } = await createDevice(t, { port: MOCK_PORT + 1 })

  const snap = await handler('telemetry', 'snap')(ctx, {})
  t.is(snap.success, true)
  t.ok(snap.stats.status)
  t.ok(snap.stats.hashrate_mhs)
  t.ok(snap.stats.temperature_c)
  t.ok(Array.isArray(snap.stats.pool_status))
  t.ok(snap.config.pool_config)
  t.ok(snap.config.power_mode)
})

test('command handlers drive vendor write endpoints', async (t) => {
  const { ctx, device } = await createDevice(t, { port: MOCK_PORT + 2 })

  const led = await handler('commands', 'setLED')(ctx, { enabled: false })
  t.is(led.success, true)

  const mode = await handler('commands', 'setPowerMode')(ctx, { mode: 'sleep' })
  t.is(mode.success, true)

  const bogus = await handler('commands', 'setPowerMode')(ctx, { mode: 'bogus' })
  t.is(bogus.success, false, 'invalid mode reports failure')

  const rebooted = await handler('commands', 'reboot')(ctx, {})
  t.is(rebooted.success, true)

  // validateWriteAction is what the write-call approver invokes per device
  t.is(device.validateWriteAction('setPowerMode', 'normal'), 1)
  t.exception(() => device.validateWriteAction('setPowerMode', 'high'), /ERR_SET_POWER_MODE_INVALID/)
})
