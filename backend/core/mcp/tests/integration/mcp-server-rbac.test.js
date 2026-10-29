'use strict'

// spec.rbac at the MCP server: an agent signs in with its own service account,
// sees and calls only the tools its roles allow, and its identity reaches the
// app runtime, against real app runtimes over a local HyperDHT testnet.

const test = require('brittle')
const path = require('path')
const createTestnet = require('hyperdht/testnet')
const { Client } = require('@modelcontextprotocol/sdk/client/index.js')
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js')
const { createAppRuntime } = require('@tetherto/mdk-app-runtime')
const { createTestAuth, mintToken } = require('@tetherto/mdk-kernel/testing')
const { generateCredential } = require('@tetherto/mdk-identity')
const { localAuthority } = require('@tetherto/mdk-gateway/workers/lib/authority')
const { createMcpServer } = require('../../server')

const FIXTURES = path.join(path.dirname(require.resolve('@tetherto/mdk-app-runtime/package.json')), 'tests', 'fixtures')
const ECHO_APP = path.join(FIXTURES, 'echo-app')
const { tmpDir, capturingLogger } = require(path.join(FIXTURES, 'helpers'))

const POLICY = {
  roles: [
    { name: 'operator', rules: [{ resources: ['echo/whoami', 'echo/whoami-auth'], verbs: ['get'] }, { resources: ['echo/echo'], verbs: ['create'] }] },
    { name: 'reader', rules: [{ resources: ['echo/whoami'], verbs: ['get'] }] }
  ],
  bindings: [
    { role: 'operator', subjects: [{ kind: 'ServiceAccount', name: 'operator-agent' }] },
    { role: 'reader', subjects: [{ kind: 'ServiceAccount', name: 'reader-agent' }] }
  ]
}

async function connect (t, port, token) {
  const client = new Client({ name: 'agent', version: '1.0.0' })
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`), token ? { requestInit: { headers: { authorization: `Bearer ${token}` } } } : {})
  await client.connect(transport)
  t.teardown(() => client.close())
  return client
}

const unwrap = (text) => JSON.parse(/^<untrusted-tool-output tool="[^"]*">\n([\s\S]*)\n<\/untrusted-tool-output>\n/.exec(text)[1])

test('createMcpServer - agents are checked against spec.rbac, each with its own identity', { timeout: 120000 }, async (t) => {
  const testnet = await createTestnet(3, t.teardown)
  const dir = tmpDir(t)
  const appKeyFile = path.join(dir, 'run', 'echo.key')
  const mcpKeyFile = path.join(dir, 'run', 'mcp.key')

  const auth = await createTestAuth({ policy: POLICY, name: 'operator-agent' })
  t.teardown(() => auth.close())
  const reader = generateCredential()
  await auth.identity.upsertServiceAccount({ name: 'reader-agent', publicKey: reader.publicKey })
  const operatorToken = await auth.token()
  const readerToken = await mintToken(auth.identity, { name: 'reader-agent', privateKey: reader.privateKeyPem })

  const decisions = []
  const port = 41890
  const server = await createMcpServer(path.join(dir, 'mcp'), port, { kernelBootstrap: testnet.bootstrap }, [],
    [{ name: 'echo', appDir: ECHO_APP, keyFile: appKeyFile }],
    { allowWrite: true, keyFile: mcpKeyFile, authority: localAuthority(auth), onDecision: (d) => decisions.push(d) })
  t.teardown(() => new Promise((resolve) => server.close(resolve)))
  const runtime = createAppRuntime({ name: 'echo', appDir: ECHO_APP, bootstrap: testnet.bootstrap, keyFile: appKeyFile, allowedKeyFiles: [mcpKeyFile], logger: capturingLogger() })
  await runtime.start()
  t.teardown(() => runtime.stop())

  // No token, or a bad one: no MCP session at all.
  const status = (p) => p.then(() => null, (err) => err.code)
  t.is(await status(connect(t, port)), 401)
  t.is(await status(connect(t, port, 'x.y.z')), 401)
  t.alike(decisions.slice(0, 2).map((d) => [d.decision, d.reason]), [['unauthenticated', 'no-token'], ['unauthenticated', 'ERR_IDENTITY_TOKEN_MALFORMED']])

  // Each agent lists only what its roles allow.
  const operator = await connect(t, port, operatorToken)
  const names = (await operator.listTools()).tools.map((tool) => tool.name).sort()
  t.alike(names, ['echo', 'whoami', 'whoami_auth'])
  const readerClient = await connect(t, port, readerToken)
  t.alike((await readerClient.listTools()).tools.map((tool) => tool.name), ['whoami'])

  // The agent's own identity reaches the app runtime; no static identity anywhere.
  const who = await operator.callTool({ name: 'whoami', arguments: {} })
  t.alike(unwrap(who.content[0].text), { info: { kind: 'serviceaccount', sub: 'operator-agent' } })
  const echoed = await operator.callTool({ name: 'echo', arguments: {} })
  t.alike(unwrap(echoed.content[0].text), { params: {}, query: {}, body: {}, headers: {} })
  t.ok(decisions.some((d) => d.sub === 'operator-agent' && d.tool === 'echo' && d.decision === 'allow' && d.resource === 'echo/echo' && d.verb === 'create'))

  // An agent no rule covers sees an empty list, not an error.
  const nobody = generateCredential()
  await auth.identity.upsertServiceAccount({ name: 'nobody-agent', publicKey: nobody.publicKey })
  const nobodyClient = await connect(t, port, await mintToken(auth.identity, { name: 'nobody-agent', privateKey: nobody.privateKeyPem }))
  t.alike((await nobodyClient.listTools()).tools, [])

  // A tool the agent was not shown is not there to call.
  const hidden = await readerClient.callTool({ name: 'echo', arguments: {} }).catch((e) => ({ isError: true, content: [{ text: e.message }] }))
  t.ok(hidden.isError, 'the reader cannot call echo')
})

test('createMcpServer - a static token or identity is refused once spec.rbac applies', async (t) => {
  const auth = await createTestAuth({ policy: POLICY })
  t.teardown(() => auth.close())
  for (const extra of [{ token: 'secret' }, { identity: { user: { userId: 'x' } } }]) {
    await t.exception(createMcpServer(tmpDir(t), 41891, {}, [], [], { authority: localAuthority(auth), ...extra }), /ERR_MCP_STATIC_IDENTITY_UNSUPPORTED/)
  }
})
