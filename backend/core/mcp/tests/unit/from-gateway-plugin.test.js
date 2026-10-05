'use strict'

const test = require('brittle')
const path = require('path')
const os = require('os')
const fs = require('fs')
const { loadGatewayPluginTools } = require('../../lib/from-gateway-plugin')

const FIXTURES_DIR = path.join(os.tmpdir(), 'mdk-mcp-from-gateway-plugin-test-' + Date.now())

function writeFixture (dir, files) {
  fs.mkdirSync(dir, { recursive: true })
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(dir, name)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, typeof content === 'string' ? content : JSON.stringify(content, null, 2))
  }
}

function writeGatewayFixture (dir) {
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@example/mdk-plugin-devices',
      version: '1.0.0',
      description: 'device fleet routes',
      routes: [
        {
          id: 'devices.get',
          description: 'gets a device by id',
          http: {
            method: 'GET',
            path: '/devices/{id}',
            parameters: [
              { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
              { name: 'verbose', in: 'query', schema: { type: 'boolean' } }
            ]
          },
          safety: 'read-only',
          handler: './controllers/get-device.js'
        },
        {
          id: 'devices.reboot',
          description: 'reboots a device',
          http: { method: 'POST', path: '/devices/{id}/reboot' },
          safety: 'write',
          handler: './controllers/reboot-device.js'
        }
      ]
    },
    'controllers/get-device.js': [
      '\'use strict\'',
      'const { config } = require(\'@tetherto/mdk-gateway/plugin\')',
      'module.exports = async function (req) {',
      '  return { params: req.params, query: req.query, kernelKey: config.kernelKey }',
      '}'
    ].join('\n'),
    'controllers/reboot-device.js': [
      '\'use strict\'',
      'const { config } = require(\'@tetherto/mdk-gateway/plugin\')',
      'module.exports = async function () {',
      '  return { rebooted: true, kernelKey: config.kernelKey }',
      '}'
    ].join('\n')
  })
}

test('loadGatewayPluginTools - converts a Gateway plugin\'s routes into MCP tools', (t) => {
  const dir = path.join(FIXTURES_DIR, 'devices')
  writeGatewayFixture(dir)

  const context = Object.freeze({ config: Object.freeze({ kernelKey: 'a'.repeat(64) }) })
  const tools = loadGatewayPluginTools(dir, context)

  t.is(tools.length, 2, 'should have one tool per route')
  t.alike(tools.map((tool) => tool.id).sort(), ['devices_get', 'devices_reboot'], 'tool ids should match the sanitized route ids')
  t.pass()
})

test('loadGatewayPluginTools - tool.schema reflects the route\'s parameters', (t) => {
  const dir = path.join(FIXTURES_DIR, 'schema')
  writeGatewayFixture(dir)

  const context = Object.freeze({ config: Object.freeze({ kernelKey: 'a'.repeat(64) }) })
  const tools = loadGatewayPluginTools(dir, context)
  const getDevice = tools.find((tool) => tool.id === 'devices_get')

  t.ok(getDevice.schema.id, 'required path param should be present in the schema')
  t.ok(getDevice.schema.verbose, 'optional query param should be present in the schema')
  t.pass()
})

test('loadGatewayPluginTools - tool.annotations.readOnlyHint reflects route safety', (t) => {
  const dir = path.join(FIXTURES_DIR, 'annotations')
  writeGatewayFixture(dir)

  const context = Object.freeze({ config: Object.freeze({ kernelKey: 'a'.repeat(64) }) })
  const tools = loadGatewayPluginTools(dir, context)
  const getDevice = tools.find((tool) => tool.id === 'devices_get')
  const reboot = tools.find((tool) => tool.id === 'devices_reboot')

  t.is(getDevice.annotations.readOnlyHint, true, 'read-only route should map to readOnlyHint: true')
  t.is(reboot.annotations.readOnlyHint, false, 'write route should map to readOnlyHint: false')
  t.is(reboot.annotations.destructiveHint, true, 'write route should also set destructiveHint')
  t.pass()
})

test('loadGatewayPluginTools - calling a tool\'s _handler invokes the underlying route handler with the threaded context', async (t) => {
  const dir = path.join(FIXTURES_DIR, 'handler')
  writeGatewayFixture(dir)

  const context = Object.freeze({ config: Object.freeze({ kernelKey: 'b'.repeat(64) }) })
  const tools = loadGatewayPluginTools(dir, context)
  const getDevice = tools.find((tool) => tool.id === 'devices_get')

  const result = await getDevice._handler({ id: 'dev-1', verbose: true })
  const payload = JSON.parse(result.content[0].text)

  t.alike(payload.params, { id: 'dev-1' }, 'path param should reach the route handler as req.params')
  t.alike(payload.query, { verbose: true }, 'query param should reach the route handler as req.query')
  t.is(payload.kernelKey, 'b'.repeat(64), 'the handler should see the config threaded through the context, proving context threading works')
  t.pass()
})

test('loadGatewayPluginTools - propagates loader errors (e.g. missing manifest)', (t) => {
  const dir = path.join(FIXTURES_DIR, 'missing-manifest')
  fs.mkdirSync(dir, { recursive: true })

  try {
    loadGatewayPluginTools(dir, Object.freeze({ config: Object.freeze({}) }))
    t.fail('should have thrown')
  } catch (err) {
    t.ok(err.message.startsWith('ERR_PLUGIN_MANIFEST_MISSING'), 'should surface the gateway loader\'s error')
  }
  t.pass()
})
