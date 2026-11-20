'use strict'

const test = require('brittle')
const index = require('../..')
const { routeTableToOpenApi, fastifyRoutesToOpenApi, renderReference, NOT_DECLARED } = require('../../lib/route-table-openapi')
const { normalizeRoute } = require('../../lib/plugin-loader')

const table = (routes, over = {}) => ({ name: '@scope/mdk-app-demo', version: '0.2.0', routes, ...over })

// Everything after the generated header, which every rendered page opens with
// and which is the one place an em dash is allowed.
const pastHeader = (md) => md.slice(md.indexOf('-->') + 3)

const nested = {
  id: 'demo.miner-command',
  handler: 'h.js',
  description: 'Sends one command to a miner.',
  safety: 'write',
  errors: ['ERR_MDK_CLIENT_UNAVAILABLE'],
  constraints: ['Needs a Kernel.'],
  resourceName: { param: 'deviceId' },
  http: {
    method: 'POST',
    path: '/miners/{deviceId}/command',
    parameters: [{ in: 'path', name: 'deviceId', required: true, schema: { type: 'string' } }],
    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['command'] } } } },
    responses: { 200: { description: 'Accepted.' } }
  }
}

test('exports: the converter is part of the package API', (t) => {
  t.is(index.routeTableToOpenApi, routeTableToOpenApi)
  t.is(index.renderReference, renderReference)
})

test('normalizeRoute: the route as loadPlugin hands it to the Gateway', (t) => {
  const r = normalizeRoute({ id: 'a', handler: 'h.js', http: { method: 'get', path: '/a/{id}' } })
  t.is(r.method, 'GET')
  t.is(r.path, '/a/:id')
  const flat = normalizeRoute({ id: 'b', handler: 'h.js', method: 'post', path: '/b/:x' })
  t.is(flat.method, 'POST')
  t.is(flat.path, '/b/:x')
})

test('routeTableToOpenApi: a declared nested route converts without loss', (t) => {
  const { document, gaps } = routeTableToOpenApi(table([nested], { description: 'A demo app.' }), { appName: 'demo' })
  t.is(document.openapi, '3.1.0')
  t.alike(document.info, { title: '@scope/mdk-app-demo', version: '0.2.0', description: 'A demo app.' })
  t.alike(document.servers, [{ url: '/apps/demo' }])
  const op = document.paths['/miners/{deviceId}/command'].post
  t.is(op.operationId, 'demo.miner-command')
  t.is(op.description, 'Sends one command to a miner.')
  t.alike(op.parameters, nested.http.parameters)
  t.alike(op.requestBody, nested.http.requestBody)
  t.alike(op.responses, nested.http.responses)
  t.alike(op['x-mdk-access'], { resource: 'demo/miners/:deviceId/command', verb: 'create', nameFrom: { from: 'param', field: 'deviceId' } })
  t.is(op['x-mdk-safety'], 'write')
  t.alike(op['x-mdk-errors'], ['ERR_MDK_CLIENT_UNAVAILABLE'])
  t.alike(op['x-mdk-constraints'], ['Needs a Kernel.'])
  t.alike(gaps, [])
})

test('routeTableToOpenApi: the configured mount is the server; "/" serves at the Gateway root', (t) => {
  t.alike(routeTableToOpenApi(table([nested]), { appName: 'site', mount: '/' }).document.servers, [{ url: '/' }])
})

test('routeTableToOpenApi: Access is what routeAccess resolves for the normalized route, verb fallback included', (t) => {
  const { document } = routeTableToOpenApi(table([
    { id: 'a', handler: 'h.js', method: 'get', path: '/things/:id' },
    { id: 'b', handler: 'h.js', method: 'GET', path: '/list', verb: 'list' }
  ]), { appName: 'demo' })
  t.alike(document.paths['/things/{id}'].get['x-mdk-access'], { resource: 'demo/things/:id', verb: 'get' })
  t.alike(document.paths['/list'].get['x-mdk-access'], { resource: 'demo/list', verb: 'list' })
})

test('routeTableToOpenApi: every operation requires a bearer token, its RBAC requirement as the role name', (t) => {
  const { document } = routeTableToOpenApi(table([
    nested,
    { id: 'a', handler: 'h.js', method: 'get', path: '/things/:id' },
    { id: 'b', handler: 'h.js', method: 'GET', path: '/list', verb: 'list' }
  ]), { appName: 'demo' })
  t.is(document.components.securitySchemes.bearer.type, 'http')
  t.is(document.components.securitySchemes.bearer.scheme, 'bearer')
  t.alike(document.paths['/miners/{deviceId}/command'].post.security, [{ bearer: ['create demo/miners/:deviceId/command'] }])
  t.alike(document.paths['/things/{id}'].get.security, [{ bearer: ['get demo/things/:id'] }])
  t.alike(document.paths['/list'].get.security, [{ bearer: ['list demo/list'] }])
  const md = renderReference(document, [], { generatedBy: 'gen.mjs', source: 'mdk-plugin.json', openapiFile: 'openapi.json' })
  t.ok(md.includes('| `GET` | `/list` | Not declared | `list` on `demo/list` | Bearer token |'), 'Request shows the token')
})

test('routeTableToOpenApi: a flat route converts its path template and records every gap', (t) => {
  const { document, gaps } = routeTableToOpenApi(table([{ id: 'flat', handler: 'h.js', method: 'GET', path: '/named/:id' }]), { appName: 'demo' })
  const op = document.paths['/named/{id}'].get
  t.absent('description' in op, 'no invented description')
  t.absent('responses' in op, 'responses omitted, as OpenAPI 3.1 allows')
  t.alike(op.parameters, [{ in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: NOT_DECLARED }])
  t.alike(gaps.map(g => `${g.operation} ${g.field}`).sort(), ['flat description', 'flat parameters', 'flat responses'])
})

test('routeTableToOpenApi: a Fastify route schema is documented as the runtime enforces it', (t) => {
  const route = {
    id: 's',
    handler: 'h.js',
    description: 'Sets.',
    method: 'POST',
    path: '/set/:id',
    schema: {
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      querystring: { type: 'object', properties: { dry: { type: 'boolean' } } },
      body: { type: 'object', properties: { v: { type: 'number' } } }
    }
  }
  const op = routeTableToOpenApi(table([route]), { appName: 'demo' }).document.paths['/set/{id}'].post
  t.alike(op.parameters, [
    { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
    { in: 'query', name: 'dry', required: false, schema: { type: 'boolean' } }
  ])
  t.alike(op.requestBody, { required: true, content: { 'application/json': { schema: route.schema.body } } }, 'Fastify validates an absent body too')
  const optional = { ...route, id: 'o', path: '/opt/:id', schema: { ...route.schema, body: { anyOf: [route.schema.body, { type: 'null' }] } } }
  const opt = routeTableToOpenApi(table([optional]), { appName: 'demo' }).document.paths['/opt/{id}'].post
  t.alike(opt.requestBody, { required: false, content: { 'application/json': { schema: route.schema.body } } }, 'the loader\'s optional form reads back as optional')
})

test('routeTableToOpenApi: two routes on one path share the path item', (t) => {
  const { document } = routeTableToOpenApi(table([
    { id: 'r', handler: 'h.js', method: 'GET', path: '/x' },
    { id: 'w', handler: 'h.js', method: 'PUT', path: '/x' }
  ]), { appName: 'demo' })
  t.alike(Object.keys(document.paths['/x']), ['get', 'put'])
})

test('routeTableToOpenApi: appName is required, since Access depends on it', (t) => {
  t.exception(() => routeTableToOpenApi(table([nested]), {}), /appName/)
})

test('fastifyRoutesToOpenApi: method, URL, body schema and descriptive metadata, nothing invented', (t) => {
  const routes = [
    { method: 'POST', url: '/auth/login', schema: { summary: 'Sign in', description: 'Signs a user in.', tags: ['auth'], body: { type: 'object', required: ['username'] } }, handler: () => {} },
    { method: 'GET', url: '/auth/me', handler: () => {} }
  ]
  const { document, gaps } = fastifyRoutesToOpenApi(routes, { title: 'Gateway', version: '1.0.0', server: '/' })
  const login = document.paths['/auth/login'].post
  t.is(login.summary, 'Sign in')
  t.is(login.description, 'Signs a user in.')
  t.alike(login.tags, ['auth'])
  t.alike(login.requestBody, { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username'] } } } })
  t.absent('responses' in login)
  const me = document.paths['/auth/me'].get
  t.absent('description' in me)
  t.alike(gaps.map(g => `${g.operation} ${g.field}`).sort(), ['GET /auth/me description', 'GET /auth/me responses', 'POST /auth/login responses'])
})

test('renderReference: a generated-file header, one row per operation, "Not declared" for gaps', (t) => {
  const { document, gaps } = routeTableToOpenApi(table([nested, { id: 'flat', handler: 'h.js', method: 'GET', path: '/named/:id' }]), { appName: 'demo' })
  const md = renderReference(document, gaps, { generatedBy: 'gen.mjs', source: 'mdk-plugin.json', openapiFile: 'openapi.json' })
  t.ok(md.startsWith('<!-- GENERATED FILE — DO NOT EDIT.'), 'header')
  t.ok(md.includes('| `POST` | `/miners/{deviceId}/command` | Sends one command to a miner | `create` on `demo/miners/:deviceId/command`, instance from path parameter `deviceId` |'), 'a single-sentence cell takes no stop')
  t.ok(md.includes('| `GET` | `/named/{id}` | Not declared |'))
  t.ok(md.includes('## Declaration gaps'))
  t.ok(md.indexOf('## Overview') < md.indexOf('## Operations'), 'fixed sections in order')
  t.absent(md.split('\n').some(l => !l.startsWith('|') && !l.startsWith('<!--') && l.length > 150), 'prose wrapped')
  t.absent(pastHeader(md).includes('—'), 'no em dash outside the header')
  t.ok(md.includes('[`openapi.json`](openapi.json)'))
})

test('renderReference: deterministic', (t) => {
  const run = () => {
    const { document, gaps } = routeTableToOpenApi(table([nested]), { appName: 'demo' })
    return renderReference(document, gaps, { generatedBy: 'g', source: 's', openapiFile: 'o.json' })
  }
  t.is(run(), run())
})

test('renderReference: summary leads the purpose; accessFallback covers operations with no x-mdk-access', (t) => {
  const { document, gaps } = fastifyRoutesToOpenApi([
    { method: 'GET', url: '/auth/me', schema: { summary: 'Read the identity', description: 'Answers who the token is.' } }
  ], { title: 'Gateway', version: '1.0.0', server: '/' })
  const md = renderReference(document, gaps, { generatedBy: 'g', source: 's', openapiFile: 'o.json', accessFallback: 'Outside `spec.rbac`' })
  t.ok(md.includes('| `GET` | `/auth/me` | **Read the identity.** Answers who the token is. | Outside `spec.rbac` |'), md)
})

test('renderRouteTableFields: one row per schema field, with its tier and description', (t) => {
  const { renderRouteTableFields } = require('../../lib/route-table-openapi')
  const schema = require('../../mdk-plugin.schema.json')
  const md = renderRouteTableFields(schema, { generatedBy: 'g', source: 'mdk-plugin.schema.json' })
  t.ok(md.startsWith('<!-- GENERATED FILE — DO NOT EDIT.'))
  t.ok(md.includes('| `routes[].id` | string | Yes | Always |'), 'base-tier required field')
  t.ok(md.includes('## Fields'))
  t.absent(pastHeader(md).includes('—'), 'no em dash outside the header')
  t.ok(md.includes('| `routes[].description` | string | No | With `routeTableVersion` |'), 'strict-tier field')
  t.ok(md.includes('| `routes[].http.parameters[].in` | string: `path`, `query`, `header` | Yes | With `routeTableVersion` |'), 'enum and inherited tier')
  t.ok(md.includes('| `routes[].http.responses.<status>.description` |'), 'additionalProperties as a placeholder key')
  t.absent(md.includes('`$schema`'), 'annotation-only keys left out')
})

test('routeTableToOpenApi: the app manifest\'s identity titles the document when given', (t) => {
  const { document } = routeTableToOpenApi(table([nested], { description: 'Route table text.' }), {
    appName: 'demo',
    app: { displayName: 'Demo', description: 'What the app does.', version: '0.14.0' }
  })
  t.alike(document.info, { title: 'Demo', version: '0.14.0', description: 'What the app does.' })
})

const ERROR_BODY = { type: 'object', properties: { message: { type: 'string', description: 'The `ERR_*` code.' } } }
const declared = {
  method: 'POST',
  url: '/auth/x',
  schema: {
    description: 'Does x.',
    responses: {
      200: { description: 'Done.' },
      401: {
        description: 'Refused.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Err' } } },
        'x-mdk-errors': [{ code: 'ERR_X_REFUSED', description: 'The caller is unknown.', fix: 'Sign in first.' }]
      }
    }
  }
}

test('fastifyRoutesToOpenApi: lifts schema.responses and the given components; no responses gap', (t) => {
  const components = { schemas: { Err: ERROR_BODY } }
  const { document, gaps } = fastifyRoutesToOpenApi([declared], { title: 'G', version: '1.0.0', components })
  t.alike(document.paths['/auth/x'].post.responses, declared.schema.responses)
  t.alike(document.components, components)
  t.is(gaps.length, 0)
  const { document: bare, gaps: bareGaps } = fastifyRoutesToOpenApi([{ ...declared, schema: { description: 'Does x.' } }], { title: 'G', version: '1.0.0' })
  t.absent('responses' in bare.paths['/auth/x'].post)
  t.absent('components' in bare)
  t.alike(bareGaps.map(g => g.field), ['responses'])
})

test('renderReference: an Errors section from response-level and operation-level error codes', (t) => {
  const { document } = fastifyRoutesToOpenApi([
    declared,
    { method: 'GET', url: '/auth/y', schema: { description: 'Reads y.', responses: { 200: { description: 'Ok.' }, 401: { description: 'Refused.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Err' } } }, 'x-mdk-errors': [{ code: 'ERR_X_REFUSED', description: 'No token.' }] } } } }
  ], { title: 'G', version: '1.0.0', components: { schemas: { Err: ERROR_BODY } } })
  const md = renderReference(document, [], { generatedBy: 'test', source: 'routes', openapiFile: 'openapi.json' })
  t.ok(md.includes('## Errors'))
  t.ok(md.includes("An error response's body is `{ message }`:"), 'the body comes from the referenced schema')
  t.ok(md.includes('| Code | Status | Operations | Fires when | Fix |'), 'the error table has the style guide\'s columns')
  t.ok(md.includes('| `ERR_X_REFUSED` | `401` | `POST /auth/x`, `GET /auth/y` | `POST /auth/x`: The caller is unknown; `GET /auth/y`: No token | `POST /auth/x`: Sign in first; `GET /auth/y`: Not declared |'), 'differing reasons and fixes name their operation')

  const app = routeTableToOpenApi(table([nested]), { appName: 'demo', mount: '/' }).document
  const appMd = renderReference(app, [], { generatedBy: 'test', source: 'table', openapiFile: 'openapi.json' })
  t.ok(appMd.includes(`| \`ERR_MDK_CLIENT_UNAVAILABLE\` | ${NOT_DECLARED} |`), 'a route table code has no declared status')
  t.ok(appMd.includes(`| ${NOT_DECLARED} | ${NOT_DECLARED} |`), 'nor a declared reason or fix')

  const none = fastifyRoutesToOpenApi([{ method: 'GET', url: '/z', schema: { description: 'Z.' } }], { title: 'G', version: '1.0.0' }).document
  t.absent(renderReference(none, [], { generatedBy: 'test', source: 'r', openapiFile: 'o' }).includes('## Errors'), 'no codes, no section')
})

test('routeTableToOpenApi: a route table declares error statuses the way the Gateway does', (t) => {
  const route = {
    ...nested,
    http: {
      ...nested.http,
      responses: {
        200: { description: 'Sent.' },
        404: {
          description: 'Not found.',
          content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string', description: 'The `ERR_*` code.' } } } } },
          'x-mdk-errors': [{ code: 'ERR_DEVICE_NOT_FOUND', description: 'No such miner.' }]
        }
      }
    },
    errors: ['ERR_DEVICE_NOT_FOUND']
  }
  const { document } = routeTableToOpenApi(table([route]), { appName: 'demo', mount: '/' })
  const md = renderReference(document, [], { generatedBy: 'test', source: 'table', openapiFile: 'openapi.json' })
  t.ok(md.includes('| `ERR_DEVICE_NOT_FOUND` | `404` |'), 'the response-level status is shown')
  t.absent(md.includes(`| \`ERR_DEVICE_NOT_FOUND\` | ${NOT_DECLARED} |`), 'the bare code in errors adds no undeclared row beside it')
})

test('fastifyRoutesToOpenApi: lifts OpenAPI security and parameters; Request shows a bearer token and a cookie', (t) => {
  const components = { securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } } }
  const cookie = { in: 'cookie', name: 'sid', required: false, schema: { type: 'string' } }
  const { document } = fastifyRoutesToOpenApi([
    { method: 'GET', url: '/me', schema: { description: 'Me.', security: [{ bearer: [] }] } },
    { method: 'POST', url: '/out', schema: { description: 'Out.', parameters: [cookie], body: { type: 'object' } } }
  ], { title: 'G', version: '1.0.0', components })
  t.alike(document.paths['/me'].get.security, [{ bearer: [] }])
  t.alike(document.paths['/out'].post.parameters, [cookie])
  const md = renderReference(document, [], { generatedBy: 'test', source: 'routes', openapiFile: 'openapi.json' })
  t.ok(md.includes('| Bearer token |'), 'the bearer scheme reads as Bearer token')
  t.ok(md.includes('| `sid` (cookie), JSON body (required) |'), 'the cookie sits beside the body')
})

// The shared responses are the Gateway's to declare (its workers/lib/shared-responses.js). The converter adds none,
// and the reference lists whatever component responses carry an x-mdk-stage.
test('routeTableToOpenApi: declares nothing the route table does not', (t) => {
  const { document } = routeTableToOpenApi(table([nested]), { appName: 'demo' })
  t.alike(Object.keys(document.components), ['securitySchemes'])
  t.is(document.paths['/miners/{deviceId}/command'].post.responses, nested.http.responses)
})

test('renderReference: component responses with a stage are listed once, in order, apart from the app\'s own codes', (t) => {
  const { document, gaps } = routeTableToOpenApi(table([nested]), { appName: 'demo' })
  const content = { 'application/json': { schema: { $ref: '#/components/schemas/Body' } } }
  document.components.schemas = { Body: { type: 'object', properties: { message: { type: 'string', description: 'The code.' } } } }
  document.components.responses = {
    Early: { description: 'Refused early.', content, 'x-mdk-stage': 'First stage', 'x-mdk-status': 401, 'x-mdk-errors': [{ code: 'ERR_X_EARLY', description: 'No token.', fix: 'Sign in.', stage: 'First stage' }] },
    Open: { description: 'Whatever the controller throws.', content, 'x-mdk-stage': 'Last stage', 'x-mdk-fix': 'Read the code.' }
  }
  const op = document.paths['/miners/{deviceId}/command'].post
  op.responses = { ...op.responses, 401: { $ref: '#/components/responses/Early' }, 409: { description: 'Busy.', 'x-mdk-errors': [{ code: 'ERR_DEMO_BUSY', description: 'The miner is busy.' }] } }
  const md = renderReference(document, gaps, { generatedBy: 'g', source: 's', openapiFile: 'openapi.json' })
  const shared = md.indexOf('### Errors on every app route')
  const own = md.indexOf('### Errors the operations declare')
  t.ok(shared > md.indexOf('## Errors') && own > shared, 'the staged responses lead, the app\'s own codes follow')
  const rows = md.slice(shared, own).split('\n').filter(l => l.startsWith('| ') && !l.startsWith('| Stage') && !l.startsWith('| ----'))
  t.alike(rows, [
    '| First stage | `ERR_X_EARLY` | `401` | No token | Sign in |',
    '| Last stage | Rule | Varies | Whatever the controller throws | Read the code |'
  ])
  t.is(md.split('`ERR_X_EARLY`').length - 1, 1, 'a staged code is not repeated in the app\'s table')
  t.ok(md.indexOf('`ERR_DEMO_BUSY` | `409`') > own, 'the app\'s own code keeps its table')
  t.ok(md.includes('| `200`, `401`, `409` |'), 'the Responses cell names a referred status')
  t.ok(md.includes("An error response's body is `{ message }`:"), 'the body comes from the staged response')
})

// Split a rendered row the way GFM does, so the assertions below are about
// the columns a reader ends up with and not just the bytes: a backslash takes
// the character after it out of play, so `\|` stays inside the cell while `\\`
// spends itself and leaves the next pipe working as a delimiter.
function gfmCells (row) {
  const cells = ['']
  for (let i = 0; i < row.length; i++) {
    if (row[i] === '\\') { cells[cells.length - 1] += row.slice(i, i + 2); i++; continue }
    if (row[i] === '|') { cells.push(''); continue }
    cells[cells.length - 1] += row[i]
  }
  return cells
}

// A cell escapes the backslash before the pipe, so neither can free the column
// delimiter however they are combined in a description. The backslash doubling
// reaches inside code spans as well, which is a known cost of escaping the
// whole cell at once rather than per span.
test('renderReference: no arrangement of backslashes and pipes can break a row', (t) => {
  const descriptions = {
    a: 'Matches `\\d+` or a | pipe.',
    b: 'Quotes /\\\\d+/ and a \\| pipe',
    c: 'Spans `a\\|b` and `x\\\\|y` here',
    d: 'Ends on a backslash \\'
  }
  const { document, gaps } = fastifyRoutesToOpenApi(
    Object.entries(descriptions).map(([id, description]) => ({ method: 'GET', url: `/${id}`, schema: { description } })),
    { title: 'Gateway', version: '1.0.0', server: '/' }
  )
  const md = renderReference(document, gaps, { generatedBy: 'g', source: 's', openapiFile: 'o.json' })
  const row = (path) => md.split('\n').find(l => l.startsWith(`| \`GET\` | \`${path}\``))

  const columns = gfmCells(md.split('\n').find(l => l.startsWith('| Method'))).length
  for (const id of Object.keys(descriptions)) {
    t.is(gfmCells(row(`/${id}`)).length, columns, `/${id} keeps the column count of the header`)
  }
  t.ok(row('/c').includes('`a\\\\\\|b`'), 'a backslash in front of a pipe is doubled, so it cannot consume the escape')
  t.ok(row('/a').includes('`\\\\d+`'), 'a code span is doubled too, the accepted cost of escaping the cell as a whole')
})
