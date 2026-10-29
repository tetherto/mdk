'use strict'

const test = require('brittle')
const { z } = require('zod')
const { generateToolsFromGatewayPlugin, missingPermissions } = require('../../lib/from-http-plugin')

function makePlugin (routes, manifest) {
  return { manifest: manifest || { description: 'fallback plugin description' }, routes }
}

test('generateToolsFromGatewayPlugin - sanitizes route id into a valid tool id', (t) => {
  const plugin = makePlugin([
    { id: 'GET /devices/:id', description: 'gets a device', http: {}, _handler: async () => ({}) }
  ])

  const [tool] = generateToolsFromGatewayPlugin(plugin)
  t.is(tool.id, 'GET_devices_id', 'should replace non-alphanumeric runs with underscores')
  t.pass()
})

test('generateToolsFromGatewayPlugin - uses route description, falling back to plugin description', (t) => {
  const plugin = makePlugin([
    { id: 'with-desc', description: 'route-level description', http: {}, _handler: async () => ({}) },
    { id: 'without-desc', http: {}, _handler: async () => ({}) }
  ])

  const [withDesc, withoutDesc] = generateToolsFromGatewayPlugin(plugin)
  t.is(withDesc.description, 'route-level description', 'should prefer the route description')
  t.is(withoutDesc.description, 'fallback plugin description', 'should fall back to the plugin description')
  t.pass()
})

test('generateToolsFromGatewayPlugin - maps safety to MCP annotations', (t) => {
  const plugin = makePlugin([
    { id: 'ro', description: 'x', http: {}, safety: 'read-only', _handler: async () => ({}) },
    { id: 'w', description: 'x', http: {}, safety: 'write', _handler: async () => ({}) },
    { id: 'none', description: 'x', http: {}, _handler: async () => ({}) }
  ])

  const [ro, w, none] = generateToolsFromGatewayPlugin(plugin)
  t.alike(ro.annotations, { readOnlyHint: true }, 'read-only safety should set readOnlyHint')
  t.alike(w.annotations, { readOnlyHint: false, destructiveHint: true }, 'write safety should set both hints')
  t.alike(none.annotations, { readOnlyHint: false }, 'unrecognized/missing safety should fail safe to readOnlyHint: false')
  t.pass()
})

// readOnlyHint is the field a caller reads to decide whether a tool needs approval before it
// runs. A write that states only destructiveHint arrives with that field absent, which reads as
// "not stated" rather than "it writes" — so the manifest's declaration is lost at the boundary.
test('generateToolsFromGatewayPlugin - a write is never left silent on readOnlyHint', (t) => {
  const plugin = makePlugin([
    { id: 'get.fresh.reading', description: 'repolls the device', http: {}, safety: 'write', _handler: async () => ({}) }
  ])

  const [tool] = generateToolsFromGatewayPlugin(plugin)
  t.is(tool.annotations.readOnlyHint, false, 'the write is stated as not read-only')
  t.not(tool.annotations.readOnlyHint, undefined, 'and never left for a name heuristic to guess')
  t.pass()
})

test('generateToolsFromGatewayPlugin - builds a zod shape from path, query and header parameters', (t) => {
  const plugin = makePlugin([{
    id: 'params',
    description: 'x',
    http: {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
        { name: 'x-api-key', in: 'header', required: true, schema: { type: 'string' }, description: 'api key' },
        { name: 'ignored', in: 'cookie', schema: { type: 'string' } }
      ]
    },
    _handler: async () => ({})
  }])

  const [tool] = generateToolsFromGatewayPlugin(plugin)
  const schema = z.object(tool.schema)

  t.ok(schema.shape.id, 'should include the required path param')
  t.ok(schema.shape.limit, 'should include the optional query param')
  t.ok(schema.shape['x-api-key'], 'should include the required header param')
  t.is(schema.shape.ignored, undefined, 'should ignore parameters in unsupported "in" locations')

  t.ok(schema.safeParse({ id: 'abc', 'x-api-key': 'k' }).success, 'required-only args should validate')
  t.ok(!schema.safeParse({ 'x-api-key': 'k' }).success, 'missing required path param should fail')
  t.ok(!schema.safeParse({ id: 'abc', limit: 0, 'x-api-key': 'k' }).success, 'limit below minimum should fail')
  t.ok(!schema.safeParse({ id: 'abc', limit: 101, 'x-api-key': 'k' }).success, 'limit above maximum should fail')
  t.pass()
})

test('generateToolsFromGatewayPlugin - merges requestBody JSON schema properties into the shape', (t) => {
  const plugin = makePlugin([{
    id: 'body',
    description: 'x',
    http: {
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string', description: 'the name' },
                active: { type: 'boolean' }
              }
            }
          }
        }
      }
    },
    _handler: async () => ({})
  }])

  const [tool] = generateToolsFromGatewayPlugin(plugin)
  const schema = z.object(tool.schema)

  t.ok(schema.safeParse({ name: 'a' }).success, 'required body field alone should validate')
  t.ok(!schema.safeParse({ active: true }).success, 'missing required body field should fail')
  t.ok(schema.safeParse({ name: 'a', active: true }).success, 'optional body field should be accepted')
  t.pass()
})

test('generateToolsFromGatewayPlugin - zod conversion covers enum, array and nested object schemas', (t) => {
  const plugin = makePlugin([{
    id: 'types',
    description: 'x',
    http: {
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status', 'tags', 'meta', 'untyped'],
              properties: {
                status: { type: 'string', enum: ['on', 'off'] },
                tags: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
                meta: {
                  type: 'object',
                  required: ['owner'],
                  properties: { owner: { type: 'string' } }
                },
                untyped: {}
              }
            }
          }
        }
      }
    },
    _handler: async () => ({})
  }])

  const [tool] = generateToolsFromGatewayPlugin(plugin)
  const schema = z.object(tool.schema)

  t.ok(schema.safeParse({ status: 'on', tags: ['a'], meta: { owner: 'me' }, untyped: 42 }).success, 'valid combination should pass')
  t.ok(!schema.safeParse({ status: 'sideways', tags: ['a'], meta: { owner: 'me' }, untyped: 1 }).success, 'value outside enum should fail')
  t.ok(!schema.safeParse({ status: 'on', tags: [], meta: { owner: 'me' }, untyped: 1 }).success, 'array below minItems should fail')
  t.ok(!schema.safeParse({ status: 'on', tags: ['a', 'b', 'c', 'd'], meta: { owner: 'me' }, untyped: 1 }).success, 'array above maxItems should fail')
  t.ok(!schema.safeParse({ status: 'on', tags: ['a'], meta: {}, untyped: 1 }).success, 'missing required nested field should fail')
  t.ok(schema.safeParse({ status: 'on', tags: ['a'], meta: { owner: 'me' }, untyped: 'anything goes' }).success, 'untyped property should accept any value')
  t.pass()
})

test('generateToolsFromGatewayPlugin - array items default to z.any() when unspecified', (t) => {
  const plugin = makePlugin([{
    id: 'loose-array',
    description: 'x',
    http: {
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['items'],
              properties: { items: { type: 'array' } }
            }
          }
        }
      }
    },
    _handler: async () => ({})
  }])

  const [tool] = generateToolsFromGatewayPlugin(plugin)
  const schema = z.object(tool.schema)

  t.ok(schema.safeParse({ items: [1, 'two', { three: true }] }).success, 'mixed-type array items should be accepted')
  t.pass()
})

test('generateToolsFromGatewayPlugin - handler reassembles flat args into params/query/headers/body, forwards them by route id and JSON-stringifies the result', async (t) => {
  let received = null
  let receivedId = null
  const plugin = makePlugin([{
    id: 'echo-route',
    description: 'x',
    http: {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'verbose', in: 'query', schema: { type: 'boolean' } },
        { name: 'x-trace', in: 'header', schema: { type: 'string' } }
      ],
      requestBody: {
        content: {
          'application/json': {
            schema: { type: 'object', properties: { note: { type: 'string' } } }
          }
        }
      }
    }
  }])

  const call = async (routeId, req) => {
    receivedId = routeId
    received = req
    return { ok: true }
  }
  const [tool] = generateToolsFromGatewayPlugin(plugin, { call })
  const result = await tool._handler({ id: 'abc', verbose: true, 'x-trace': 't1', note: 'hello' })

  t.is(receivedId, 'echo-route', 'the call should carry the route id, not the sanitized tool id')

  t.alike(received.params, { id: 'abc' }, 'path params should land in params')
  t.alike(received.query, { verbose: true }, 'query params should land in query')
  t.alike(received.headers, { 'x-trace': 't1' }, 'header params should land in headers')
  t.alike(received.body, { note: 'hello' }, 'remaining keys should land in body')

  t.is(result.content[0].type, 'text', 'result should be wrapped as text content')
  t.alike(JSON.parse(result.content[0].text), { ok: true }, 'result should be the JSON-stringified handler return value')
  t.pass()
})

test('generateToolsFromGatewayPlugin - handler defaults args to an empty object when called with none', async (t) => {
  let received = null
  const plugin = makePlugin([{ id: 'no-args-route', description: 'x', http: {} }])

  const [tool] = generateToolsFromGatewayPlugin(plugin, { call: async (routeId, req) => { received = req; return {} } })
  await tool._handler()

  t.alike(received.params, {}, 'params should default to empty')
  t.alike(received.query, {}, 'query should default to empty')
  t.alike(received.headers, {}, 'headers should default to empty')
  t.alike(received.body, {}, 'body should default to empty')
  t.pass()
})

test('generateToolsFromGatewayPlugin - integer becomes an int and strings get a default length cap', (t) => {
  const { DEFAULT_MAX_STRING_LENGTH } = require('../../lib/from-http-plugin')
  const plugin = makePlugin([{
    id: 'limits',
    description: 'x',
    http: {
      parameters: [
        { name: 'count', in: 'query', required: true, schema: { type: 'integer' } },
        { name: 'free', in: 'query', schema: { type: 'string' } },
        { name: 'short', in: 'query', schema: { type: 'string', minLength: 2, maxLength: 4 } }
      ]
    },
    _handler: async () => ({})
  }])

  const [tool] = generateToolsFromGatewayPlugin(plugin)
  const schema = z.object(tool.schema)

  t.ok(schema.safeParse({ count: 3 }).success, 'an integer should validate')
  t.ok(!schema.safeParse({ count: 1.5 }).success, 'a fraction should fail an integer schema')
  t.ok(!schema.safeParse({ count: 1, free: 'a'.repeat(DEFAULT_MAX_STRING_LENGTH + 1) }).success, 'an unbounded string should be capped')
  t.ok(!schema.safeParse({ count: 1, short: 'a' }).success, 'minLength should apply')
  t.ok(!schema.safeParse({ count: 1, short: 'abcde' }).success, 'maxLength should apply')
  t.ok(schema.safeParse({ count: 1, short: 'abc' }).success, 'a string within bounds should validate')
  t.pass()
})

test('generateToolsFromGatewayPlugin - skips stream routes', (t) => {
  const plugin = makePlugin([
    { id: 'plain', description: 'x', http: {}, _handler: async () => ({}) },
    { id: 'sse', description: 'x', http: {}, stream: true, _handler: async () => ({}) }
  ])

  const tools = generateToolsFromGatewayPlugin(plugin)
  t.alike(tools.map((tool) => tool.id), ['plain'], 'a stream route should produce no tool')
  t.pass()
})

test('generateToolsFromGatewayPlugin - an auth route refuses to run without an identity', async (t) => {
  let called = false
  const plugin = makePlugin([{ id: 'secret', description: 'x', http: {}, auth: true }])

  const [tool] = generateToolsFromGatewayPlugin(plugin, { call: async () => { called = true; return {} } })
  t.is(tool.auth, true, 'the tool should carry the route auth flag')
  await t.exception(() => tool._handler({}), /ERR_MCP_AUTH_REQUIRED/, 'should refuse with ERR_MCP_AUTH_REQUIRED')
  t.is(called, false, 'the call should not be forwarded with an empty identity')
  t.pass()
})

test('generateToolsFromGatewayPlugin - the configured identity is forwarded with the call', async (t) => {
  let received = null
  const identity = { user: { userId: 'mcp-agent' } }
  const plugin = makePlugin([{ id: 'secret', description: 'x', http: {}, auth: true }])

  const [tool] = generateToolsFromGatewayPlugin(plugin, { identity, call: async (routeId, req, id) => { received = id; return {} } })
  await tool._handler({})
  t.alike(received, identity, 'the call should carry the configured identity')
  t.pass()
})

test('generateToolsFromGatewayPlugin - an open route is forwarded with an empty identity when none is configured', async (t) => {
  let received = null
  const plugin = makePlugin([{ id: 'open', description: 'x', http: {} }])

  const [tool] = generateToolsFromGatewayPlugin(plugin, { call: async (routeId, req, id) => { received = id; return {} } })
  await tool._handler({})
  t.alike(received, {}, 'as the Gateway does for an unauthenticated route')
  t.pass()
})

test('generateToolsFromGatewayPlugin - an auth route refuses an identity whose perms do not cover its permissions', async (t) => {
  let called = false
  const identity = { user: { userId: 'mcp-agent' }, perms: ['read'] }
  const plugin = makePlugin([{ id: 'reboot', description: 'x', http: {}, auth: true, permissions: ['read', 'miner:w'] }])

  const [tool] = generateToolsFromGatewayPlugin(plugin, { identity, call: async () => { called = true; return {} } })
  t.alike(tool.permissions, ['read', 'miner:w'], 'the tool should carry the route permissions')
  await t.exception(() => tool._handler({}), /ERR_MCP_PERM_DENIED/, 'should refuse with ERR_MCP_PERM_DENIED')
  t.is(called, false, 'the call should not reach the app runtime')
  t.pass()
})

test('generateToolsFromGatewayPlugin - an auth route runs when the identity holds every permission', async (t) => {
  let called = false
  const identity = { user: { userId: 'mcp-agent' }, perms: ['read', 'miner:w'] }
  const plugin = makePlugin([{ id: 'reboot', description: 'x', http: {}, auth: true, permissions: ['miner:w'] }])

  const [tool] = generateToolsFromGatewayPlugin(plugin, { identity, call: async () => { called = true; return {} } })
  await tool._handler({})
  t.is(called, true, 'the call should be forwarded')
  t.pass()
})

test('missingPermissions - lists what the identity lacks, treating absent perms as none', (t) => {
  t.alike(missingPermissions(undefined, {}), [], 'no permissions required')
  t.alike(missingPermissions([], { perms: [] }), [], 'an empty list requires nothing')
  t.alike(missingPermissions(['a', 'b'], { perms: ['a'] }), ['b'])
  t.alike(missingPermissions(['a'], { user: { userId: 'x' } }), ['a'], 'an identity without perms holds none')
  t.alike(missingPermissions(['a'], { perms: 'a' }), ['a'], 'a non-array perms holds none')
  t.alike(missingPermissions(['a'], null), ['a'])
  t.pass()
})

test('generateToolsFromGatewayPlugin - with an authority, each call is checked as the Gateway checks the route', async (t) => {
  const seen = []
  const authority = {
    evaluate: (identity, req) => ({ allowed: identity.sub === 'ops' && req.resourceName === 'rack-3-1', reason: 'r', policyVersion: 'v' })
  }
  const decisions = []
  const plugin = {
    manifest: { description: 'd' },
    routes: [{ id: 'cmd', method: 'POST', path: '/miners/command', resourceName: { body: 'target' }, handler: 'x', schema: { body: { type: 'object', properties: { target: { type: 'string' } } } } }]
  }
  const [tool] = generateToolsFromGatewayPlugin(plugin, {
    authority,
    appName: 'ops-center',
    onDecision: (d) => decisions.push(d),
    call: async (id, req, identity) => { seen.push(identity); return { ok: true } }
  })
  t.alike(tool.access, { resource: 'ops-center/miners/command', verb: 'create', nameFrom: { from: 'body', field: 'target' } })

  await tool._handler({ target: 'rack-3-1' }, { identity: { kind: 'serviceaccount', sub: 'ops' } })
  t.alike(seen, [{ kind: 'serviceaccount', sub: 'ops' }], 'the caller identity, not a static one, reaches the app')
  await t.exception(tool._handler({ target: 'rack-9' }, { identity: { kind: 'serviceaccount', sub: 'ops' } }), /ERR_AUTH_FORBIDDEN: ops may not create ops-center\/miners\/command rack-9/)
  await t.exception(tool._handler({}, {}), /ERR_AUTH_UNAUTHORIZED/)
  t.alike(decisions.map((d) => d.decision), ['allow', 'deny'])
  t.is(decisions[1].resourceName, 'rack-9')
  t.exception(() => generateToolsFromGatewayPlugin(plugin, { authority, call: async () => {} }), /ERR_MCP_APP_NAME_REQUIRED/)
})
