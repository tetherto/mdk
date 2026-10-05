import test from 'brittle'
import http from 'node:http'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { connectMcp } from '../../src/mcp.js'
import { buildToolSystem } from '../../src/loop.js'
import { createAgent } from '../../src/agent.js'
import { admitTools, renderTools, agentMeta, AGENT_META_KEY, AXIS, CAPABILITY, TOOL_CONTRACT_VERSION } from '../../src/tools.js'

const compliantTool = {
  name: 'count_devices',
  description: 'How many devices, by family and state.',
  inputSchema: {
    type: 'object',
    properties: {
      family: { type: 'string', enum: AXIS.family, default: 'all' },
      state: { type: 'string', enum: AXIS.state, default: 'all' }
    }
  },
  annotations: { readOnlyHint: true },
  _meta: {
    [AGENT_META_KEY]: {
      enabled: true,
      answers: 'How many devices, by family and state.',
      useWhen: ['how many miners', 'number of offline devices'],
      notFor: ['listing them (use list_devices)'],
      returns: 'a count with a one-line summary',
      minCapability: CAPABILITY.SMALL,
      contract: TOOL_CONTRACT_VERSION
    }
  }
}

const legacyTool = {
  name: 'get_status',
  description: 'Raw dump of every worker.',
  inputSchema: { type: 'object', properties: {} }
}

// A stateless MCP server over Streamable HTTP serving the given descriptors verbatim, so the
// test exercises the real transport and the SDK's client-side parsing.
async function serveHttp (t, tools) {
  const httpServer = http.createServer(async (req, res) => {
    const server = new Server({ name: 'tool-contract-test', version: '1.0.0' }, { capabilities: { tools: {} } })
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }))
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    await server.connect(transport)
    await transport.handleRequest(req, res)
  })
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve))

  // close() alone waits on the keep-alive sockets a client leaves open and never returns.
  t.teardown(async () => {
    httpServer.closeAllConnections()
    await new Promise((resolve) => httpServer.close(resolve))
  })
  return httpServer
}

async function serveTools (t, tools) {
  const httpServer = await serveHttp(t, tools)
  const mcp = await connectMcp(`http://127.0.0.1:${httpServer.address().port}/mcp`)
  t.teardown(() => mcp.close())
  return mcp
}

test('a compliant tool served over MCP is admitted, a legacy one is not', async (t) => {
  const mcp = await serveTools(t, [compliantTool, legacyTool])
  const tools = await mcp.listTools()
  t.is(tools.length, 2, 'both tools reach the client')

  const { admitted, skipped } = admitTools(tools)
  t.is(admitted.length, 1, 'exactly the compliant tool is admitted')
  t.is(admitted[0].name, 'count_devices')
  t.alike(skipped, [{ name: 'get_status', reason: 'not agent-enabled' }])
})

test('the contract and the parameter vocabulary survive the transport', async (t) => {
  const mcp = await serveTools(t, [compliantTool])
  const [received] = await mcp.listTools()

  t.ok(agentMeta(received), 'the agent block arrives in _meta')
  t.is(received.annotations.readOnlyHint, true, 'declared MCP hints arrive')
  t.alike(received.inputSchema.properties.family.enum, AXIS.family, 'enum values arrive intact')
  t.is(received.inputSchema.properties.family.default, 'all', 'defaults arrive intact')
})

test('a tool admitted over MCP renders into the prompt block', async (t) => {
  const mcp = await serveTools(t, [compliantTool])
  const { admitted } = admitTools(await mcp.listTools())
  const block = renderTools(admitted)

  t.ok(block.includes('count_devices — How many devices'), 'headline')
  t.ok(block.includes('family=[miner|container|powermeter|sensor|pool|all]="all"'), 'enum values print verbatim')
  t.ok(block.includes('use when : "how many miners"'), 'routing phrasings')
})

test('createAgent exposes only admitted tools, and reports the rest', async (t) => {
  const httpServer = await serveHttp(t, [compliantTool, legacyTool])
  const agent = await createAgent({
    provider: { kind: 'qvac', mode: 'external', baseURL: 'http://127.0.0.1:1/v1', model: 'unused' },
    mcp: { url: `http://127.0.0.1:${httpServer.address().port}/mcp` }
  })
  t.teardown(() => agent.close())

  t.alike(agent.tools.map((tool) => tool.name), ['count_devices'], 'sessions inherit admitted tools only')
  t.alike(agent.skipped, [{ name: 'get_status', reason: 'not agent-enabled' }])
})

// The tool list is filtered once in createAgent and shared, never re-derived per path, so a
// session renders the same prefix the agent would.
test('a session renders the same prompt prefix as the agent it came from', async (t) => {
  const httpServer = await serveHttp(t, [compliantTool, legacyTool])
  const agent = await createAgent({
    provider: { kind: 'qvac', mode: 'external', baseURL: 'http://127.0.0.1:1/v1', model: 'unused' },
    mcp: { url: `http://127.0.0.1:${httpServer.address().port}/mcp` }
  })
  t.teardown(() => agent.close())

  const session = await agent.createSession()
  t.is(buildToolSystem(session.system, session.tools), buildToolSystem(session.system, agent.tools))
  t.ok(buildToolSystem(session.system, session.tools).includes('count_devices'), 'and it carries the admitted tool')
})

test('a tool whose capability floor exceeds the model is withheld', async (t) => {
  const needsMid = structuredClone(compliantTool)
  needsMid.name = 'diagnose_site'
  needsMid._meta[AGENT_META_KEY].minCapability = CAPABILITY.MID

  const mcp = await serveTools(t, [needsMid])
  const tools = await mcp.listTools()

  t.is(admitTools(tools, { capability: CAPABILITY.SMALL }).admitted.length, 0, 'hidden from a small model')
  t.is(admitTools(tools, { capability: CAPABILITY.MID }).admitted.length, 1, 'shown to a mid model')
})
