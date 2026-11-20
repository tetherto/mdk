'use strict'

const test = require('brittle')
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const createTestnet = require('hyperdht/testnet')
const emcd = require('emcd-mdk-worker')
const emcdMock = require('emcd-mdk-worker/mock/server')
const emcdKeys = require('emcd-mdk-worker/mock/keys')
const spiderpool = require('spiderpool-mdk-worker')
const spiderpoolMock = require('spiderpool-mdk-worker/mock/server')
const spiderpoolKeys = require('spiderpool-mdk-worker/mock/keys')
const foundry = require('foundry-mdk-worker')
const foundryMock = require('foundry-mdk-worker/mock/server')
const foundryKeys = require('foundry-mdk-worker/mock/keys')
const { startPoolPluginWorker } = require('../../backend/pool-adapter')

const LOOPBACK = '127.0.0.1'

test('lib/mdk-compat maps the workers\' monorepo paths onto the workspace packages', (t) => {
  t.is(require('@tetherto/mdk/backend/core/mdk'), require('@tetherto/mdk-core'))
  t.is(require('@tetherto/mdk/backend/core/mdk-worker'), require('@tetherto/mdk-worker'))
  t.is(require('@tetherto/mdk/backend/core/kernel/lib/protocol/actions'), require('@tetherto/mdk-kernel/protocol/actions'))
  t.is(require('@tetherto/mdk/backend/core/kernel/lib/protocol/envelope'), require('@tetherto/mdk-kernel/protocol/envelope'))
})

test('startPoolPluginWorker - rejects missing boot options', async (t) => {
  const base = { Pool: emcd.EMCD_POOL, plugin: emcd.plugin, workerId: 'w', rack: 'r', storeDir: 's' }
  await t.exception(() => startPoolPluginWorker({ ...base, Pool: undefined }), /ERR_POOL_PLUGIN_REQUIRED/)
  await t.exception(() => startPoolPluginWorker({ ...base, workerId: undefined }), /ERR_WORKER_ID_REQUIRED/)
  await t.exception(() => startPoolPluginWorker({ ...base, rack: undefined }), /ERR_RACK_REQUIRED/)
  await t.exception(() => startPoolPluginWorker({ ...base, storeDir: undefined }), /ERR_STORE_DIR_REQUIRED/)
})

const POOLS = [
  {
    name: 'emcd',
    pkg: emcd,
    Pool: emcd.EMCD_POOL,
    mock: emcdMock,
    conf: (apiUrl) => ({ emcd: { apiUrl, accounts: [], apiKey: emcdKeys.apiKey, apiSecret: emcdKeys.apiSecret } })
  },
  {
    name: 'spiderpool',
    pkg: spiderpool,
    Pool: spiderpool.SPIDER_POOL,
    mock: spiderpoolMock,
    conf: (apiUrl) => ({ spiderpool: { apiUrl, accounts: ['spider-test'], accessKey: spiderpoolKeys.TEST_ACCESS_KEY, privateKey: spiderpoolKeys.TEST_PRIVATE_KEY } })
  },
  {
    name: 'foundry',
    pkg: foundry,
    Pool: foundry.FOUNDRY_POOL,
    mock: foundryMock,
    conf: (apiUrl) => ({ foundry: { apiUrl, accounts: [foundryKeys.subAccount], apiKey: foundryKeys.apiKey } })
  }
]

for (const pool of POOLS) {
  test(`startPoolPluginWorker - boots ${pool.name} fail-closed against its mock`, { timeout: 60000 }, async (t) => {
    const testnet = await createTestnet(4)
    const mock = await pool.mock.createServer({ port: 0 })
    const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), `mvp-site-${pool.name}-`))
    t.teardown(async () => {
      await mock.app.close()
      await testnet.destroy()
      fs.rmSync(storeDir, { recursive: true, force: true })
    })

    const handle = await startPoolPluginWorker({
      Pool: pool.Pool,
      plugin: pool.pkg.plugin,
      workerId: `${pool.name}-pool-worker`,
      rack: 'test',
      storeDir,
      conf: pool.conf(mock.apiUrl),
      bootstrap: testnet.bootstrap,
      dhtHost: LOOPBACK,
      allowedKeys: [crypto.randomBytes(32).toString('hex')]
    })
    t.teardown(() => handle.stop(), { order: -1 })

    t.is(handle.pool.wtype, pool.name)
    t.is(handle.runtime.getAllowedKeys().length, 1, 'only the passed key is admitted')

    const now = new Date()
    await handle.pool.fetchWorkers(now)
    await handle.pool.fetchStats(now)
    t.ok(handle.pool.getMetric('hashrate') > 0, 'hashrate polled from the mock')
  })
}
