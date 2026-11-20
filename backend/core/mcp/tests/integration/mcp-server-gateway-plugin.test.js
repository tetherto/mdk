'use strict'

// The MCP server against real app runtimes (in-process, over a local HyperDHT
// testnet): it reads each app's route table only, and every tool call is
// forwarded over HRPC to the app's runtime, as the Gateway forwards requests.

const test = require('brittle')
const path = require('path')
const fs = require('fs')
const createTestnet = require('hyperdht/testnet')
const { Client } = require('@modelcontextprotocol/sdk/client/index.js')
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js')
const { createAppRuntime } = require('@tetherto/mdk-app-runtime')
const { createMcpServer } = require('../../server')

const FIXTURES = path.join(path.dirname(require.resolve('@tetherto/mdk-app-runtime/package.json')), 'tests', 'fixtures')
const ECHO_APP = path.join(FIXTURES, 'echo-app')
const { tmpDir, capturingLogger } = require(path.join(FIXTURES, 'helpers'))
const LOOPBACK = '127.0.0.1'

let nextPort = 41830

function writeFixture (dir, files) {
  fs.mkdirSync(dir, { recursive: true })
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(dir, name)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, typeof content === 'string' ? content : JSON.stringify(content, null, 2))
  }
}

async function connectClient (t, port) {
  const client = new Client({ name: 'test-client', version: '1.0.0' })
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`))
  await client.connect(transport)
  t.teardown(() => client.close())
  return client
}

async function startServer (t, ...args) {
  const httpServer = await createMcpServer(...args)
  t.teardown(() => new Promise((resolve) => httpServer.close(resolve)))
  return httpServer
}

// Strips the untrusted-data frame the server puts around every text result.
function unwrap (text) {
  const match = /^<untrusted-tool-output tool="[^"]*">\n([\s\S]*)\n<\/untrusted-tool-output>\n/.exec(text)
  if (!match) throw new Error(`not framed as untrusted tool output: ${text}`)
  return match[1]
}

async function call (client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args })
  const text = result.isError ? result.content[0].text : unwrap(result.content[0].text)
  return { isError: !!result.isError, text, body: result.isError ? null : JSON.parse(text) }
}

function writeMixedApp (dir) {
  const route = (id, extra) => ({ id, description: id, http: { method: 'POST', path: `/${id}` }, handler: './controllers/whoami.js', ...extra })
  writeFixture(dir, {
    'mdk-plugin.json': {
      name: '@test/mdk-app-mixed',
      version: '1.0.0',
      description: 'routes with every safety/auth/stream combination',
      routes: [
        route('ro', { safety: 'read-only' }),
        route('write', { safety: 'write' }),
        route('unstated'),
        route('authed', { safety: 'read-only', auth: true }),
        route('streamed', { safety: 'read-only', stream: true })
      ]
    }
  })
  return dir
}

test('createMcpServer - forwards app tool calls to the app runtime and loads no app code', { timeout: 120000 }, async (t) => {
  const testnet = await createTestnet(4, t.teardown)
  const dir = tmpDir(t)
  const appKeyFile = path.join(dir, 'run', 'echo.key')
  const mcpKeyFile = path.join(dir, 'run', 'mcp.key')
  const identity = { user: { userId: 'mcp-agent' } }

  const port = nextPort++
  await startServer(t, path.join(dir, 'mcp'), port, { kernelBootstrap: testnet.bootstrap, kernelDhtHost: LOOPBACK }, [],
    [{ name: 'echo', appDir: ECHO_APP, keyFile: appKeyFile }],
    { allowWrite: true, identity, keyFile: mcpKeyFile })
  const mcp = await connectClient(t, port)

  t.is(globalThis.__echoAppLoads, undefined, 'serving the tools loaded no controller')
  t.alike(Object.keys(require.cache).filter((k) => k.startsWith(path.join(ECHO_APP, 'controllers'))), [], 'and none entered require.cache')
  t.ok(/^[0-9a-f]{64}$/.test(fs.readFileSync(mcpKeyFile, 'utf8')), 'the server published the key it calls runtimes with')

  const { tools } = await mcp.listTools()
  const names = tools.map((tool) => tool.name)
  t.ok(names.includes('whoami_auth') && names.includes('echo'), 'the app routes are listed as tools')
  t.ok(!names.includes('stream') && !names.includes('stream_fail'), 'stream routes produce no tool')

  t.alike(await call(mcp, 'whoami'), { isError: true, text: 'ERR_APP_RUNTIME_UNAVAILABLE: echo', body: null }, 'a call before the runtime is up fails cleanly')

  const runtime = createAppRuntime({ name: 'echo', appDir: ECHO_APP, bootstrap: testnet.bootstrap, dhtHost: LOOPBACK, keyFile: appKeyFile, allowedKeyFiles: [mcpKeyFile], logger: capturingLogger() })
  await runtime.start()
  t.teardown(() => runtime.stop())

  t.alike((await call(mcp, 'echo')).body, { params: {}, query: {}, body: {}, headers: {} }, 'the request reaches the controller in the runtime')
  t.alike((await call(mcp, 'whoami_auth')).body, { info: identity }, 'the configured identity arrives as req._info')
  t.alike(await call(mcp, 'fail_safe'), { isError: true, text: 'ERR_ECHO_REJECTED: nope', body: null }, 'an ERR_ error reaches the model')

  const originalError = console.error
  console.error = () => {}
  t.teardown(() => { console.error = originalError })
  t.alike(await call(mcp, 'fail_masked'), { isError: true, text: 'ERR_TOOL_FAILED', body: null }, 'any other error stays masked')
})

test('createMcpServer - a runtime that does not allow-list the MCP key refuses its calls', { timeout: 120000 }, async (t) => {
  const testnet = await createTestnet(4, t.teardown)
  const dir = tmpDir(t)
  const appKeyFile = path.join(dir, 'run', 'echo.key')

  const runtime = createAppRuntime({ name: 'echo', appDir: ECHO_APP, bootstrap: testnet.bootstrap, dhtHost: LOOPBACK, keyFile: appKeyFile, allowedKeyFiles: [], logger: capturingLogger() })
  await runtime.start()
  t.teardown(() => runtime.stop())

  const port = nextPort++
  await startServer(t, path.join(dir, 'mcp'), port, { kernelBootstrap: testnet.bootstrap, kernelDhtHost: LOOPBACK }, [],
    [{ name: 'echo', appDir: ECHO_APP, keyFile: appKeyFile }], { allowWrite: true, keyFile: path.join(dir, 'run', 'mcp.key') })
  const mcp = await connectClient(t, port)

  const { isError, text } = await call(mcp, 'whoami')
  t.ok(isError && text.startsWith('ERR_APP_RUNTIME_UNAVAILABLE'), text)
})

test('createMcpServer - omitting apps serves only native tools', async (t) => {
  const dir = path.join(tmpDir(t), 'native-only')
  writeFixture(dir, {
    'mcp-plugin.json': {
      name: '@test/mcp-plugin-native-only',
      version: '1.0.0',
      tools: [{ id: 'echo', handler: './tools/echo.js', description: 'echoes', annotations: { readOnlyHint: true } }]
    },
    'tools/echo.js': '\'use strict\'\nmodule.exports = { schema: {}, handler: async () => ({ content: [{ type: \'text\', text: \'ok\' }] }) }'
  })

  const port = nextPort++
  await startServer(t, path.join(dir, 'root'), port, {}, [dir])
  const mcp = await connectClient(t, port)

  const { tools } = await mcp.listTools()
  t.alike(tools.map((tool) => tool.name), ['echo'], 'should serve only the native tool')
})

test('createMcpServer - a duplicate tool id between pluginDirs and apps throws ERR_PLUGIN_TOOL_DUPLICATE_ID', async (t) => {
  const base = tmpDir(t)
  const nativeDir = path.join(base, 'dup-native')
  writeFixture(nativeDir, {
    'mcp-plugin.json': {
      name: '@test/mcp-plugin-dup-native',
      version: '1.0.0',
      tools: [{ id: 'whoami', handler: './tools/x.js', description: 'a native tool with a colliding id' }]
    },
    'tools/x.js': '\'use strict\'\nmodule.exports = { schema: {}, handler: async () => ({ content: [{ type: \'text\', text: \'ok\' }] }) }'
  })

  await t.exception(
    () => createMcpServer(path.join(base, 'root'), nextPort++, {}, [nativeDir], [{ name: 'echo', appDir: ECHO_APP, keyFile: path.join(base, 'echo.key') }]),
    /ERR_PLUGIN_TOOL_DUPLICATE_ID.*"whoami"/
  )
})

test('createMcpServer - a malformed appTimeoutMs fails the boot, as in the Gateway', async (t) => {
  const base = tmpDir(t)
  await t.exception(
    () => createMcpServer(path.join(base, 'root'), nextPort++, { appTimeoutMs: 'soon' }, [], [{ name: 'echo', appDir: ECHO_APP, keyFile: path.join(base, 'echo.key') }]),
    /ERR_GATEWAY_APP_TIMEOUT_INVALID/
  )
})

test('createMcpServer - app write/unstated, auth and stream routes are withheld by default', async (t) => {
  const testnet = await createTestnet(4, t.teardown)
  const dir = tmpDir(t)
  const app = { name: 'mixed', appDir: writeMixedApp(path.join(dir, 'mixed')), keyFile: path.join(dir, 'mixed.key') }

  const originalWarn = console.warn
  let warned = ''
  console.warn = (msg) => { warned += msg }
  t.teardown(() => { console.warn = originalWarn })

  const port = nextPort++
  await startServer(t, path.join(dir, 'mcp'), port, { kernelBootstrap: testnet.bootstrap, kernelDhtHost: LOOPBACK }, [], [app])
  const mcp = await connectClient(t, port)

  const { tools } = await mcp.listTools()
  t.alike(tools.map((tool) => tool.name), ['ro'], 'only the read-only, non-auth, non-stream route should be exposed')
  t.ok(warned.includes('write') && warned.includes('authed'), 'the withheld tools should be named in a warning')
  t.ok((await mcp.callTool({ name: 'write', arguments: {} })).isError, 'calling a withheld tool should fail')
})

test('createMcpServer - allowWrite + identity expose write and auth routes', async (t) => {
  const testnet = await createTestnet(4, t.teardown)
  const dir = tmpDir(t)
  const app = { name: 'mixed', appDir: writeMixedApp(path.join(dir, 'mixed')), keyFile: path.join(dir, 'mixed.key') }

  const port = nextPort++
  await startServer(t, path.join(dir, 'mcp'), port, { kernelBootstrap: testnet.bootstrap, kernelDhtHost: LOOPBACK }, [], [app],
    { allowWrite: true, identity: { user: { userId: 'mcp-agent' } } })
  const mcp = await connectClient(t, port)

  const { tools } = await mcp.listTools()
  t.alike(tools.map((tool) => tool.name).sort(), ['authed', 'ro', 'unstated', 'write'], 'every non-stream route should be exposed')
})

test('createMcpServer - an auth route whose permissions the identity lacks is withheld, as the Gateway verifier would refuse it', async (t) => {
  const testnet = await createTestnet(4, t.teardown)
  const dir = tmpDir(t)
  const appDir = path.join(dir, 'perms')
  const route = (id, extra) => ({ id, description: id, http: { method: 'POST', path: `/${id}` }, handler: './controllers/whoami.js', auth: true, ...extra })
  writeFixture(appDir, {
    'mdk-plugin.json': {
      name: '@test/mdk-app-perms',
      version: '1.0.0',
      description: 'auth routes with permissions',
      routes: [
        route('status', { safety: 'read-only', permissions: ['read'] }),
        route('reboot', { safety: 'write', permissions: ['read', 'miner:w'] })
      ]
    }
  })
  const app = { name: 'perms', appDir, keyFile: path.join(dir, 'perms.key') }

  const originalWarn = console.warn
  let warned = ''
  console.warn = (msg) => { warned += msg }
  t.teardown(() => { console.warn = originalWarn })

  const port = nextPort++
  await startServer(t, path.join(dir, 'mcp'), port, { kernelBootstrap: testnet.bootstrap, kernelDhtHost: LOOPBACK }, [], [app],
    { allowWrite: true, identity: { user: { userId: 'mcp-agent' }, perms: ['read'] } })
  const mcp = await connectClient(t, port)

  const { tools } = await mcp.listTools()
  t.alike(tools.map((tool) => tool.name), ['status'], 'only the route the identity has permissions for should be exposed')
  t.ok(warned.includes('reboot'), 'the withheld route should be named in a warning')
  t.ok((await mcp.callTool({ name: 'reboot', arguments: {} })).isError, 'calling the withheld route should fail')
})
