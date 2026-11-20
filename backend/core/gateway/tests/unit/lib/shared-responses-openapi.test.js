'use strict'

const test = require('brittle')
const { routeTableToOpenApi, renderReference } = require('@tetherto/mdk-app-runtime')
const {
  SHARED_RESPONSES,
  GATEWAY_ERROR_SCHEMA,
  addSharedResponses,
  withSharedResponses,
  sharedComponents
} = require('../../../workers/lib/shared-responses')

// The declaration itself, and what addSharedResponses makes of an app's
// document: the document routeTableToOpenApi builds from a route table, as
// the reference generator builds it.

const nested = {
  id: 'demo.miner-command',
  handler: 'h.js',
  description: 'Sends one command to a miner.',
  http: {
    method: 'POST',
    path: '/miners/{deviceId}/command',
    parameters: [{ in: 'path', name: 'deviceId', required: true, schema: { type: 'string' } }],
    responses: { 200: { description: 'Accepted.' } }
  }
}
const table = (routes) => ({ name: '@scope/mdk-app-demo', version: '0.2.0', routes })
function appDocument (routes) {
  const built = routeTableToOpenApi(table(routes), { appName: 'demo' })
  addSharedResponses(built.document)
  return built
}

const FIXED = SHARED_RESPONSES.filter(s => s.errors)
const RULES = SHARED_RESPONSES.filter(s => s.rule)
const own403 = { description: 'The app may not make this call.', 'x-mdk-errors': [{ code: 'ERR_KERNEL_ACTION_FORBIDDEN', description: 'No rule grants the app the call.' }] }
const withOwn = (responses) => ({ ...nested, http: { ...nested.http, responses: { 200: { description: 'Accepted.' }, ...responses } } })
const commandOp = (document) => document.paths['/miners/{deviceId}/command'].post
const codes = (response) => response['x-mdk-errors'].map(e => e.code)

test('shared responses: the declaration is frozen', (t) => {
  t.ok(Object.isFrozen(SHARED_RESPONSES))
  t.ok(SHARED_RESPONSES.every(s => Object.isFrozen(s)), 'each entry is frozen too')
})

test('shared responses: the fixed set, each code with the status it arrives with', (t) => {
  const declared = FIXED.flatMap(s => s.errors.map(e => `${s.status} ${e.code}`))
  t.alike(declared.slice().sort(), [
    '400 ERR_APP_BAD_REQUEST',
    '400 ERR_APP_ROUTE_IS_STREAM',
    '400 ERR_APP_ROUTE_NOT_STREAM',
    '401 ERR_AUTH_UNAUTHORIZED',
    '403 ERR_AUTH_FORBIDDEN',
    '403 ERR_GATEWAY_HOST_NOT_ALLOWED',
    '404 ERR_APP_ROUTE_NOT_FOUND',
    '429 ERR_RATE_LIMITED',
    '502 ERR_APP_PROTOCOL_VERSION',
    '502 ERR_APP_RUNTIME_UNAVAILABLE',
    '503 ERR_APP_RUNTIME_UNAVAILABLE',
    '504 ERR_APP_RUNTIME_TIMEOUT'
  ])
  for (const s of FIXED) {
    t.ok(Number.isInteger(s.status) && s.description, `${s.name} has a status and a description`)
    for (const e of s.errors) t.ok(e.description && e.fix, `${s.status} ${e.code} has a reason and a fix`)
  }
  t.is(new Set(SHARED_RESPONSES.map(s => s.name)).size, SHARED_RESPONSES.length, 'one name per entry')
})

test('shared responses: the stages in the order a request meets them', (t) => {
  const stages = SHARED_RESPONSES.map(s => s.stage)
  const at = (stage) => stages.indexOf(stage)
  const last = (stage) => stages.lastIndexOf(stage)
  t.is(at('Host check'), 0, 'the Host check comes first')
  // Authentication and the rate limit both run between the Host check and
  // authorization. shared-responses.test.js checks their order against the hooks.
  for (const stage of ['Authentication', 'Rate limit']) t.ok(at(stage) > at('Host check') && at(stage) < at('Authorization'), stage)
  // Fastify reads a body after the route's onRequest and preParsing hooks and
  // before its preValidation hook, so after the rate limit and a custom verifier
  // and before authorization. shared-responses.test.js checks it against Fastify.
  t.ok(at('Custom verifier') > at('Rate limit') && at('Custom verifier') < at('Body parsing'), 'a custom verifier runs after the rate limit, before the body is read')
  t.ok(at('Body parsing') > at('Rate limit') && last('Body parsing') < at('Authorization'), 'the body is read before authorization')
  t.ok(at('Body validation') > at('Authorization'), 'the body is validated after authorization')
  t.ok(at('Forwarding') > last('Body validation'), 'then the request is forwarded')
  t.ok(at('Controller') > last('Forwarding'), 'then the controller runs')
  t.is(last('Controller'), stages.length - 1, 'the controller comes last')
  for (const stage of new Set(stages)) t.is(stages.slice(at(stage), last(stage) + 1).every(s => s === stage), true, `${stage} is listed in one run`)
})

test('shared responses: a rule names the package that owns it, in words, with no link', (t) => {
  t.alike(RULES.map(s => s.stage), ['Custom verifier', 'Body parsing', 'Body parsing', 'Body parsing', 'Body validation', 'Controller', 'Controller'])
  for (const s of RULES) t.ok(s.rule && s.fix, `${s.name} has a rule and a fix`)
  const kernel = RULES.find(s => s.name === 'KernelClientError')
  t.ok(kernel.rule.includes('`@tetherto/mdk-client`') && kernel.rule.includes('`@tetherto/mdk-kernel`'), 'the relayed codes name their packages')
  t.ok(RULES.find(s => s.stage === 'Custom verifier').rule.includes('`@tetherto/mdk-gateway`'), 'the verifier hook names its package')
  for (const s of SHARED_RESPONSES) t.absent(/\]\(|https?:/.test(JSON.stringify(s)), `${s.name} carries no link`)
})

test('addSharedResponses: the shared responses and the error body are in components, in request order', (t) => {
  const { document } = appDocument([nested])
  t.alike(document.components.schemas, { GatewayError: GATEWAY_ERROR_SCHEMA })
  t.alike(Object.keys(document.components.responses), SHARED_RESPONSES.map(s => s.name))
  for (const s of SHARED_RESPONSES) {
    const r = document.components.responses[s.name]
    t.is(r['x-mdk-stage'], s.stage)
    t.is(r['x-mdk-status'], s.status)
    t.alike(r.content['application/json'].schema, { $ref: '#/components/schemas/GatewayError' })
    if (s.errors) t.alike(r['x-mdk-errors'], s.errors.map(e => ({ ...e, stage: s.stage })), `${s.name} lists its codes`)
    else t.alike([r.description, r['x-mdk-fix'], r['x-mdk-errors']], [s.rule, s.fix, undefined], `${s.name} states its rule`)
  }
})

test('addSharedResponses: a status the app does not declare refers to the shared response', (t) => {
  const { document } = appDocument([nested])
  const responses = commandOp(document).responses
  t.alike(responses[200], nested.http.responses[200], 'the app\'s own response is untouched')
  t.alike(Object.keys(responses), ['200', ...new Set(FIXED.map(s => String(s.status)).sort())], 'every fixed status, and no rule')
  for (const s of FIXED) {
    if (FIXED.filter(x => x.status === s.status).length > 1) continue
    t.alike(responses[s.status], { $ref: `#/components/responses/${s.name}` }, `${s.status} is a $ref`)
  }
  // Two stages answer 403 and OpenAPI allows one response per status, so one response holds both, in request order.
  const forbidden = FIXED.filter(s => s.status === 403)
  t.is(forbidden.length, 2)
  t.alike(codes(responses[403]), forbidden.flatMap(s => s.errors.map(e => e.code)))
  t.alike(responses[403].content['application/json'].schema, { $ref: '#/components/schemas/GatewayError' })
})

test('addSharedResponses: a status the app declares keeps its response and gains the shared codes', (t) => {
  const route = withOwn({ 403: own403 })
  const before = structuredClone(route)
  const { document } = appDocument([route])
  const r = commandOp(document).responses[403]
  t.is(r.description, own403.description)
  t.alike(codes(r), ['ERR_KERNEL_ACTION_FORBIDDEN', 'ERR_GATEWAY_HOST_NOT_ALLOWED', 'ERR_AUTH_FORBIDDEN'], 'the app\'s code first, then the shared ones in request order')
  t.absent(r.$ref)
  t.alike(route, before, 'the route table is not mutated')
})

test('addSharedResponses: a code the app declares itself is not repeated', (t) => {
  const route = withOwn({ 403: { description: 'x', 'x-mdk-errors': [{ code: 'ERR_AUTH_FORBIDDEN', description: 'The app\'s own wording.' }] } })
  const { document } = appDocument([route])
  const r = commandOp(document).responses[403]
  t.alike(codes(r), ['ERR_AUTH_FORBIDDEN', 'ERR_GATEWAY_HOST_NOT_ALLOWED'])
  t.is(r['x-mdk-errors'][0].description, 'The app\'s own wording.')
})

test('renderReference: the shared responses are listed once, in request order, with the stage, apart from the app\'s own codes', (t) => {
  const a = withOwn({ 403: own403 })
  const b = { id: 'demo.other', handler: 'h.js', description: 'Reads.', http: { method: 'GET', path: '/other', responses: { 200: { description: 'Ok.' } } } }
  const { document, gaps } = appDocument([a, b])
  const md = renderReference(document, gaps, { generatedBy: 'g', source: 's', openapiFile: 'openapi.json' })
  const shared = md.indexOf('### Errors on every app route')
  const own = md.indexOf('### Errors the operations declare')
  t.ok(shared > md.indexOf('## Errors') && own > shared, 'the shared responses lead, the app\'s own codes follow')
  t.ok(md.includes('| Stage | Code | Status | Fires when | Fix |'))
  const rows = md.slice(shared, own).split('\n').filter(l => l.startsWith('| ') && !l.startsWith('| Stage') && !l.startsWith('| ----'))
  const expected = SHARED_RESPONSES.flatMap(s => s.errors
    ? s.errors.map(e => `| ${s.stage} | \`${e.code}\` | \`${s.status}\` |`)
    : [`| ${s.stage} | Rule | ${s.status ? `\`${s.status}\`` : 'Varies'} |`])
  t.is(rows.length, expected.length, 'one row per shared code and per rule')
  expected.forEach((start, i) => t.ok(rows[i].startsWith(start), `row ${i + 1}: ${start}`))
  for (const s of FIXED) for (const e of s.errors) t.is(md.split(`| \`${e.code}\` | \`${s.status}\` |`).length - 1, 1, `${s.status} ${e.code} is not repeated in the app's table`)
  t.ok(md.indexOf('`ERR_KERNEL_ACTION_FORBIDDEN` | `403`') > own, 'the app\'s own code keeps its table')
  t.ok(md.includes('| `200`, `400`, `401`, `403`, `404`, `429`, `502`, `503`, `504` |'), 'the Responses cell names every status')
  t.ok(md.includes("An error response's body is `{ statusCode, error, message }`:"), 'the body comes from GatewayError')
  t.absent(md.split('\n').some(l => !l.startsWith('|') && !l.startsWith('<!--') && l.length > 150), 'prose wrapped')
})

// OpenAPI lets an operation declare a range (4XX) or default, and an explicit
// status takes precedence over either. Adding an explicit shared status beside
// one would take that status away from the app's own response.
const pairs = (items) => items.map(e => `${e.status} ${e.code}`).sort()
const sharedPairs = (keep) => FIXED.filter(s => keep(s.status)).flatMap(s => s.errors.map(e => `${s.status} ${e.code}`)).sort()
const range4 = { description: 'The app refused the request.', 'x-mdk-errors': [{ code: 'ERR_DEMO_CONFLICT', description: 'The miner is busy.' }] }

test('shared responses: a range the app declares keeps its statuses and gains the shared codes, each with its status', (t) => {
  const { document } = appDocument([withOwn({ '4XX': range4 })])
  const responses = document.paths['/miners/{deviceId}/command'].post.responses
  t.alike(Object.keys(responses).filter(s => /^4\d\d$/.test(s)), [], 'no explicit 4xx status takes precedence over the app\'s range')
  const [own, ...shared] = responses['4XX']['x-mdk-errors']
  t.is(responses['4XX'].description, range4.description)
  t.alike(own, range4['x-mdk-errors'][0], 'the app\'s code first, as declared')
  t.alike(pairs(shared), sharedPairs(s => s < 500), 'every shared 4xx code, with the status it arrives with')
  for (const s of FIXED.filter(s => s.status >= 500)) t.alike(responses[s.status], { $ref: `#/components/responses/${s.name}` }, `${s.status} has no range, so it refers`)
})

test('shared responses: an explicit status the app declares wins over its range, and default covers the rest', (t) => {
  const { document } = appDocument([withOwn({ 403: own403, '4XX': range4, default: { description: 'Anything else.' } })])
  const responses = document.paths['/miners/{deviceId}/command'].post.responses
  t.alike(codes(responses[403]), ['ERR_KERNEL_ACTION_FORBIDDEN', ...FIXED.filter(s => s.status === 403).flatMap(s => s.errors.map(e => e.code))])
  t.absent(responses[403]['x-mdk-errors'].some(e => 'status' in e), 'under an explicit status the key is the status')
  t.alike(pairs(responses['4XX']['x-mdk-errors'].slice(1)), sharedPairs(s => s < 500 && s !== 403), 'the range holds the shared 4xx codes no explicit status took')
  t.alike(pairs(responses.default['x-mdk-errors']), sharedPairs(s => s >= 500), 'default answers for the statuses with no range, both statuses of a code kept')
  t.alike(Object.keys(responses).sort(), ['200', '403', '4XX', 'default'], 'nothing the app did not declare is added')
})

// withSharedResponses, sharedComponents and addSharedResponses on hand-built
// input, for the cases a route table does not produce.

test('withSharedResponses: an operation\'s own $ref for a shared status is left as is', (t) => {
  const own = { $ref: '#/components/responses/MyForbidden' }
  const responses = withSharedResponses({ 200: { description: 'OK.' }, 403: own })
  t.alike(responses[403], own)
  t.alike(responses[401], { $ref: '#/components/responses/Unauthorized' }, 'the other statuses are still added')
})

test('withSharedResponses: no responses at all gets every fixed status, and the input is not changed', (t) => {
  const statuses = [...new Set(FIXED.map(s => String(s.status)))].sort()
  t.alike(Object.keys(withSharedResponses(undefined)).sort(), statuses)
  t.alike(Object.keys(withSharedResponses(null)).sort(), statuses)
  const input = { 200: { description: 'OK.' }, 403: structuredClone(own403) }
  const before = structuredClone(input)
  const out = withSharedResponses(input)
  t.alike(input, before, 'the input is not mutated')
  t.not(out[200], input[200], 'the output does not share the input\'s objects')
})

test('withSharedResponses: only the entries passed are added', (t) => {
  const rateLimited = SHARED_RESPONSES.find(s => s.name === 'RateLimited')
  t.alike(withSharedResponses({ 200: { description: 'OK.' } }, [rateLimited]), { 200: { description: 'OK.' }, 429: { $ref: '#/components/responses/RateLimited' } })
  t.alike(withSharedResponses({ 200: { description: 'OK.' } }, RULES), { 200: { description: 'OK.' } }, 'rules add no response')
})

test('sharedComponents: a custom list, and a fresh error body on every call', (t) => {
  const forbidden = SHARED_RESPONSES.find(s => s.name === 'Forbidden')
  t.alike(Object.keys(sharedComponents([forbidden])), ['Forbidden'])
  const a = sharedComponents()
  a.Forbidden.content['application/json'].schema.$ref = 'changed'
  a.Forbidden['x-mdk-errors'][0].code = 'changed'
  const b = sharedComponents()
  t.is(b.Forbidden.content['application/json'].schema.$ref, '#/components/schemas/GatewayError')
  t.is(b.Forbidden['x-mdk-errors'][0].code, 'ERR_AUTH_FORBIDDEN')
  t.is(forbidden.errors[0].code, 'ERR_AUTH_FORBIDDEN', 'the declaration is untouched')
})

test('addSharedResponses: existing components are kept, and an operation without responses is left as a gap', (t) => {
  const mine = { type: 'object' }
  const myResponse = { description: 'Mine.' }
  const gap = { summary: 'No responses.' }
  const document = {
    components: { schemas: { Mine: mine }, responses: { Mine: myResponse }, securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } } },
    paths: { '/a': { get: { responses: { 200: { description: 'OK.' } } }, post: gap, parameters: [{ in: 'query', name: 'q' }] } }
  }
  t.is(addSharedResponses(document), document, 'changed in place and returned')
  t.alike(document.components.schemas, { Mine: mine, GatewayError: GATEWAY_ERROR_SCHEMA })
  t.alike(Object.keys(document.components.responses), ['Mine', ...SHARED_RESPONSES.map(s => s.name)])
  t.ok(document.components.securitySchemes.bearer, 'other components kept')
  t.ok(document.paths['/a'].get.responses[401], 'an operation with responses gains the shared ones')
  t.alike(document.paths['/a'].post, { summary: 'No responses.' }, 'an operation without responses is untouched')
  t.alike(document.paths['/a'].parameters, [{ in: 'query', name: 'q' }], 'a path item\'s parameters are untouched')
  document.components.schemas.GatewayError.description = 'changed'
  t.not(GATEWAY_ERROR_SCHEMA.description, 'changed', 'the document has its own copy of the error body')
})

test('addSharedResponses: a document with no components or paths, and a custom set to apply', (t) => {
  const empty = addSharedResponses({})
  t.alike(Object.keys(empty.components.responses), SHARED_RESPONSES.map(s => s.name))
  t.ok(empty.components.schemas.GatewayError)
  const rateLimited = SHARED_RESPONSES.find(s => s.name === 'RateLimited')
  const document = addSharedResponses({ paths: { '/a': { get: { responses: { 200: { description: 'OK.' } } } } } }, [rateLimited])
  t.alike(Object.keys(document.paths['/a'].get.responses), ['200', '429'], 'only the set passed is applied')
  t.alike(Object.keys(document.components.responses), SHARED_RESPONSES.map(s => s.name), 'components still hold the whole set')
})

test('shared responses: the error body is frozen', (t) => {
  t.ok(Object.isFrozen(GATEWAY_ERROR_SCHEMA))
  t.ok(Object.isFrozen(GATEWAY_ERROR_SCHEMA.properties.message))
  t.ok(SHARED_RESPONSES.every(s => !s.errors || s.errors.every(e => Object.isFrozen(e))), 'each code is frozen too')
})
