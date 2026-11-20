import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

import { generate, buildGateway, buildApp, readConfig, outputPaths, SIGN_IN_STAGES } from '../docs/scripts/generate-api-reference.mjs'
import { shippedRouteTables } from '../docs/scripts/check-plugin-manifest.mjs'

const require = createRequire(import.meta.url)
const Ajv = require('ajv/dist/2020')
const { createAuthRoutes, AUTH_COMPONENTS } = require('../backend/core/gateway/workers/lib/auth-routes')
const { buildFastifyRoutes, errorResponse } = require('../backend/core/gateway/workers/lib/plugin-adapter')
const { resolveSecurityOptions } = require('../backend/core/gateway/workers/lib/security')
const { loadPlugin } = require('../backend/core/app-runtime/lib/plugin-loader')
const { routeTableToOpenApi } = require('../backend/core/app-runtime/lib/route-table-openapi')
const { resolvePluginDir } = require('../backend/core/app-runtime/lib/manifest')
const { SHARED_RESPONSES, sharedComponents } = require('../backend/core/gateway/workers/lib/shared-responses')

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// The official OpenAPI 3.1 schema (https://spec.openapis.org/oas/3.1/schema/2022-10-07),
// vendored. It leaves Schema Objects to the JSON Schema dialect through
// "$dynamicRef": "#meta", which ajv does not resolve across this schema, so that
// reference is pointed at the schema's own default (an object or a boolean), and
// each embedded JSON Schema is compiled by ajv on its own below instead.
const OAS = JSON.parse(fs.readFileSync(path.join(ROOT, 'test/fixtures/openapi/oas-3.1-schema-2022-10-07.json'), 'utf8')
  .replace(/"\$dynamicRef":\s*"#meta"/g, '"$ref": "#/$defs/schema"'))
const validateOpenApi = new Ajv({ strict: false, allErrors: true, validateFormats: false }).compile(OAS)

function embeddedSchemas (doc) {
  const out = []
  const media = (content) => Object.values(content || {}).forEach(m => m.schema && out.push(m.schema))
  for (const item of Object.values(doc.paths)) {
    for (const op of Object.values(item)) {
      for (const p of op.parameters || []) if (p.schema) out.push(p.schema)
      media(op.requestBody?.content)
      for (const r of Object.values(op.responses || {})) media(r.content)
    }
  }
  return out
}

// An embedded schema compiled with the document's components beside it, so a
// `#/components/schemas/...` reference resolves as it does in the document.
const withComponents = (doc, schema) => (doc.components ? { ...schema, components: doc.components } : schema)

function assertOpenApi (doc, label) {
  assert.ok(validateOpenApi(doc), `${label}: ${JSON.stringify(validateOpenApi.errors?.slice(0, 3))}`)
  const ajv = new Ajv({ strict: false, validateFormats: false })
  for (const schema of embeddedSchemas(doc)) assert.doesNotThrow(() => ajv.compile(withComponents(doc, schema)), label)
}

const openapiOutputs = (outputs) => Object.entries(outputs).filter(([f]) => f.endsWith('.json'))

// An operation's responses for the statuses the route declares, without the
// shared codes the generator appends to them.
function ownResponses (op, route) {
  const own = (response) => (response['x-mdk-errors'] ? { ...response, 'x-mdk-errors': response['x-mdk-errors'].filter(e => !e.stage) } : response)
  return Object.fromEntries(Object.keys(route.schema.responses).map(status => [status, own(op.responses[status])]))
}

test('every generated document is valid OpenAPI 3.1', () => {
  const outputs = generate()
  const docs = openapiOutputs(outputs)
  assert.ok(docs.length >= 2, 'the Gateway and at least one app')
  for (const [file, text] of docs) assertOpenApi(JSON.parse(text), file)
})

test('every in-repo route table converts to valid OpenAPI 3.1, every shape included', () => {
  for (const file of shippedRouteTables()) {
    const table = JSON.parse(fs.readFileSync(file, 'utf8'))
    const { document } = routeTableToOpenApi(table, { appName: 'fixture' })
    assertOpenApi(document, path.relative(ROOT, file))
  }
})

test('generation is deterministic', () => {
  assert.deepEqual(generate(), generate())
})

test('the committed outputs are current', () => {
  for (const [file, text] of Object.entries(generate())) {
    assert.equal(fs.readFileSync(path.join(ROOT, file), 'utf8'), text, `${file} is stale: run npm run generate:api-reference`)
  }
})

test('Gateway: one operation per route createAuthRoutes registers, read from the route objects, no handler run', () => {
  let ran = false
  const trap = new Proxy({}, { get: () => { ran = true; return () => {} } })
  const { document } = buildGateway()
  const routes = createAuthRoutes(trap)
  assert.equal(ran, false, 'building the routes touches no authority method')
  const ops = Object.entries(document.paths).flatMap(([p, item]) => Object.keys(item).map(m => `${m.toUpperCase()} ${p}`))
  assert.deepEqual(ops.sort(), routes.map(r => `${r.method} ${r.url}`).sort())
  for (const r of routes) {
    const op = document.paths[r.url][r.method.toLowerCase()]
    assert.equal(op.summary, r.schema.summary)
    assert.equal(op.description, r.schema.description)
    assert.deepEqual(op.requestBody?.content['application/json'].schema, r.schema.body)
    assert.deepEqual(ownResponses(op, r), r.schema.responses, 'responses are the route\'s own declaration, beside the shared ones')
    assert.deepEqual(op.security, r.schema.security, 'a declared security requirement is lifted as is')
    assert.deepEqual(op.parameters, r.schema.parameters, 'declared OpenAPI parameters (the refresh cookie) are lifted as is')
  }
  const { responses, ...components } = document.components
  assert.deepEqual(components, AUTH_COMPONENTS)
  assert.deepEqual(responses, sharedComponents(), 'the whole shared set')
})

test('Gateway: every operation declares its responses, so the page has no declaration gaps', () => {
  const { gaps, markdown } = buildGateway()
  assert.deepEqual(gaps, [])
  assert.equal(markdown.includes('## Declaration gaps'), false)
  assert.ok(markdown.includes('## Errors'))
})

// The published document against the Gateway's behaviour: each route, run with
// a stub issuer, answers bodies the document's schemas accept, for success and
// for every declared error code.
test('Gateway: the OpenAPI document describes what each route answers', async () => {
  const fastifyFactory = require('fastify')
  const { document } = buildGateway()
  const ajv = new Ajv({ strict: false, validateFormats: false })
  const ok = {
    login: async () => ({ tokenType: 'Bearer', accessToken: 'a', expiresIn: 600, refreshToken: 'r', refreshExpiresIn: 3600 }),
    token: async () => ({ tokenType: 'Bearer', accessToken: 'a', expiresIn: 600, refreshToken: 'r', refreshExpiresIn: 3600 }),
    refresh: async () => ({ tokenType: 'Bearer', accessToken: 'a', expiresIn: 600, refreshToken: 'r', refreshExpiresIn: 3600 }),
    logout: async () => ({ revoked: true }),
    verify: async () => ({ kind: 'user', sub: 'u', groups: ['ops'] })
  }
  const method = { '/auth/login': 'login', '/auth/token': 'token', '/auth/refresh': 'refresh', '/auth/logout': 'logout', '/auth/me': 'verify' }
  const request = {
    '/auth/login': [{ payload: { username: 'u', password: 'p' } }, { payload: { username: 'u', password: 'p', refreshIn: 'body' } }],
    '/auth/token': [{ payload: { assertion: 'a' } }],
    '/auth/refresh': [{ payload: { refreshToken: 'r' } }, { payload: {}, headers: { cookie: 'mdk_refresh=r' } }],
    '/auth/logout': [{ payload: { refreshToken: 'r' } }],
    '/auth/me': [{ headers: { authorization: 'Bearer t' } }]
  }
  // When each route sets the refresh cookie: its 200 must then declare Set-Cookie.
  const setsCookie = {
    '/auth/login': (req) => req.payload.refreshIn !== 'body',
    '/auth/refresh': (req) => !req.payload.refreshToken,
    '/auth/logout': () => true
  }
  async function answer (authority, url, httpMethod, req) {
    const fastify = fastifyFactory()
    for (const r of createAuthRoutes(authority)) fastify.route(r)
    fastify.setErrorHandler((err, rq, reply) => { const body = errorResponse(err); reply.status(body.statusCode).send(body) })
    await fastify.ready()
    const res = await fastify.inject({ method: httpMethod, url, ...req })
    await fastify.close()
    return res
  }
  for (const [url, item] of Object.entries(document.paths)) {
    for (const [httpMethod, op] of Object.entries(item)) {
      const check = (status, res, label) => {
        const schema = op.responses[status].content['application/json'].schema
        const validate = ajv.compile(withComponents(document, schema))
        assert.ok(validate(res.json()), `${label}: ${JSON.stringify(validate.errors)}`)
      }
      for (const req of request[url]) {
        const res = await answer(ok, url, httpMethod, req)
        assert.equal(res.statusCode, 200, `${httpMethod} ${url}`)
        check('200', res, `${httpMethod} ${url} 200`)
        const cookie = setsCookie[url]?.(req) ?? false
        assert.equal(Boolean(res.headers['set-cookie']), cookie, `${httpMethod} ${url} cookie`)
        if (cookie) assert.ok(op.responses['200'].headers?.['Set-Cookie'], `${httpMethod} ${url} declares the cookie it sets`)
      }
      for (const [status, response] of Object.entries(op.responses)) {
        for (const { code, stage } of response['x-mdk-errors'] || []) {
          if (code === 'ERR_AUTH_UNAUTHORIZED') continue // the Gateway's own refusal, covered by the Gateway's unit test
          if (stage) continue // a shared response, raised through its hook by the Gateway's unit test
          const err = code === 'ERR_AUTH_UNAVAILABLE' ? new Error('down') : Object.assign(new Error(`${code}: detail`), { code })
          const res = await answer({ ...ok, [method[url]]: async () => { throw err } }, url, httpMethod, request[url][0])
          assert.equal(res.statusCode, Number(status), `${httpMethod} ${url} ${code}`)
          check(status, res, `${httpMethod} ${url} ${code}`)
        }
      }
    }
  }
})

test('an app outside the monorepo generates on its own: no Gateway, no other apps', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'external-app-'))
  try {
    fs.mkdirSync(path.join(dir, 'plugin'))
    fs.writeFileSync(path.join(dir, 'plugin', 'mdk-plugin.json'), JSON.stringify({
      name: '@partner/mdk-app-ext',
      version: '1.2.3',
      routes: [{ id: 'ext.ping', handler: './ping.js', description: 'Answers pong.', http: { method: 'GET', path: '/ping', responses: { 200: { description: 'pong' } } } }]
    }))
    const { document, markdown } = buildApp({ name: 'ext', dir })
    assertOpenApi(document, 'external app')
    assert.deepEqual(document.servers, [{ url: '/apps/ext' }])
    assert.ok(markdown.includes('| `GET` | `/ping` | Answers pong |'))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('registration agreement: what the Gateway registers for each configured app is what the reference documents', () => {
  for (const app of readConfig().apps) {
    const dir = path.join(ROOT, app.dir)
    const routes = loadPlugin(resolvePluginDir(dir), undefined, { handlers: false }).routes
    const registered = buildFastifyRoutes({ name: app.name, mount: app.mount, routes }, {}, { conf: {} })
      .map(r => `${r.method} ${r.url}`)
    const { document } = buildApp(app)
    const prefix = document.servers[0].url === '/' ? '' : document.servers[0].url
    const documented = Object.entries(document.paths).flatMap(([p, item]) =>
      Object.keys(item).map(m => `${m.toUpperCase()} ${prefix && p === '/' ? prefix : prefix + p.replace(/\{([^{}]+)\}/g, ':$1')}`))
    assert.deepEqual(documented.sort(), registered.sort(), app.name)
  }
})

test('outputPaths: exactly the files generate writes, so the freshness check watches files, not folders', () => {
  const config = readConfig()
  assert.deepEqual(outputPaths(config).sort(), Object.keys(generate(config)).sort())
  assert.deepEqual(outputPaths({ apps: [{ name: 'x', dir: 'd' }] }), [], 'a target without out writes nothing')
})

// The responses the Gateway and the app runtime answer on every app route,
// declared once in the Gateway's workers/lib/shared-responses.js.
const SHARED_HEADING = '### Errors on every app route'
function sharedSection (markdown) {
  const start = markdown.indexOf(SHARED_HEADING)
  assert.ok(start >= 0, 'the page has the shared section')
  const rest = markdown.slice(start + SHARED_HEADING.length)
  const end = rest.search(/^#{2,3} /m)
  return end < 0 ? rest : rest.slice(0, end)
}
const sharedRows = (markdown) => sharedSection(markdown).split('\n').filter(l => l.startsWith('| ') && !l.startsWith('| Stage') && !l.startsWith('| ----'))
const expectedRows = SHARED_RESPONSES.flatMap(s => s.errors
  ? s.errors.map(e => `| ${s.stage} | \`${e.code}\` | \`${s.status}\` |`)
  : [`| ${s.stage} | Rule | ${s.status ? `\`${s.status}\`` : 'Varies'} |`])

test('every generated page lists the whole shared set once, rules included, in request order', () => {
  const pages = Object.entries(generate()).filter(([f]) => f.endsWith('http-api.md'))
  assert.ok(pages.length >= 2, 'the Gateway and at least one app')
  for (const [file, markdown] of pages) {
    const rows = sharedRows(markdown)
    assert.equal(rows.length, expectedRows.length, file)
    expectedRows.forEach((start, i) => assert.ok(rows[i].startsWith(start), `${file} row ${i + 1}: ${rows[i]}`))
  }
})

test('Gateway: the sign-in operations refer to the fixed codes of the stages they meet only; the route objects are unchanged', () => {
  const { document } = buildGateway()
  const applies = SHARED_RESPONSES.filter(s => SIGN_IN_STAGES.has(s.stage) && s.errors)
  assert.deepEqual([...new Set(applies.map(s => s.stage))], ['Host check', 'Rate limit'], 'the stages with fixed codes a sign-in route meets')
  const names = new Set(applies.map(s => s.name))
  const sharedCodes = new Set(applies.flatMap(s => s.errors.map(e => e.code)))
  for (const r of createAuthRoutes({})) {
    const op = document.paths[r.url][r.method.toLowerCase()]
    for (const s of applies) {
      const response = op.responses[s.status]
      if (r.schema.responses[s.status]) {
        assert.deepEqual(response['x-mdk-errors'].filter(e => e.stage).map(e => e.code), s.errors.map(e => e.code), `${r.url} ${s.status} gains ${s.stage}`)
      } else {
        assert.deepEqual(response, { $ref: `#/components/responses/${s.name}` }, `${r.url} ${s.status}`)
      }
    }
    for (const [status, response] of Object.entries(op.responses)) {
      if (response.$ref) assert.ok(names.has(response.$ref.split('/').pop()), `${r.url} ${status} refers to an entry that applies`)
      for (const e of response['x-mdk-errors'] || []) if (e.stage) assert.ok(sharedCodes.has(e.code), `${r.url} ${status} ${e.code}`)
    }
    assert.equal(Object.keys(r.schema.responses).includes('403'), false, `${r.url} declares no 403 of its own, so the route object is not where the Host check is added`)
  }
})

test('Gateway: the overview names the shared stages the sign-in operations meet, in request order, and restates no shared status', () => {
  const { markdown } = buildGateway()
  const overview = markdown.slice(markdown.indexOf('## Overview'), markdown.indexOf('## Operations')).replace(/\s+/g, ' ')
  for (const s of SHARED_RESPONSES.filter(e => e.errors)) for (const e of s.errors) assert.equal(overview.includes(e.code), false, `${e.code} is not restated`)
  for (const s of SHARED_RESPONSES.filter(e => e.rule && e.status)) assert.equal(overview.includes(`\`${s.status}\``), false, `${s.name}'s \`${s.status}\` is declared, not restated`)
  const stages = [...new Set(SHARED_RESPONSES.map(s => s.stage))].filter(s => SIGN_IN_STAGES.has(s))
  assert.equal(stages.length, SIGN_IN_STAGES.size, 'each is a declared stage')
  const at = stages.map(s => overview.indexOf(s))
  assert.ok(at.every(i => i >= 0), `the overview names ${stages.join(', ')}`)
  assert.deepEqual(at, [...at].sort((a, b) => a - b), 'in request order')
})

// The sign-in routes are registered on the Gateway's own Fastify instance, so
// Fastify reads their bodies under the Gateway's bodyLimit, as it does an app
// route's: SIGN_IN_STAGES names body parsing for that reason.
test('Gateway: a sign-in route that takes a body meets body parsing, with each declared status', async () => {
  assert.ok(SIGN_IN_STAGES.has('Body parsing'))
  const fastify = require('fastify')({ bodyLimit: resolveSecurityOptions({}, {}).bodyLimit })
  for (const r of createAuthRoutes({})) fastify.route(r)
  fastify.setErrorHandler((err, rq, reply) => { const body = errorResponse(err); reply.status(body.statusCode).send(body) })
  const failing = {
    415: { headers: { 'content-type': 'application/xml' }, payload: '<a/>' },
    413: { headers: { 'content-type': 'application/json' }, payload: '{}' + ' '.repeat(resolveSecurityOptions({}, {}).bodyLimit) },
    400: { headers: { 'content-type': 'application/json' }, payload: '{' }
  }
  const parsing = SHARED_RESPONSES.filter(s => s.stage === 'Body parsing')
  assert.deepEqual(parsing.map(s => String(s.status)).sort(), Object.keys(failing).sort())
  for (const r of createAuthRoutes({}).filter(r => r.method !== 'GET')) {
    for (const s of parsing) {
      const res = await fastify.inject({ method: r.method, url: r.url, ...failing[s.status] })
      assert.equal(res.statusCode, s.status, `${r.method} ${r.url} ${s.name}`)
    }
  }
  await fastify.close()
})

test('an app that declares a shared status keeps its codes and gains the shared ones, none repeated; any other is a $ref', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shared-app-'))
  try {
    fs.mkdirSync(path.join(dir, 'plugin'))
    const own = [
      { code: 'ERR_EXT_REFUSED', description: 'The Kernel refused the call.', fix: 'Ask for access.' },
      { code: 'ERR_AUTH_FORBIDDEN', description: 'The app names the Gateway refusal itself.' }
    ]
    fs.writeFileSync(path.join(dir, 'plugin', 'mdk-plugin.json'), JSON.stringify({
      name: '@partner/mdk-app-ext',
      version: '1.2.3',
      routes: [{ id: 'ext.ping', handler: './ping.js', description: 'Answers pong.', http: { method: 'GET', path: '/ping', responses: { 200: { description: 'pong' }, 403: { description: 'Refused.', 'x-mdk-errors': own } } } }]
    }))
    const { document, markdown } = buildApp({ name: 'ext', dir })
    assertOpenApi(document, 'shared app')
    const responses = document.paths['/ping'].get.responses
    const codes = responses[403]['x-mdk-errors'].map(e => e.code)
    const shared403 = SHARED_RESPONSES.filter(s => s.status === 403).flatMap(s => s.errors.map(e => e.code))
    assert.equal(responses[403].description, 'Refused.', 'the app\'s response is kept')
    assert.equal(new Set(codes).size, codes.length, 'no code repeated')
    assert.deepEqual(codes.slice(0, own.length), own.map(e => e.code), 'the app\'s codes first, as declared')
    assert.deepEqual(new Set(codes), new Set([...own.map(e => e.code), ...shared403]), 'and every shared code for the status')
    assert.equal(responses[403]['x-mdk-errors'][1].description, own[1].description, 'a code the app declares keeps its wording')
    for (const s of SHARED_RESPONSES.filter(e => e.errors && e.status !== 403)) {
      assert.deepEqual(responses[s.status], { $ref: `#/components/responses/${s.name}` }, `${s.status} is a $ref`)
    }
    assert.ok(markdown.includes('| `ERR_EXT_REFUSED` | `403` |'))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

// The codes the app runtime README listed by hand under "Errors an HTTP caller
// receives", before the shared set replaced that table.
const RETIRED_TABLE = [
  'ERR_APP_BAD_REQUEST', 'ERR_APP_ROUTE_IS_STREAM', 'ERR_APP_ROUTE_NOT_STREAM', 'ERR_APP_ROUTE_NOT_FOUND',
  'ERR_APP_PROTOCOL_VERSION', 'ERR_APP_RUNTIME_UNAVAILABLE', 'ERR_APP_RUNTIME_TIMEOUT', 'ERR_KERNEL_ACTION_FORBIDDEN'
]

test('the Gateway page\'s shared section carries every code the retired hand table listed', () => {
  const section = sharedSection(buildGateway().markdown)
  for (const code of RETIRED_TABLE) assert.ok(section.includes(`\`${code}\``), code)
  for (const status of ['502', '503']) assert.ok(section.includes(`| \`ERR_APP_RUNTIME_UNAVAILABLE\` | \`${status}\` |`), `ERR_APP_RUNTIME_UNAVAILABLE ${status}`)
})

test('an app that declares a range or default keeps it: the shared codes join it, no explicit status is added, and the document stays valid', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'range-app-'))
  try {
    fs.mkdirSync(path.join(dir, 'plugin'))
    const own = { description: 'Refused.', 'x-mdk-errors': [{ code: 'ERR_EXT_CONFLICT', description: 'The thing is busy.' }] }
    fs.writeFileSync(path.join(dir, 'plugin', 'mdk-plugin.json'), JSON.stringify({
      name: '@partner/mdk-app-ext',
      version: '1.2.3',
      routes: [{ id: 'ext.ping', handler: './ping.js', description: 'Answers pong.', http: { method: 'GET', path: '/ping', responses: { 200: { description: 'pong' }, '4XX': own, default: { description: 'Anything else.' } } } }]
    }))
    const { document, markdown } = buildApp({ name: 'ext', dir })
    assertOpenApi(document, 'range app')
    const responses = document.paths['/ping'].get.responses
    assert.deepEqual(Object.keys(responses).sort(), ['200', '4XX', 'default'])
    assert.equal(responses['4XX']['x-mdk-errors'][0].code, 'ERR_EXT_CONFLICT', 'the app\'s code stays first')
    const joined = [...responses['4XX']['x-mdk-errors'].slice(1), ...responses.default['x-mdk-errors']].map(e => `${e.status} ${e.code}`).sort()
    assert.deepEqual(joined, SHARED_RESPONSES.filter(s => s.errors).flatMap(s => s.errors.map(e => `${s.status} ${e.code}`)).sort(), 'every shared code, with its status')
    assert.equal(sharedRows(markdown).length, expectedRows.length, 'the page still lists the whole shared set')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
