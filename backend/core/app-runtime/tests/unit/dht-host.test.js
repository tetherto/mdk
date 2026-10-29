'use strict'

// dhtHost binds the runtime's and the runtime client's DHT nodes to one
// interface (a private, loopback-only network) without changing either key.

const test = require('brittle')
const path = require('path')
const createTestnet = require('hyperdht/testnet')
const { createAppRuntime } = require('../../lib/runtime')
const { ECHO_APP, tmpDir, identityFor, capturingLogger, startEcho, connectClient } = require('../fixtures/helpers')

test('dhtHost - runtime and client bind loopback, keys unchanged, calls still flow', { timeout: 60000 }, async (t) => {
  const testnet = await createTestnet(3, t.teardown)
  const caller = identityFor()
  const storeDir = path.join(tmpDir(t), 'store')

  const plain = createAppRuntime({ name: 'echo', appDir: ECHO_APP, bootstrap: testnet.bootstrap, storeDir, logger: capturingLogger() })
  const { publicKey: before } = await plain.start()
  await plain.stop()

  const { publicKey } = await startEcho(t, testnet, { storeDir, dhtHost: '127.0.0.1', allowedKeys: [caller.publicKey] })
  t.alike(publicKey, before, 'same server key with and without dhtHost')

  const client = await connectClient(t, testnet, publicKey, caller, { dhtHost: '127.0.0.1' })
  const req = { params: { id: '1' }, query: {}, headers: {} }
  t.alike(await client.invoke('echo', req), req, 'round trip between loopback-bound nodes')
})
