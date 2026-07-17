'use strict'

// Unit tests for the MCP server component:
//   - tool handler behaviour (registerTools) via a fake Client
//   - spawnDescriptor and COMPONENTS membership for mcp-server
//   - dispatcher dependency enforcement (Kernel required before mcp-server)
//   - MCP_PORT export from backend/site

const test = require('brittle')
const path = require('path')

const { registerTools } = require('../../backend/proc/mcp-server')
const { spawnDescriptor, resolveProcName, COMPONENTS } = require('../../cli/commands/components')
const { createDispatcher } = require('../../cli/commands')
const { MCP_PORT } = require('../../backend/site')

const SITE = path.join(__dirname, '..', '..')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// A fake Client whose methods return controllable responses.
function fakeClient (overrides = {}) {
  return {
    getStatus: async () => ({
      workers: [
        { workerId: 'whatsminer-worker', state: 'READY', healthState: 'HEALTHY', deviceIds: ['wm001', 'wm002'], deviceCount: 2, rpcKey: 'aa'.repeat(32) }
      ],
      totalDevices: 2
    }),
    getCapabilities: async (deviceId) => ({
      deviceId,
      commands: [{ name: 'reboot', params: {} }, { name: 'setPowerMode', params: { mode: 'string' } }]
    }),
    pullTelemetry: async (deviceId, query) => ({
      deviceId,
      query,
      metrics: { hashrate_mhs: 100e6, power_w: 3300 }
    }),
    pullState: async (deviceId) => ({
      deviceId,
      state: { status: 'mining', power_mode: 'normal' }
    }),
    sendCommand: async (deviceId, command, params) => ({
      commandId: 'cmd-1',
      deviceId,
      command,
      params,
      status: 'QUEUED'
    }),
    ...overrides
  }
}

// Capture tool handlers registered via server.tool() without the McpServer HTTP stack.
function captureTools (client) {
  const tools = {}
  const mockServer = {
    tool (name, _description, _schema, handler) {
      tools[name] = handler
    }
  }
  registerTools(mockServer, client)
  return tools
}

// ---------------------------------------------------------------------------
// Tool: get_status
// ---------------------------------------------------------------------------

test('get_status returns serialised worker list', async (t) => {
  const tools = captureTools(fakeClient())
  const result = await tools.get_status({})
  t.is(result.content.length, 1)
  t.is(result.content[0].type, 'text')
  const parsed = JSON.parse(result.content[0].text)
  t.is(parsed.workers.length, 1)
  t.is(parsed.workers[0].workerId, 'whatsminer-worker')
  t.is(parsed.totalDevices, 2)
})

test('get_status forwards client errors', async (t) => {
  const client = fakeClient({ getStatus: async () => { throw new Error('ERR_TIMEOUT') } })
  const tools = captureTools(client)
  await t.exception(() => tools.get_status({}), /ERR_TIMEOUT/)
})

// ---------------------------------------------------------------------------
// Tool: get_capabilities
// ---------------------------------------------------------------------------

test('get_capabilities returns command schema for the device', async (t) => {
  const tools = captureTools(fakeClient())
  const result = await tools.get_capabilities({ deviceId: 'wm001' })
  const parsed = JSON.parse(result.content[0].text)
  t.is(parsed.deviceId, 'wm001')
  t.ok(Array.isArray(parsed.commands))
  t.ok(parsed.commands.some((c) => c.name === 'reboot'))
})

test('get_capabilities passes the deviceId through', async (t) => {
  let seen
  const client = fakeClient({
    getCapabilities: async (deviceId) => { seen = deviceId; return { deviceId, commands: [] } }
  })
  const tools = captureTools(client)
  await tools.get_capabilities({ deviceId: 'am007' })
  t.is(seen, 'am007')
})

// ---------------------------------------------------------------------------
// Tool: pull_telemetry
// ---------------------------------------------------------------------------

test('pull_telemetry passes the zod-defaulted query "metrics" to the client', async (t) => {
  let seenQuery
  const client = fakeClient({
    pullTelemetry: async (deviceId, query) => { seenQuery = query; return { deviceId, query } }
  })
  const tools = captureTools(client)
  // zod applies .default('metrics') before the handler runs; pass that value explicitly here
  await tools.pull_telemetry({ deviceId: 'wm001', query: 'metrics' })
  t.is(seenQuery, 'metrics')
})

test('pull_telemetry passes an explicit query through', async (t) => {
  let seenQuery
  const client = fakeClient({
    pullTelemetry: async (deviceId, query) => { seenQuery = query; return { deviceId, query } }
  })
  const tools = captureTools(client)
  await tools.pull_telemetry({ deviceId: 'wm001', query: 'logs' })
  t.is(seenQuery, 'logs')
})

test('pull_telemetry returns serialised result', async (t) => {
  const tools = captureTools(fakeClient())
  const result = await tools.pull_telemetry({ deviceId: 'wm001', query: 'metrics' })
  const parsed = JSON.parse(result.content[0].text)
  t.is(parsed.deviceId, 'wm001')
  t.ok(parsed.metrics)
})

// ---------------------------------------------------------------------------
// Tool: pull_state
// ---------------------------------------------------------------------------

test('pull_state returns serialised device state', async (t) => {
  const tools = captureTools(fakeClient())
  const result = await tools.pull_state({ deviceId: 'wm001' })
  const parsed = JSON.parse(result.content[0].text)
  t.is(parsed.deviceId, 'wm001')
  t.is(parsed.state.status, 'mining')
})

test('pull_state passes deviceId to the client', async (t) => {
  let seen
  const client = fakeClient({ pullState: async (deviceId) => { seen = deviceId; return { deviceId } } })
  const tools = captureTools(client)
  await tools.pull_state({ deviceId: 'av003' })
  t.is(seen, 'av003')
})

// ---------------------------------------------------------------------------
// Tool: send_command
// ---------------------------------------------------------------------------

test('send_command dispatches the command and returns the result', async (t) => {
  const calls = []
  const client = fakeClient({
    sendCommand: async (deviceId, command, params) => {
      calls.push({ deviceId, command, params })
      return { commandId: 'cmd-42', status: 'QUEUED' }
    }
  })
  const tools = captureTools(client)
  const result = await tools.send_command({ deviceId: 'wm001', command: 'reboot', params: {} })
  t.is(calls.length, 1)
  t.is(calls[0].deviceId, 'wm001')
  t.is(calls[0].command, 'reboot')
  const parsed = JSON.parse(result.content[0].text)
  t.is(parsed.commandId, 'cmd-42')
  t.is(parsed.status, 'QUEUED')
})

test('send_command passes the zod-defaulted params {} to the client', async (t) => {
  let seenParams
  const client = fakeClient({
    sendCommand: async (_deviceId, _command, params) => { seenParams = params; return {} }
  })
  const tools = captureTools(client)
  // zod applies .default({}) before the handler runs; pass that value explicitly here
  await tools.send_command({ deviceId: 'wm001', command: 'reboot', params: {} })
  t.alike(seenParams, {})
})

test('send_command forwards client errors', async (t) => {
  const client = fakeClient({
    sendCommand: async () => { throw new Error('ERR_DEVICE_OFFLINE') }
  })
  const tools = captureTools(client)
  await t.exception(() => tools.send_command({ deviceId: 'wm001', command: 'reboot' }), /ERR_DEVICE_OFFLINE/)
})

// ---------------------------------------------------------------------------
// registerTools: all six tools are registered
// ---------------------------------------------------------------------------

test('registerTools registers exactly six tools', (t) => {
  const names = []
  const mockServer = { tool (name) { names.push(name) } }
  registerTools(mockServer, fakeClient())
  t.alike(names.sort(), ['get_capabilities', 'get_status', 'get_supported_power_modes', 'pull_state', 'pull_telemetry', 'send_command'])
})

// ---------------------------------------------------------------------------
// CLI components: spawnDescriptor and COMPONENTS
// ---------------------------------------------------------------------------

test('COMPONENTS includes mcp-server', (t) => {
  t.ok(COMPONENTS.includes('mcp-server'))
})

test('resolveProcName resolves mcp-server to itself', (t) => {
  t.is(resolveProcName('mcp-server'), 'mcp-server')
})

test('spawnDescriptor for mcp-server has correct procName, entry, and argv', (t) => {
  const ctx = { siteDir: SITE, root: '/x', httpPort: 3007, uiPort: 3040, mcpPort: 3008 }
  const desc = spawnDescriptor(ctx, 'mcp-server')
  t.is(desc.procName, 'mcp-server')
  t.ok(desc.entry.endsWith(path.join('backend', 'proc', 'mcp-server.js')))
  t.ok(desc.argv.includes('--root'))
  t.ok(desc.argv.includes('/x'))
  t.ok(desc.argv.includes('--port'))
  t.ok(desc.argv.includes('3008'))
})

test('spawnDescriptor uses ctx.mcpPort when set', (t) => {
  const ctx = { siteDir: SITE, root: '/x', httpPort: 3007, uiPort: 3040, mcpPort: 4000 }
  const desc = spawnDescriptor(ctx, 'mcp-server')
  t.ok(desc.argv.includes('4000'))
})

test('spawnDescriptor falls back to MCP_PORT when ctx.mcpPort is absent', (t) => {
  const ctx = { siteDir: SITE, root: '/x', httpPort: 3007, uiPort: 3040 }
  const desc = spawnDescriptor(ctx, 'mcp-server')
  t.ok(desc.argv.includes(String(MCP_PORT)))
})

// ---------------------------------------------------------------------------
// Dispatcher: start mcp-server requires Kernel
// ---------------------------------------------------------------------------

test('dispatcher: start mcp-server is blocked when Kernel is not running', async (t) => {
  const out = []
  const ctx = {
    pm: { isAlive: () => false, has: () => false },
    root: '/none',
    siteDir: SITE,
    httpPort: 3007,
    uiPort: 3040,
    mcpPort: 3008,
    print: (s) => out.push(s)
  }
  const { dispatch } = createDispatcher(ctx)
  await dispatch('start mcp-server')
  t.is(out[0], 'ERR_KERNEL_NOT_RUNNING')
})

test('dispatcher: start mcp-server succeeds when Kernel is alive (component lookup)', async (t) => {
  const spawned = []
  const pm = {
    isAlive: (name) => name === 'kernel',
    has: () => false,
    spawn: (name, entry, argv) => {
      spawned.push({ name, entry, argv })
      const child = { stdout: { on () {} }, stderr: { on () {} }, on () {} }
      return { child, status: 'starting' }
    },
    waitForReady: async () => {}
  }
  const out = []
  const ctx = { pm, root: '/none', siteDir: SITE, httpPort: 3007, uiPort: 3040, mcpPort: 3008, print: (s) => out.push(s) }
  const { dispatch } = createDispatcher(ctx)
  await dispatch('start mcp-server')
  t.is(spawned.length, 1)
  t.is(spawned[0].name, 'mcp-server')
  t.ok(out[0].includes('mcp-server'))
})

// ---------------------------------------------------------------------------
// MCP_PORT export
// ---------------------------------------------------------------------------

test('MCP_PORT is exported from backend/site and is a positive number', (t) => {
  t.ok(typeof MCP_PORT === 'number')
  t.ok(MCP_PORT > 0)
})

test('MCP_PORT defaults to 3008', (t) => {
  // Only asserting the default value when the env var is not set.
  if (!process.env.MDK_MCP_PORT) t.is(MCP_PORT, 3008)
  else t.pass('MDK_MCP_PORT env var is set; skipping default assertion')
})
