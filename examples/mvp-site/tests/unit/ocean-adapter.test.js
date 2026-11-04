'use strict'

const test = require('brittle')
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const createTestnet = require('hyperdht/testnet')
const { startOceanWorker } = require('../../backend/ocean-adapter')

test('startOceanWorker - rejects missing boot options', async (t) => {
  await t.exception(() => startOceanWorker(), /ERR_WORKER_ID_REQUIRED/)
  await t.exception(() => startOceanWorker({ workerId: 'ocean' }), /ERR_STORE_DIR_REQUIRED/)
  await t.exception(() => startOceanWorker({ workerId: 'ocean', storeDir: '/tmp/x' }), /ERR_POOL_CONFIG_REQUIRED/)
})

test('startOceanWorker - joins the private DHT and binds its interface', { timeout: 60000 }, async (t) => {
  const testnet = await createTestnet(3, { host: '127.0.0.1' })
  const storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mvp-site-ocean-'))
  t.teardown(async () => {
    await testnet.destroy()
    fs.rmSync(storeDir, { recursive: true, force: true })
  })

  const handle = await startOceanWorker({
    workerId: 'ocean-pool-worker',
    storeDir,
    // Nothing listens here: the test covers the DHT node, not the Ocean API poll.
    pool: { apiUrl: 'http://127.0.0.1:9', accounts: [] },
    bootstrap: testnet.bootstrap,
    dhtHost: '127.0.0.1',
    allowedKeys: [crypto.randomBytes(32).toString('hex')]
  })
  t.teardown(() => handle.stop(), { order: -1 })

  const dht = handle.runtime._dht
  t.alike(
    dht.bootstrapNodes.map(({ host, port }) => `${host}:${port}`),
    testnet.bootstrap.map(({ host, port }) => `${host}:${port}`),
    'joins the passed bootstrap list, not the public one'
  )
  await dht.io.bind()
  t.is(dht.io.serverSocket.address().host, '127.0.0.1', 'server socket bound to dhtHost')
  t.is(dht.io.clientSocket.address().host, '127.0.0.1', 'client socket bound to dhtHost')
})
