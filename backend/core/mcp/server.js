'use strict'

const http = require('http')
const path = require('path')
const createLogger = require('debug')
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js')
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js')
const { loadPlugin } = require('./lib/plugin-loader')
const { loadGatewayPluginTools } = require('./lib/from-gateway-plugin')
const { buildPluginContext } = require('@tetherto/mdk-gateway/workers/lib/plugin-gateway')

const AGENT_META_KEY = 'x-mdk-agent'

function _toolRegistrations (tools) {
  return tools.map((tool) => [tool.id, {
    description: tool.description,
    inputSchema: tool.schema,
    ...(tool.annotations ? { annotations: tool.annotations } : {}),
    ...(tool.agent ? { _meta: { [AGENT_META_KEY]: tool.agent } } : {})
  }, (args) => tool._handler(args)])
}

// Bare HTTP+MCP server over a fixed tool set — no plugin loading. Kept
// separate from createMcpServer() below (which does the loading) so the
// listener only opens once every tool from both sources is resolved. Internal
// only: no consumer outside this file needs a server without plugin loading.
async function startMcpHttpServer (port, tools) {
  if (!port) throw new Error('ERR_INVALID_MCP_PORT')

  const registrations = _toolRegistrations(tools || [])

  const httpServer = http.createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/mcp') {
      res.writeHead(404).end()
      return
    }
    const server = new McpServer({ name: 'mdk-mcp', version: '1.0.0' })
    for (const args of registrations) server.registerTool(...args)
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

  return httpServer
}

// Cross-source uniqueness check: loadPlugin() and loadGatewayPluginTools()
// each only guarantee unique ids within their own manifest, so two different
// plugin sources (a native mcp-plugin.json and a Gateway plugin's contract,
// or two Gateway plugins) could otherwise collide silently once merged. Each
// `tool` here carries a `_source` (its plugin dir, tagged on below) so the
// cross-source case — the one where the id alone doesn't tell you which two
// plugins collided — names both, matching lib/plugin-loader.js's own
// `${pluginDir}: duplicate tool id "..."` format for the single-source case.
function _assertUniqueToolIds (tools) {
  const sourceById = new Map()
  for (const tool of tools) {
    const existingSource = sourceById.get(tool.id)
    if (existingSource !== undefined) {
      throw new Error(`ERR_PLUGIN_TOOL_DUPLICATE_ID: ${existingSource} and ${tool._source}: duplicate tool id "${tool.id}"`)
    }
    sourceById.set(tool.id, tool._source)
  }
}

// Builds what a Gateway plugin sees as require('@tetherto/mdk-gateway/plugin').
// Delegates to the Gateway's own buildPluginContext()
// (backend/core/gateway/workers/lib/plugin-gateway.js, which this package now
// depends on) instead of hand-copying its config precedence/logger/onReady
// shape, so the two can't drift apart. `wrk` is the minimal shim
// buildPluginContext expects: `ctx` supplies kernelKey/kernelBootstrap, `conf`
// is the shared server-wide config layer, and onGatewayReady queues its
// callback onto `readyCallbacks` rather than running it inline — matching the
// real Gateway's contract, where onReady fires only once the listener is
// actually serving (see _runReadyCallbacks below), not at plugin-load time.
// `entryConfig` is that one gatewayPluginDirs entry's own override
// (spec.gateway.plugins[].config equivalent) and wins key-by-key over `conf`.
function _buildGatewayPluginContext (conf, dir, entryConfig, readyCallbacks) {
  const { context } = buildPluginContext({ ctx: conf, conf, onGatewayReady: (fn) => readyCallbacks.push(fn) }, dir, entryConfig)
  return context
}

// Fires every queued onReady callback now that the HTTP server is actually
// serving — mirroring the real Gateway's _notifyGatewayReady: fire-and-forget,
// and a throw is warned about rather than propagated, so one plugin's broken
// onReady does not cost its neighbours theirs (or bring the server down after
// it has already started).
function _runReadyCallbacks (readyCallbacks) {
  for (const fn of readyCallbacks) {
    try {
      fn()
    } catch (err) {
      console.warn(`a plugin's onReady callback threw: ${err.message}`)
    }
  }
}

/**
 * Boots the standalone MCP server: loads tools from two independent sources
 * and merges them into one tool set served over MCP.
 *
 * @param {string} root - Working directory for this server instance.
 * @param {number} port - Port to listen on (127.0.0.1 only).
 * @param {object} config - `{ kernelKey, kernelBootstrap, ... }`, frozen and handed
 *   to every plugin as its ambient config (see below).
 * @param {Array<string>} [pluginDirs] - Directories of author-written, native
 *   `mcp-plugin.json` plugins (see lib/plugin-loader.js). Unchanged from before.
 * @param {Array<string|{dir: string, config: object}>} [gatewayPluginDirs] - Gateway
 *   plugin directories (an `mdk-plugin.json` + routes, the same "contract" the
 *   Gateway itself loads via @tetherto/mdk-gateway/workers/lib/plugin-loader) whose
 *   routes are converted into MCP tools by lib/from-gateway-plugin.js. Each entry is
 *   either a plain directory path, or `{ dir, config }` to override/extend the shared
 *   `config` for that one plugin — mirroring the shape the Gateway itself accepts for
 *   `extraPluginDirs`. Optional: omitting it (or passing `[]`/`undefined`) behaves
 *   exactly as before this parameter existed.
 * @returns {Promise<http.Server>}
 */
const createMcpServer = async (root, port, config, pluginDirs, gatewayPluginDirs) => {
  if (!root) throw new Error('ERR_INVALID_MCP_ROOT')
  if (!port) throw new Error('ERR_INVALID_MCP_PORT')

  // What a plugin sees as '@tetherto/mdk-mcp/plugin'. The plugin authors its
  // own kernel client from config.kernelKey/kernelBootstrap; the server no
  // longer owns one.
  const conf = Object.freeze({ ...(config || {}) })
  const nativeTools = (pluginDirs || []).flatMap((dir) => loadPlugin(dir, Object.freeze({
    config: conf,
    logger: createLogger(`mdk:mcp:plugin:${path.basename(dir)}`)
  })).tools.map((tool) => ({ ...tool, _source: dir })))

  // Collected across every Gateway plugin and fired only once the HTTP server
  // below is actually serving — see _buildGatewayPluginContext/_runReadyCallbacks.
  const readyCallbacks = []
  const gatewayTools = (gatewayPluginDirs || []).flatMap((entry) => {
    const dir = typeof entry === 'string' ? entry : entry.dir
    const entryConfig = typeof entry === 'string' ? undefined : entry.config
    return loadGatewayPluginTools(dir, _buildGatewayPluginContext(conf, dir, entryConfig, readyCallbacks))
      .map((tool) => ({ ...tool, _source: dir }))
  })

  const tools = [...nativeTools, ...gatewayTools]
  _assertUniqueToolIds(tools)

  const httpServer = await startMcpHttpServer(port, tools)
  _runReadyCallbacks(readyCallbacks)

  const shutdown = () => {
    httpServer.close(() => process.exit(0))
  }

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)

  return httpServer
}

// Public surface: createMcpServer covers every CLI/example use today, and
// loadGatewayPluginTools lets a caller convert one Gateway plugin's contract
// into tools without booting a whole server. startMcpHttpServer and
// generateToolsFromGatewayPlugin have no consumer outside this package (the
// Gateway no longer boots MCP) and aren't documented in the README's API
// section, so they stay internal — require('./server') directly in tests
// that need them.
module.exports = {
  createMcpServer,
  loadGatewayPluginTools
}
