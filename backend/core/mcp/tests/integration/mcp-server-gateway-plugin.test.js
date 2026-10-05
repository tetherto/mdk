'use strict'

const test = require('brittle')
const path = require('path')
const os = require('os')
const fs = require('fs')
const { Client } = require('@modelcontextprotocol/sdk/client/index.js')
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js')
const { createMcpServer } = require('../../server')

const FIXTURES_DIR = path.join(os.tmpdir(), 'mdk-mcp-server-gateway-plugin-test-' + Date.now())
let nextPort = 41830

function writeFixture (dir, files) {
  fs.mkdirSync(dir, { recursive: true })
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(dir, name)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, typeof content === 'string' ? content : JSON.stringify(content, null, 2))
  }
}

async function connectClient (port) {
  const client = new Client({ name: 'test-client', version: '1.0.0' })
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`))
  await client.connect(transport)
  return client
}

function writeGatewayPluginFixture (dir) {
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@test/mdk-plugin-devices',
      version: '1.0.0',
      description: 'device fleet routes',
      routes: [{
        id: 'devices.get',
        description: 'gets a device by id',
        http: {
          method: 'GET',
          path: '/devices/{id}',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ]
        },
        safety: 'read-only',
        handler: './controllers/get-device.js'
      }]
    },
    'controllers/get-device.js': [
      '\'use strict\'',
      'const { config } = require(\'@tetherto/mdk-gateway/plugin\')',
      'module.exports = async function (req) {',
      '  return { id: req.params.id, kernelKey: config.kernelKey, agent: config.agent }',
      '}'
    ].join('\n')
  })
}

test('createMcpServer - serves tools derived from a gatewayPluginDirs entry', async (t) => {
  const dir = path.join(FIXTURES_DIR, 'single-gateway-plugin')
  writeGatewayPluginFixture(dir)

  const port = nextPort++
  const httpServer = await createMcpServer(path.join(FIXTURES_DIR, 'root'), port, { kernelKey: 'the-key' }, [], [dir])
  t.teardown(() => new Promise((resolve) => httpServer.close(resolve)))

  const mcpClient = await connectClient(port)
  t.teardown(() => mcpClient.close())

  const { tools } = await mcpClient.listTools()
  t.is(tools.length, 1, 'should list one tool derived from the gateway plugin route')
  t.is(tools[0].name, 'devices_get', 'should have the sanitized route id as the tool name')
  t.is(tools[0].annotations.readOnlyHint, true, 'should carry the read-only safety hint')

  const result = await mcpClient.callTool({ name: 'devices_get', arguments: { id: 'dev-1' } })
  const payload = JSON.parse(result.content[0].text)
  t.is(payload.id, 'dev-1', 'the route handler should have actually run with the mapped path param')
  t.is(payload.kernelKey, 'the-key', 'the route handler should see config passed to createMcpServer')
  t.pass()
})

test('createMcpServer - a gatewayPluginDirs { dir, config } entry overrides the shared config for that plugin', async (t) => {
  const dir = path.join(FIXTURES_DIR, 'per-entry-config')
  writeGatewayPluginFixture(dir)

  const port = nextPort++
  const httpServer = await createMcpServer(
    path.join(FIXTURES_DIR, 'root'),
    port,
    { kernelKey: 'shared-key' },
    [],
    [{ dir, config: { agent: { provider: { kind: 'qvac' } } } }]
  )
  t.teardown(() => new Promise((resolve) => httpServer.close(resolve)))

  const mcpClient = await connectClient(port)
  t.teardown(() => mcpClient.close())

  const result = await mcpClient.callTool({ name: 'devices_get', arguments: { id: 'dev-2' } })
  const payload = JSON.parse(result.content[0].text)
  t.is(payload.kernelKey, 'shared-key', 'the shared config should still be visible underneath the per-entry override')
  t.alike(payload.agent, { provider: { kind: 'qvac' } }, 'the per-entry config should reach the plugin context')
  t.pass()
})

test('createMcpServer - omitting gatewayPluginDirs is unaffected (backward compatible)', async (t) => {
  const dir = path.join(FIXTURES_DIR, 'native-only')
  writeFixture(dir, {
    'mcp-plugin.json': {
      name: '@test/mcp-plugin-native-only',
      version: '1.0.0',
      tools: [{ id: 'echo', handler: './tools/echo.js', description: 'echoes' }]
    },
    'tools/echo.js': '\'use strict\'\nmodule.exports = { schema: {}, handler: async () => ({ content: [{ type: \'text\', text: \'ok\' }] }) }'
  })

  const port = nextPort++
  // Called with the pre-existing 4-arg signature only.
  const httpServer = await createMcpServer(path.join(FIXTURES_DIR, 'root'), port, {}, [dir])
  t.teardown(() => new Promise((resolve) => httpServer.close(resolve)))

  const mcpClient = await connectClient(port)
  t.teardown(() => mcpClient.close())

  const { tools } = await mcpClient.listTools()
  t.alike(tools.map((tool) => tool.name), ['echo'], 'should serve only the native tool, unaffected by the new parameter')
  t.pass()
})

test('createMcpServer - a gatewayPluginDirs route handler\'s onReady() fires, mirroring the real Gateway\'s contract', async (t) => {
  const dir = path.join(FIXTURES_DIR, 'on-ready')
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@test/mdk-plugin-on-ready',
      version: '1.0.0',
      description: 'checks onReady() from a route handler',
      routes: [{
        id: 'ready.get',
        description: 'reports whether onReady already fired',
        http: { method: 'GET', path: '/ready' },
        safety: 'read-only',
        handler: './controllers/ready.js'
      }]
    },
    'controllers/ready.js': [
      '\'use strict\'',
      'const { onReady } = require(\'@tetherto/mdk-gateway/plugin\')',
      // Registered at load time, the same way a real Gateway plugin does it —
      // before any request/tool call can reach the handler below.
      'let ready = false',
      'onReady(() => { ready = true })',
      'module.exports = async function () {',
      '  return { ready }',
      '}'
    ].join('\n')
  })

  const port = nextPort++
  const httpServer = await createMcpServer(path.join(FIXTURES_DIR, 'root'), port, {}, [], [dir])
  t.teardown(() => new Promise((resolve) => httpServer.close(resolve)))

  const mcpClient = await connectClient(port)
  t.teardown(() => mcpClient.close())

  const result = await mcpClient.callTool({ name: 'ready_get', arguments: {} })
  const payload = JSON.parse(result.content[0].text)
  t.is(payload.ready, true, 'onReady\'s callback should have run — the standalone server has no boot/ready lifecycle to wait on, so it runs immediately')
  t.pass()
})

test('createMcpServer - a duplicate tool id between pluginDirs and gatewayPluginDirs throws ERR_PLUGIN_TOOL_DUPLICATE_ID', async (t) => {
  const nativeDir = path.join(FIXTURES_DIR, 'dup-native')
  writeFixture(nativeDir, {
    'mcp-plugin.json': {
      name: '@test/mcp-plugin-dup-native',
      version: '1.0.0',
      tools: [{ id: 'devices_get', handler: './tools/x.js', description: 'a native tool with a colliding id' }]
    },
    'tools/x.js': '\'use strict\'\nmodule.exports = { schema: {}, handler: async () => ({ content: [{ type: \'text\', text: \'ok\' }] }) }'
  })

  const gatewayDir = path.join(FIXTURES_DIR, 'dup-gateway')
  writeGatewayPluginFixture(gatewayDir)

  const port = nextPort++
  try {
    await createMcpServer(path.join(FIXTURES_DIR, 'root'), port, {}, [nativeDir], [gatewayDir])
    t.fail('should have thrown')
  } catch (err) {
    t.ok(err.message.startsWith('ERR_PLUGIN_TOOL_DUPLICATE_ID'), 'should throw ERR_PLUGIN_TOOL_DUPLICATE_ID')
    t.ok(err.message.includes('devices_get'), 'should name the offending tool id')
  }
  t.pass()
})
