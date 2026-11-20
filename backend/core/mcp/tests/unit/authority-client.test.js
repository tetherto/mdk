'use strict'

const test = require('brittle')
const fs = require('fs')
const net = require('net')
const os = require('os')
const path = require('path')
const mdkClient = require('@tetherto/mdk-client')
const { createMcpServer } = require('../../server')

function freePort () {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.once('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
}

// An MCP in its own process reads the policy through a Kernel client it builds
// from `credential` and `config.kernelKey`. That client must join the stack's
// DHT as the app runtime client does: same bootstrap, same bound interface.
// server.js takes createMdkClient off the module at call time, so swapping the
// export captures the config without opening a DHT.
test('createMcpServer - the policy client gets the stack bootstrap and dhtHost', async (t) => {
  const configs = []
  const original = mdkClient.createMdkClient
  mdkClient.createMdkClient = (config) => {
    configs.push(config)
    return { getJwks: async () => ({ keys: [] }), getRbac: async () => ({ record: null }), close: async () => {} }
  }
  t.teardown(() => { mdkClient.createMdkClient = original })

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-mcp-authority-'))
  t.teardown(() => fs.rmSync(root, { recursive: true, force: true }))
  const bootstrap = [{ host: '127.0.0.1', port: 49737 }]
  const config = { kernelKey: 'ab'.repeat(32), kernelBootstrap: bootstrap, kernelDhtHost: '127.0.0.1' }
  const server = await createMcpServer(root, await freePort(), config, [], [], { credential: { name: 'mdk-mcp', privateKey: 'unused' } })
  t.teardown(() => new Promise((resolve) => server.close(resolve)))

  t.is(configs.length, 1, 'one policy client')
  t.alike(configs[0].kernelBootstrap, bootstrap)
  t.is(configs[0].kernelDhtHost, '127.0.0.1')
})
