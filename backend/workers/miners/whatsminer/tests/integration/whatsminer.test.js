'use strict'

const net = require('net')
const test = require('brittle')
const { createServer } = require('../../mock/server')
const Whatsminer = require('../../lib/whatsminer')

const DEFAULT_MOCK_PORT = 14028
const MOCK_HOST = '127.0.0.1'

function createTcpRpc (opts) {
  const { host, port, encoding = 'utf-8', timeout = 10000 } = opts
  let stopped = false

  function request (str) {
    return new Promise((resolve, reject) => {
      if (stopped) {
        reject(new Error('RPC stopped'))
        return
      }
      const socket = new net.Socket()
      const chunks = []
      socket.setEncoding(encoding)
      socket.setTimeout(timeout)

      socket.on('data', (data) => chunks.push(data))
      socket.on('close', () => {
        const body = chunks.join('')
        if (body) resolve(body)
        else reject(new Error('Empty response'))
      })
      socket.on('error', reject)
      socket.on('timeout', () => {
        socket.destroy(new Error('Request timeout'))
      })

      socket.connect(port, host, () => {
        socket.write(str)
      })
    })
  }

  async function stop () {
    stopped = true
  }

  return { request, stop }
}

function startMockServer (opts = {}) {
  const port = opts.port ?? DEFAULT_MOCK_PORT
  const host = opts.host ?? MOCK_HOST
  const argv = {
    port,
    host,
    type: opts.type ?? 'm56s',
    serial: opts.serial ?? 'HHM38S98302B24K40073',
    password: opts.password ?? 'admin'
  }
  const server = createServer(argv)
  return {
    server,
    port,
    host,
    stop: () => server.exit()
  }
}

function createWhatsminerForIntegration (mockAddress, opts = {}) {
  const { host, port } = mockAddress
  const rpc = createTcpRpc({
    host,
    port,
    encoding: 'utf-8',
    timeout: opts.timeout ?? 10000
  })
  const socketer = {
    readStrategy: 'on_end',
    rpc: () => rpc
  }
  return new Whatsminer({
    socketer,
    address: host,
    port,
    password: opts.password ?? 'admin',
    type: opts.type ?? 'miner-wm-m56s',
    id: opts.id ?? 'integration-test-miner',
    conf: opts.conf ?? {}
  })
}

test('integration: getVersion returns version info from mock miner', async (t) => {
  const mock = startMockServer({ port: DEFAULT_MOCK_PORT, type: 'm56s' })
  t.teardown(() => mock.stop())

  const miner = createWhatsminerForIntegration(
    { host: mock.host, port: mock.port },
    { type: 'miner-wm-m56s' }
  )
  t.teardown(() => miner.close())

  const version = await miner.getVersion()
  t.ok(version, 'version returned')
  t.ok(version.chip, 'version has chip')
  t.ok(version.platform, 'version has platform')
  t.ok(version.whatsminer, 'version has whatsminer')
  t.ok(version.whatsminer.api, 'version has api')
  t.ok(version.whatsminer.firmware, 'version has firmware')
})

test('integration: getMinerStats returns summary from mock miner', async (t) => {
  const mock = startMockServer({ port: DEFAULT_MOCK_PORT, type: 'm56s' })
  t.teardown(() => mock.stop())

  const miner = createWhatsminerForIntegration(
    { host: mock.host, port: mock.port },
    { type: 'miner-wm-m56s' }
  )
  t.teardown(() => miner.close())

  const stats = await miner.getMinerStats()
  t.ok(stats, 'stats returned')
  t.ok(typeof stats.elapsed === 'number' || typeof stats.elapsed === 'string', 'stats has elapsed')
  t.ok('mhs_av' in stats, 'stats has mhs_av')
  t.ok('temperature' in stats, 'stats has temperature')
  t.ok('power' in stats, 'stats has power')
  t.ok('power_mode' in stats, 'stats has power_mode')
})

test('integration: getPools returns pool list from mock miner', async (t) => {
  const mock = startMockServer({ port: DEFAULT_MOCK_PORT, type: 'm56s' })
  t.teardown(() => mock.stop())

  const miner = createWhatsminerForIntegration(
    { host: mock.host, port: mock.port },
    { type: 'miner-wm-m56s' }
  )
  t.teardown(() => miner.close())

  const pools = await miner.getPools()
  t.ok(Array.isArray(pools), 'pools is array')
  t.ok(pools.length >= 1, 'at least one pool')
  const first = pools[0]
  t.ok(first.url, 'pool has url')
  t.ok('user' in first || 'User' in first, 'pool has user')
  t.ok('accepted' in first || 'Accepted' in first, 'pool has accepted')
})

test('integration: getDevices returns device list from mock miner', async (t) => {
  const mock = startMockServer({ port: DEFAULT_MOCK_PORT, type: 'm56s' })
  t.teardown(() => mock.stop())

  const miner = createWhatsminerForIntegration(
    { host: mock.host, port: mock.port },
    { type: 'miner-wm-m56s' }
  )
  t.teardown(() => miner.close())

  const devices = await miner.getDevices()
  t.ok(Array.isArray(devices), 'devices is array')
  t.ok(devices.length >= 1, 'at least one device')
  const first = devices[0]
  t.ok('index' in first, 'device has index')
  t.ok('temperature' in first || 'chip_temp_avg' in first, 'device has temperature info')
})

test('integration: getDevicesInfo returns devdetails from mock miner', async (t) => {
  const mock = startMockServer({ port: DEFAULT_MOCK_PORT, type: 'm56s' })
  t.teardown(() => mock.stop())

  const miner = createWhatsminerForIntegration(
    { host: mock.host, port: mock.port },
    { type: 'miner-wm-m56s' }
  )
  t.teardown(() => miner.close())

  const devDetails = await miner.getDevicesInfo()
  t.ok(Array.isArray(devDetails), 'devDetails is array')
  t.ok(devDetails.length >= 1, 'at least one dev detail')
  const first = devDetails[0]
  t.ok(first.name !== undefined || first.Name !== undefined, 'device has name')
  t.ok(first.model !== undefined || first.Model !== undefined, 'device has model')
})

test('integration: getErrors returns error list from mock miner', async (t) => {
  const mock = startMockServer({ port: DEFAULT_MOCK_PORT, type: 'm56s' })
  t.teardown(() => mock.stop())

  const miner = createWhatsminerForIntegration(
    { host: mock.host, port: mock.port },
    { type: 'miner-wm-m56s' }
  )
  t.teardown(() => miner.close())

  const errors = await miner.getErrors()
  t.ok(Array.isArray(errors), 'errors is array')
})

test('integration: getMinerInfo returns miner info from mock miner', async (t) => {
  const mock = startMockServer({ port: DEFAULT_MOCK_PORT, type: 'm56s' })
  t.teardown(() => mock.stop())

  const miner = createWhatsminerForIntegration(
    { host: mock.host, port: mock.port },
    { type: 'miner-wm-m56s' }
  )
  t.teardown(() => miner.close())

  const info = await miner.getMinerInfo()
  t.ok(info, 'miner info returned')
  t.ok(info.ip !== undefined || info.hostname !== undefined, 'info has network/host')
})

test('integration: getPSUInformation returns PSU info from mock miner', async (t) => {
  const mock = startMockServer({ port: DEFAULT_MOCK_PORT, type: 'm56s' })
  t.teardown(() => mock.stop())

  const miner = createWhatsminerForIntegration(
    { host: mock.host, port: mock.port },
    { type: 'miner-wm-m56s' }
  )
  t.teardown(() => miner.close())

  const psu = await miner.getPSUInformation()
  t.ok(psu, 'psu info returned')
  t.ok(psu.name !== undefined, 'psu has name')
  t.ok(psu.version !== undefined, 'psu has version')
  t.ok(psu.model !== undefined, 'psu has model')
})

test('integration: getSnap returns full snapshot from mock miner', async (t) => {
  const mock = startMockServer({ port: DEFAULT_MOCK_PORT, type: 'm56s' })
  t.teardown(() => mock.stop())

  const miner = createWhatsminerForIntegration(
    { host: mock.host, port: mock.port },
    { type: 'miner-wm-m56s' }
  )
  t.teardown(() => miner.close())

  const snap = await miner.getSnap()
  t.ok(snap, 'snap returned')
  t.ok(snap.stats !== undefined, 'snap has stats')
  t.ok(snap.config !== undefined, 'snap has config')
  t.ok(snap.stats.power_w !== undefined || snap.stats.hashrate_mhs !== undefined, 'snap.stats has power or hashrate')
  t.ok(snap.config.pool_config !== undefined, 'snap.config has pool_config')
})

test('integration: setHostname (write with token) succeeds against mock miner', async (t) => {
  const mock = startMockServer({ port: DEFAULT_MOCK_PORT, type: 'm56s', password: 'admin' })
  t.teardown(() => mock.stop())

  const miner = createWhatsminerForIntegration(
    { host: mock.host, port: mock.port },
    { type: 'miner-wm-m56s', password: 'admin' }
  )
  t.teardown(() => miner.close())

  const result = await miner.setHostname('integration-test-host')
  t.ok(result, 'setHostname returned')
  t.ok(result.success === true, 'setHostname succeeded')
})
