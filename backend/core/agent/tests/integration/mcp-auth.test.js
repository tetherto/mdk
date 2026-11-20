import test from 'brittle'
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { generateCredential, signJwt, verifyJwt } from '@tetherto/mdk-identity'
import { connectMcp, mcpAuth } from '../../src/mcp.js'
import { createAgent } from '../../src/agent.js'
import { AGENT_META_KEY, AXIS, CAPABILITY, TOOL_CONTRACT_VERSION } from '../../src/tools.js'

const provider = () => ({ kind: 'qvac', mode: 'external', baseURL: 'http://127.0.0.1:1/v1', model: 'unused' })

const countDevices = {
  name: 'count_devices',
  description: 'How many devices, by family and state.',
  inputSchema: { type: 'object', properties: { family: { type: 'string', enum: AXIS.family, default: 'all' } } },
  annotations: { readOnlyHint: true },
  _meta: {
    [AGENT_META_KEY]: {
      enabled: true,
      answers: 'How many devices, by family and state.',
      useWhen: ['how many miners', 'number of offline devices'],
      notFor: ['listing them'],
      returns: 'a count',
      minCapability: CAPABILITY.SMALL,
      contract: TOOL_CONTRACT_VERSION
    }
  }
}

async function listen (t, handler) {
  const server = http.createServer(handler)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  // close() alone waits on the keep-alive sockets a client leaves open and never returns.
  t.teardown(async () => {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  })
  return `http://127.0.0.1:${server.address().port}`
}

// A stateless MCP server that, like `mdk run mcp` with spec.rbac, answers 401 to a request
// without one of the `valid` bearer tokens. `seen` records each request's method and token.
async function serveMcp (t, valid) {
  const seen = []
  const base = await listen(t, async (req, res) => {
    const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1] ?? null
    seen.push({ method: req.method, token })
    if (!valid.has(token)) {
      res.writeHead(401, { 'www-authenticate': 'Bearer' }).end()
      return
    }
    const server = new Server({ name: 'mcp-auth-test', version: '1.0.0' }, { capabilities: { tools: {} } })
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [countDevices] }))
    server.setRequestHandler(CallToolRequestSchema, async () => ({ content: [{ type: 'text', text: '{"count":3}' }] }))
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    await server.connect(transport)
    await transport.handleRequest(req, res)
  })
  return { url: `${base}/mcp`, seen }
}

// The Gateway's POST /auth/token: checks the assertion is signed by the account's own key and
// answers with an access token, which it adds to `valid` so the MCP server accepts it.
async function serveGateway (t, { name, privateKeyPem }, valid) {
  const issuerKey = crypto.generateKeyPairSync('ed25519').privateKey
  const accountKey = crypto.createPublicKey(privateKeyPem)
  const signIns = []
  const url = await listen(t, async (req, res) => {
    let body = ''
    for await (const chunk of req) body += chunk
    const reply = (status, payload) => res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(payload))
    if (req.method !== 'POST' || req.url !== '/auth/token') return reply(404, { message: 'ERR_NOT_FOUND' })
    let claims
    try {
      claims = verifyJwt(JSON.parse(body).assertion, { keyFor: () => accountKey })
    } catch {
      return reply(401, { message: 'ERR_AUTH_UNAUTHORIZED' })
    }
    if (claims.sub !== name) return reply(401, { message: 'ERR_AUTH_UNAUTHORIZED' })
    const accessToken = signJwt({ sub: name, jti: String(signIns.length), exp: Math.floor(Date.now() / 1000) + 600 }, issuerKey)
    signIns.push(accessToken)
    valid.add(accessToken)
    reply(200, { accessToken, expiresIn: 600 })
  })
  return { url, signIns }
}

function credentialFile (t, body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdk-agent-mcp-auth-'))
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))
  const file = path.join(dir, 'operator-agent.json')
  fs.writeFileSync(file, typeof body === 'string' ? body : JSON.stringify(body))
  return file
}

function serviceAccount (t) {
  const { publicKey, privateKeyPem } = generateCredential()
  const body = { name: 'operator-agent', publicKey, privateKeyPem, createdAt: new Date().toISOString() }
  return { ...body, file: credentialFile(t, body) }
}

test('without auth, a server that checks agents refuses the connection', async (t) => {
  const mcp = await serveMcp(t, new Set())
  await t.exception(connectMcp(mcp.url), /answered 401: set mcp.credential to the agent's service account/)
  t.ok(mcp.seen.every(({ token }) => token === null), 'no Authorization header was sent')
})

test('a token the server refuses at connect says so', async (t) => {
  const mcp = await serveMcp(t, new Set())
  await t.exception(connectMcp(mcp.url, mcpAuth({ token: 'stale' })), /answered 401: its token was refused/)
})

test('a fixed token is sent on every request, and tools list and call', async (t) => {
  const mcp = await serveMcp(t, new Set(['tok-1']))
  const client = await connectMcp(mcp.url, mcpAuth({ token: 'tok-1' }))
  t.teardown(() => client.close())

  t.alike((await client.listTools()).map((tool) => tool.name), ['count_devices'])
  t.alike(await client.callTool('count_devices', {}), { text: '{"count":3}', isError: false })
  t.ok(mcp.seen.length > 0 && mcp.seen.every(({ token }) => token === 'tok-1'), 'every request carried the token')
})

test('a fixed token that stops working is not retried', async (t) => {
  const valid = new Set(['tok-1'])
  const mcp = await serveMcp(t, valid)
  const client = await connectMcp(mcp.url, mcpAuth({ token: 'tok-1' }))
  t.teardown(() => client.close())

  valid.clear()
  // Counted as POSTs: the SDK also opens its optional SSE stream with a GET in the background.
  const posts = () => mcp.seen.filter(({ method }) => method === 'POST').length
  const before = posts()
  await t.exception(client.listTools(), /Streamable HTTP error/)
  t.is(posts() - before, 1, 'one request, no retry: there is nothing to renew a fixed token with')
})

test('a service account signs in at the Gateway once and its token rides every request', async (t) => {
  const valid = new Set()
  const account = serviceAccount(t)
  const gateway = await serveGateway(t, account, valid)
  const mcp = await serveMcp(t, valid)

  const client = await connectMcp(mcp.url, mcpAuth({ credential: { file: account.file, gatewayUrl: gateway.url } }))
  t.teardown(() => client.close())
  t.alike((await client.listTools()).map((tool) => tool.name), ['count_devices'])
  t.alike(await client.callTool('count_devices', {}), { text: '{"count":3}', isError: false })

  t.is(gateway.signIns.length, 1, 'one sign-in: the token is cached until it nears expiry')
  t.ok(mcp.seen.every(({ token }) => token === gateway.signIns[0]), 'every request carried the issued token')
})

test('a service account whose session ended signs in again and the request goes through', async (t) => {
  const valid = new Set()
  const account = serviceAccount(t)
  const gateway = await serveGateway(t, account, valid)
  const mcp = await serveMcp(t, valid)
  const client = await connectMcp(mcp.url, mcpAuth({ credential: { file: account.file, gatewayUrl: gateway.url } }))
  t.teardown(() => client.close())

  valid.delete(gateway.signIns[0])
  t.alike((await client.listTools()).map((tool) => tool.name), ['count_devices'], 'the call succeeds after the 401')
  // The SDK's background GET is refused alongside the POST: still one sign-in, not one per request.
  t.is(gateway.signIns.length, 2, 'one fresh sign-in replaced the revoked token')
  t.is(mcp.seen.filter(({ method }) => method === 'POST').at(-1).token, gateway.signIns[1])
})

test('a service account the Gateway refuses fails the connection with the Gateway\'s code', async (t) => {
  const account = serviceAccount(t)
  const other = generateCredential()
  // The Gateway knows a different key for this name: the assertion does not verify.
  const gateway = await serveGateway(t, { name: account.name, privateKeyPem: other.privateKeyPem }, new Set())
  const mcp = await serveMcp(t, new Set())
  await t.exception(connectMcp(mcp.url, mcpAuth({ credential: { file: account.file, gatewayUrl: gateway.url } })), /ERR_AUTH_UNAUTHORIZED/)
})

test('a Gateway that is not there is named in the error', async (t) => {
  const account = serviceAccount(t)
  const mcp = await serveMcp(t, new Set())
  await t.exception(connectMcp(mcp.url, mcpAuth({ credential: { file: account.file, gatewayUrl: 'http://127.0.0.1:1' } })), /could not sign in at http:\/\/127.0.0.1:1: fetch failed/)
})

test('createAgent signs in with mcp.credential and admits the tools', async (t) => {
  const valid = new Set()
  const account = serviceAccount(t)
  const gateway = await serveGateway(t, account, valid)
  const mcp = await serveMcp(t, valid)

  const agent = await createAgent({ provider: provider(), mcp: { url: mcp.url, credential: { file: account.file, gatewayUrl: gateway.url } } })
  t.teardown(() => agent.close())
  t.alike(agent.tools.map((tool) => tool.name), ['count_devices'])
})

test('mcpAuth: no token and no credential is no auth', (t) => {
  t.is(mcpAuth({ url: 'http://127.0.0.1:1/mcp' }), null)
  t.is(mcpAuth(), null)
})

test('mcpAuth refuses a malformed config without echoing secrets', (t) => {
  const account = serviceAccount(t)
  const gatewayUrl = 'http://127.0.0.1:3847'
  const refuses = (mcp, pattern, message) => t.exception(() => mcpAuth(mcp), pattern, message)

  refuses({ token: 'x', credential: { file: account.file, gatewayUrl } }, /mcp.token and mcp.credential are mutually exclusive/, 'both')
  refuses({ token: '' }, /mcp.token must be a non-empty string/, 'empty token')
  refuses({ token: 42 }, /mcp.token must be a non-empty string/, 'non-string token')
  refuses({ credential: null }, /mcp.credential.file must name/, 'null credential')
  refuses({ credential: { gatewayUrl } }, /mcp.credential.file must name/, 'no file')
  refuses({ credential: { file: account.file } }, /mcp.credential.gatewayUrl must be an http or https url/, 'no gateway')
  refuses({ credential: { file: account.file, gatewayUrl: 'ftp://gw' } }, /gatewayUrl must be an http or https url/, 'non-http gateway')
  refuses({ credential: { file: path.join(path.dirname(account.file), 'missing.json'), gatewayUrl } }, /unreadable \(ENOENT\)/, 'missing file')
  refuses({ credential: { file: credentialFile(t, { name: 'operator-agent' }), gatewayUrl } }, /holds no \{ name, privateKeyPem \}/, 'no key')
  refuses({ credential: { file: credentialFile(t, { name: 'operator-agent', privateKeyPem: 'not a pem' }), gatewayUrl } }, /holds no usable private key/, 'bad key')

  const secret = account.privateKeyPem.split('\n')[1]
  try {
    mcpAuth({ credential: { file: credentialFile(t, `${account.privateKeyPem}{`), gatewayUrl } })
    t.fail('a file that is not JSON was accepted')
  } catch (err) {
    t.ok(/is not JSON$/.test(err.message), 'names the failure')
    t.absent(err.message.includes(secret), 'and not the key the parser choked on')
  }
})

test('createAgent rejects a conflicting mcp config before it connects to anything', async (t) => {
  await t.exception(
    createAgent({ provider: provider(), mcp: { url: 'http://127.0.0.1:1/mcp', token: 't', credential: { file: 'x', gatewayUrl: 'http://127.0.0.1:1' } } }),
    /mutually exclusive/
  )
})
