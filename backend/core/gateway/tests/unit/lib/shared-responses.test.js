'use strict'

const test = require('brittle')
const os = require('os')
const path = require('path')
const { SHARED_RESPONSES } = require('../../../workers/lib/shared-responses')
const { DEFAULT_RATE_LIMIT, resolveSecurityOptions, buildHostAllowlist, createHostCheck, createAuthHook } = require('../../../workers/lib/security')
const { buildFastifyRoutes, errorResponse, resolveAppTimeout } = require('../../../workers/lib/plugin-adapter')

// The declaration drives the test, as in auth-routes.test.js: every code the
// shared responses declare for a stage the Gateway answers is raised through
// the hook or plugin that answers it, and must arrive with its declared status.
// shared-responses-forwarding.test.js binds the forwarding codes the app
// runtime raises; the one forwarding status the Gateway raises itself, the 503
// of ERR_APP_RUNTIME_UNAVAILABLE, is bound here. So are the rules for the
// stages the Gateway answers: body parsing, through Fastify, and the custom
// verifier, through createAuthHook.

const APP = { name: 'ops', keyFile: path.join(os.tmpdir(), 'mdk-no-such-runtime', 'runtime.key'), routes: [{ id: 'ops.read', method: 'GET', path: '/read' }] }
const URL = '/apps/ops/read'
const DENY = { verify: async () => ({ kind: 'user', sub: 'u' }), evaluate: () => ({ allowed: false, reason: 'ERR_RBAC_NO_MATCHING_RULE', policyVersion: 'v1' }) }
// The Gateway's options with none set, as http.node.wrk.js resolves them.
const DEFAULTS = resolveSecurityOptions({}, {})

// A Fastify server with the Gateway's body limit and error handler (http.node.wrk.js).
function server () {
  const fastify = require('fastify')({ bodyLimit: DEFAULTS.bodyLimit })
  fastify.setErrorHandler((err, req, reply) => {
    const body = errorResponse(err, req.log)
    reply.status(body.statusCode).send(body)
  })
  return fastify
}

// `setup` adds the hook or plugin under test and the app's routes. The last of
// `requests` answers; the rest of the options are the request's.
async function answer (setup, { requests = 1, ...request } = {}) {
  const fastify = server()
  await setup(fastify)
  let res
  for (let i = 0; i < requests; i++) res = await fastify.inject({ method: 'GET', url: URL, ...request })
  await fastify.close()
  return { status: res.statusCode, message: res.json().message }
}

const appRoutes = (fastify, opts = {}, app = APP) => buildFastifyRoutes(app, {}, { conf: {} }, opts).forEach(r => fastify.route(r))

const RAISE = {
  ERR_GATEWAY_HOST_NOT_ALLOWED: () => answer(async (f) => {
    f.addHook('onRequest', createHostCheck(buildHostAllowlist([], { port: '3000' })))
    appRoutes(f)
  }, { headers: { host: 'rebound.example' } }),
  ERR_AUTH_UNAUTHORIZED: () => answer(async (f) => appRoutes(f, { authority: DENY })),
  ERR_RATE_LIMITED: () => answer(async (f) => {
    await f.register(require('@fastify/rate-limit'), { ...DEFAULTS.rateLimit, max: 1 })
    appRoutes(f)
  }, { requests: 2 }),
  ERR_AUTH_FORBIDDEN: () => answer(async (f) => appRoutes(f, { authority: DENY }), { headers: { authorization: 'Bearer t' } }),
  // No key file: the runtime has not started, so the forward never leaves the Gateway.
  ERR_APP_RUNTIME_UNAVAILABLE: () => answer(async (f) => appRoutes(f))
}

test('shared responses: every code a Gateway stage answers arrives with its declared status', async (t) => {
  for (const s of SHARED_RESPONSES.filter(e => e.errors && e.stage !== 'Forwarding')) {
    for (const { code } of s.errors) {
      t.ok(RAISE[code], `${code} has a hook that raises it`)
      if (!RAISE[code]) continue
      const res = await RAISE[code]()
      t.is(res.status, s.status, `${s.stage}: ${s.status} ${code}`)
      t.ok(res.message.startsWith(code), `${code} message`)
    }
  }
})

test('shared responses: the app runtime unavailable before the forward is the declared 503', async (t) => {
  const res = await RAISE.ERR_APP_RUNTIME_UNAVAILABLE()
  t.ok(res.message.startsWith('ERR_APP_RUNTIME_UNAVAILABLE'))
  const declared = SHARED_RESPONSES.filter(s => s.stage === 'Forwarding' && s.errors.some(e => e.code === 'ERR_APP_RUNTIME_UNAVAILABLE')).map(s => s.status)
  t.ok(declared.includes(res.status), `${res.status} is declared for ERR_APP_RUNTIME_UNAVAILABLE (declared: ${declared.join(', ')})`)
  t.is(res.status, 503)
})

// Body parsing. Fastify reads a body itself, after the route's onRequest and
// preParsing hooks and before its preValidation hook, which is authorization on
// a Gateway with an RBAC authority. Each failure turns a request with a valid
// JSON body into one the stage refuses, keyed by the status it is refused with.
const BODY_PARSING = SHARED_RESPONSES.filter(s => s.stage === 'Body parsing')
const POST_APP = { ...APP, routes: [{ id: 'ops.write', method: 'POST', path: '/write' }] }
const POST_URL = '/apps/ops/write'
const VALID_BODY = { contentType: 'application/json', payload: '{}' }
const PARSE_FAILURE = {
  415: (body) => ({ ...body, contentType: 'application/xml' }),
  // Trailing spaces are valid JSON, so the body fails on its size alone.
  413: (body) => ({ ...body, payload: body.payload + ' '.repeat(DEFAULTS.bodyLimit) }),
  400: (body) => ({ ...body, payload: '{' + body.payload })
}
const bodyFailing = (statuses) => statuses.reduce((body, status) => PARSE_FAILURE[status](body), VALID_BODY)
const asRequest = ({ contentType, payload }, headers = {}) => ({ method: 'POST', url: POST_URL, payload, headers: { 'content-type': contentType, ...headers } })
// A caller no rule allows: any answer but its 403 was given before authorization.
const denied = (request, app = POST_APP) => answer(async (f) => appRoutes(f, { authority: DENY }, app), { ...request, headers: { ...request.headers, authorization: 'Bearer t' } })

test('shared responses: each body parsing status arrives as declared, before authorization, in the declared order', async (t) => {
  t.alike(BODY_PARSING.map(s => s.status).sort(), Object.keys(PARSE_FAILURE).map(Number).sort(), 'a failing body for each declared status')
  t.is((await denied(asRequest(VALID_BODY))).status, 403, 'a body that parses goes on to authorization')
  for (const s of BODY_PARSING) {
    const res = await denied(asRequest(bodyFailing([s.status])))
    t.is(res.status, s.status, `${s.name}: ${res.status} ${res.message}`)
    t.absent(res.message.startsWith('ERR_'), 'the message is Fastify\'s, not an ERR_* code')
    t.ok(s.rule.includes('before authorization'), 'the rule places it before authorization')
  }
  for (let i = 0; i < BODY_PARSING.length - 1; i++) {
    const [first, second] = [BODY_PARSING[i], BODY_PARSING[i + 1]]
    const res = await denied(asRequest(bodyFailing([first.status, second.status])))
    t.is(res.status, first.status, `${first.name} answers before ${second.name}`)
  }
})

test('shared responses: what the body parsing rules state of Fastify is what it does', async (t) => {
  const rule = (status) => BODY_PARSING.find(s => s.status === status).rule
  for (const status of [415, 413]) {
    const { message } = await denied(asRequest(bodyFailing([status])))
    t.ok(rule(status).includes(`Fastify's \`${message}\``), `${status} quotes Fastify's message: ${message}`)
  }
  t.ok(rule(400).includes('Fastify\'s parse error'))
  for (const contentType of ['application/json', 'text/plain']) {
    t.is((await denied(asRequest({ contentType, payload: '{}' }))).status, 403, `a ${contentType} body is parsed`)
    t.ok(rule(415).includes(`\`${contentType}\``), `the rule names ${contentType}`)
  }
  const get = await denied({ ...asRequest(bodyFailing([415, 413])), method: 'GET', url: URL }, APP)
  t.is(get.status, 403, 'a GET body is not read')
  for (const s of BODY_PARSING) t.ok(s.rule.startsWith('A request other than `GET`'), `${s.name} leaves GET out`)
})

// The custom verifier's status is a range: a refusal answers the 401 its rule names.
const REFUSED = { status: 401, code: 'ERR_AUTH_UNAUTHORIZED' }

test('shared responses: each branch of the custom verifier rule is what the rule states', async (t) => {
  const { rule } = SHARED_RESPONSES.find(s => s.name === 'VerifierRefused')
  // What the HTTP caller gets from createAuthHook, through the Gateway's errorResponse.
  const answered = async (verifier) => errorResponse(await createAuthHook(verifier, { id: 'ops.read' })({}).then(() => new Error('let through'), (err) => err))
  const thrown = (message, statusCode) => async () => { throw Object.assign(new Error(message), statusCode ? { statusCode } : {}) }
  const OTHER = 'when it throws anything else'
  const cases = [
    ['no verifier configured', null, REFUSED, 'when none is configured'],
    ['the verifier refuses the caller', async () => false, REFUSED, 'when the verifier refuses the caller'],
    ['its own 4xx ERR_* error', thrown('ERR_SITE_DENIED: no', 403), { status: 403, code: 'ERR_SITE_DENIED' }, 'the verifier\'s own `4xx` error when it throws one whose message starts with `ERR_`'],
    ['an ERR_* error with a 5xx status', thrown('ERR_SITE_DOWN', 503), REFUSED, OTHER],
    ['an ERR_* error with no status', thrown('ERR_SITE_DENIED'), REFUSED, OTHER],
    ['a 4xx error without ERR_', thrown('denied', 403), REFUSED, OTHER],
    ['any other error', thrown('db down'), REFUSED, OTHER]
  ]
  for (const [branch, verifier, expected, phrase] of cases) {
    const res = await answered(verifier)
    t.alike([res.statusCode, res.message.split(':')[0]], [expected.status, expected.code], branch)
    t.ok(rule.includes(phrase), `the rule states it: ${phrase}`)
  }
  t.ok(rule.includes(`\`${REFUSED.status}\` \`${REFUSED.code}\``), 'the rule names the refusal')
  // Where it runs: the custom verifier order test below meets it after the rate
  // limit and before the body is read, and passes it with no bearer token.
  for (const phrase of ['after the rate limit', 'before the body is read', 'in place of authentication and authorization']) t.ok(rule.includes(phrase), phrase)
})

test('shared responses: the defaults the descriptions state are the Gateway\'s own', (t) => {
  const text = (name) => { const s = SHARED_RESPONSES.find(e => e.name === name); return s.rule || s.errors.map(e => e.description).join(' ') }
  t.is(DEFAULT_RATE_LIMIT.timeWindow, '1 minute', 'the rate limit counts a minute')
  t.ok(text('RateLimited').includes(`\`${DEFAULT_RATE_LIMIT.max}\` a minute by default`), `rateLimit: ${DEFAULT_RATE_LIMIT.max}`)
  t.ok(text('AppRuntimeTimeout').includes(`\`${resolveAppTimeout({})}\` by default`), `appTimeoutMs: ${resolveAppTimeout({})}`)
  t.ok(text('BodyTooLarge').includes(`\`${DEFAULTS.bodyLimit}\` bytes by default`), `bodyLimit: ${DEFAULTS.bodyLimit}`)
})

// The declared order is a claim too: the pages say a request meets the stages
// in the map's order. Each neighbouring pair is checked with one request that
// fails both stages, which must get the earlier stage's answer, on a Gateway
// with an RBAC authority and on one with a custom verifier.
//
// The rate limit before authentication is what the code does: the token check
// is the route's preParsing hook, which runs after every onRequest hook,
// @fastify/rate-limit's included, so a caller with no token is counted before
// it is answered 401. If the hooks change order, this fails: reorder the map to match.
const ORDER_APP = { ...APP, routes: [{ id: 'ops.write', method: 'POST', path: '/write', auth: true, schema: { querystring: { type: 'object', required: ['q'], properties: { q: { type: 'string' } } } } }] }
const BY_TOKEN = { verify: async (token) => ({ kind: 'user', sub: token }), evaluate: (identity) => ({ allowed: identity.sub === 'allow', reason: 'ERR_RBAC_NO_MATCHING_RULE', policyVersion: 'v1' }) }
const HOST = 'localhost:3000'

// Each mode: the stages it can fail, the options buildFastifyRoutes gets, and
// the credentials of a request failing `failing`. The verifier reads no bearer
// token, so a request passes it without one.
const MODES = {
  'an RBAC authority': {
    stages: new Set(['Host check', 'Authentication', 'Rate limit', 'Body parsing', 'Authorization', 'Body validation']),
    opts: { authority: BY_TOKEN },
    credentials: (failing) => (failing.has('Authentication') ? {} : { authorization: failing.has('Authorization') ? 'Bearer deny' : 'Bearer allow' })
  },
  'a custom verifier': {
    stages: new Set(['Host check', 'Rate limit', 'Custom verifier', 'Body parsing', 'Body validation']),
    opts: { authVerifier: async (req) => req.headers['x-key'] === 'allow' },
    credentials: (failing) => (failing.has('Custom verifier') ? {} : { 'x-key': 'allow' })
  }
}

// One request to a server wired as http.node.wrk.js wires it, failing every stage in `failing`.
async function meet (mode, failing) {
  const fastify = server()
  await fastify.register(require('@fastify/rate-limit'), { ...DEFAULTS.rateLimit, max: 1 })
  fastify.addHook('onRequest', createHostCheck(buildHostAllowlist([], { port: '3000' })))
  buildFastifyRoutes(ORDER_APP, {}, { conf: {} }, mode.opts).forEach(r => fastify.route(r))
  // A request that passes every stage is counted, which spends the limit of one.
  if (failing.has('Rate limit')) await fastify.inject({ ...asRequest(VALID_BODY, { host: HOST, ...mode.credentials(new Set()) }), url: `${POST_URL}?q=1` })
  const headers = { host: failing.has('Host check') ? 'rebound.example' : HOST, ...mode.credentials(failing) }
  const body = failing.has('Body parsing') ? bodyFailing([BODY_PARSING[0].status]) : VALID_BODY
  const res = await fastify.inject({ ...asRequest(body, headers), url: failing.has('Body validation') ? POST_URL : `${POST_URL}?q=1` })
  await fastify.close()
  return { status: res.statusCode, message: res.json().message }
}

// What the map declares a stage answers: its status, and its code when it has one.
function declared (stage) {
  const entry = SHARED_RESPONSES.find(s => s.stage === stage)
  if (entry.name === 'VerifierRefused') return REFUSED
  return { status: entry.status, code: entry.errors?.[0].code }
}
const answers = (res, { status, code }) => res.status === status && (code ? res.message.startsWith(code) : !res.message.startsWith('ERR_'))

for (const [name, mode] of Object.entries(MODES)) {
  test(`shared responses: a request that fails two stages gets the earlier one, in the declared order, with ${name}`, async (t) => {
    const stages = [...new Set(SHARED_RESPONSES.map(s => s.stage))].filter(s => mode.stages.has(s))
    t.is(stages.length, mode.stages.size, 'every stage this test can fail is declared')
    for (const stage of stages) {
      const res = await meet(mode, new Set([stage]))
      t.ok(answers(res, declared(stage)), `${stage} alone: ${res.status} ${res.message}`)
    }
    for (let i = 0; i < stages.length - 1; i++) {
      const [first, second] = [stages[i], stages[i + 1]]
      const res = await meet(mode, new Set([first, second]))
      t.ok(answers(res, declared(first)), `${first} answers before ${second}: ${res.status} ${res.message}`)
    }
  })
}
