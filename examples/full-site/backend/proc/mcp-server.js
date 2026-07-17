'use strict'

// Per-process entrypoint: boots the MCP server, connecting to kernel by its
// .kernel-key public key via HRPC. Exposes MCP tools over Streamable HTTP so
// AI agents can query and control the mining site.
//   node mcp-server.js [--root <dir>] [--port <n>]
const path = require('path')
const fs = require('fs')
const http = require('http')
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js')
const { z } = require('zod')
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js')
const { createMdkClient } = require('../../../../backend/core/client')
const { ROOT, MCP_PORT } = require('../site')
const { arg } = require('../argv')

// Register all MCP tools onto a server instance using the given Client.
// Exported so unit tests can wire a fake client without starting the HTTP layer.
function registerTools (server, client) {
  server.tool(
    'get_status',
    'Get current status of all workers and device counts',
    {},
    async () => {
      const status = await client.getStatus()
      return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] }
    }
  )

  server.tool(
    'get_capabilities',
    'Get the capabilities (command schema) for a device',
    { deviceId: z.string().describe('The device ID to query') },
    async ({ deviceId }) => {
      const caps = await client.getCapabilities(deviceId)
      return { content: [{ type: 'text', text: JSON.stringify(caps, null, 2) }] }
    }
  )

  server.tool(
    'pull_telemetry',
    'Pull telemetry metrics for a device',
    {
      deviceId: z.string().describe('The device ID to query'),
      query: z.string().default('metrics').describe('Telemetry query type (e.g. "metrics")')
    },
    async ({ deviceId, query }) => {
      const result = await client.pullTelemetry(deviceId, query)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )

  server.tool(
    'pull_state',
    'Pull current state snapshot for a device',
    { deviceId: z.string().describe('The device ID to query') },
    async ({ deviceId }) => {
      const result = await client.pullState(deviceId)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )

  server.tool(
    'get_supported_power_modes',
    'Get the supported power modes for a device',
    { deviceId: z.string().describe('The device ID to query') },
    async ({ deviceId }) => {
      const POWER_MODES_BY_PREFIX = [
        { prefix: 'whatsminer-', modes: ['low', 'normal', 'high', 'sleep'] },
        { prefix: 'antminer-', modes: ['sleep', 'normal'] },
        { prefix: 'avalon-', modes: ['normal', 'high', 'sleep'] }
      ]
      const match = POWER_MODES_BY_PREFIX.find((e) => deviceId.startsWith(e.prefix))
      const result = match
        ? { deviceId, supportedPowerModes: match.modes }
        : { deviceId, supportedPowerModes: null, reason: 'device type not recognised' }
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )

  server.tool(
    'send_command',
    'Send a command to a device (e.g. reboot, set_power_mode)',
    {
      deviceId: z.string().describe('The device ID to target'),
      command: z.string().describe('The command name'),
      params: z.record(z.unknown()).default({}).describe('Command parameters')
    },
    async ({ deviceId, command, params }) => {
      const result = await client.sendCommand(deviceId, command, params)
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    }
  )
}

async function main () {
  const root = arg('--root', ROOT)
  const port = Number(arg('--port', MCP_PORT))

  const kernelKeyFile = path.join(root, '.kernel-key')
  if (!fs.existsSync(kernelKeyFile)) throw new Error('ERR_KERNEL_KEY_MISSING: start kernel first')
  const kernelKey = fs.readFileSync(kernelKeyFile, 'utf8').trim()

  const client = createMdkClient({ hrpc: { key: kernelKey } })
  await client.connect({ warmup: true })

  const httpServer = http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/mcp') {
      res.writeHead(404).end()
      return
    }
    const server = new McpServer({ name: 'mdk-full-site', version: '1.0.0' })
    registerTools(server, client)
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    try {
      await server.connect(transport)
      await transport.handleRequest(req, res)
    } catch (err) {
      console.error(err)
      if (!res.writableEnded) res.writeHead(500).end()
    }
  })

  await new Promise((resolve) => httpServer.listen(port, '127.0.0.1', resolve))

  const shutdown = async () => {
    await client.close()
    httpServer.close(() => process.exit(0))
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)

  console.log('MDK_READY mcp-server port=%d kernel=%s', port, kernelKey.slice(0, 16))
}

module.exports = { registerTools }

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
