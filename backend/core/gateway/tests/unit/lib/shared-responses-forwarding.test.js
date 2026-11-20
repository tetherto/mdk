'use strict'

const test = require('brittle')
const EventEmitter = require('events')
const createTestnet = require('hyperdht/testnet')
const { createMdkClient } = require('@tetherto/mdk-client')
const { createRuntimeClient } = require('@tetherto/mdk-app-runtime')
const { SHARED_RESPONSES } = require('../../../workers/lib/shared-responses')
// The app runtime's wire protocol and its test runtime are not part of its
// package API, so they are read from its source in this repository.
const protocol = require('../../../../app-runtime/lib/protocol')
const { identityFor, startEcho, connectClient } = require('../../../../app-runtime/tests/fixtures/helpers')

// The declaration drives the test, as the sign-in routes' does: every
// forwarding code the shared responses declare is raised through the app
// runtime's code that answers it, and must reach the Gateway with its declared
// status. The Gateway answers with the error's statusCode (plugin-adapter.js
// errorResponse), so the client's error is what the HTTP caller receives.
//
// The 503 of ERR_APP_RUNTIME_UNAVAILABLE is raised in the Gateway, before any
// call to the runtime (plugin-adapter.js, the runtime's key file), so
// shared-responses.test.js binds it.
const BOUND_IN_GATEWAY = new Set(['503 ERR_APP_RUNTIME_UNAVAILABLE'])

const FORWARDING = SHARED_RESPONSES.filter(s => s.stage === 'Forwarding')
const failure = (call) => call.then(() => { throw new Error('expected a failure') }, (err) => err)

// A client whose one connection answers `reply` to every request, as the app runtime's client.test.js stubs the transport.
async function clientAnswering (reply) {
  const rpc = {
    defaultKeyPair: { publicKey: Buffer.alloc(32, 1), secretKey: Buffer.alloc(64, 2) },
    connect: () => Object.assign(new EventEmitter(), { request: reply, destroy () {} }),
    destroy: async () => {}
  }
  const client = createRuntimeClient({ rpc })
  await client.connect()
  return client
}

test('shared responses: every forwarding code arrives with its declared status', { timeout: 120000 }, async (suite) => {
  const testnet = await createTestnet(4, suite.teardown)
  const caller = identityFor()
  const { publicKey } = await startEcho(suite, testnet, { allowedKeys: [caller.publicKey] })
  const client = await connectClient(suite, testnet, publicKey, caller)
  const stranger = await connectClient(suite, testnet, publicKey, identityFor())

  // Each through the real runtime and the real client, but the version
  // mismatch: a runtime at another protocol version answers in its own, which
  // an injected transport stands in for.
  const RAISE = {
    ERR_APP_BAD_REQUEST: () => client.invoke('echo', {}, { actor: 'x'.repeat(8193) }),
    ERR_APP_ROUTE_IS_STREAM: () => client.invoke('stream', {}),
    ERR_APP_ROUTE_NOT_STREAM: () => client.stream('echo', {}),
    ERR_APP_ROUTE_NOT_FOUND: () => client.invoke('nope', {}),
    ERR_APP_PROTOCOL_VERSION: async () => {
      const other = { ...protocol.toErrorResponse(protocol.checkRequest({ v: 0, routeId: 'echo' })), v: protocol.PROTOCOL_VERSION + 1 }
      return (await clientAnswering(async () => protocol.encode(other))).invoke(publicKey, 'echo', {})
    },
    ERR_APP_RUNTIME_UNAVAILABLE: () => stranger.invoke('whoami', {}, { timeoutMs: 10000 }),
    ERR_APP_RUNTIME_TIMEOUT: () => client.invoke('slow', { query: { ms: '2000' } }, { timeoutMs: 200 })
  }

  for (const s of FORWARDING) {
    for (const { code } of s.errors) {
      const key = `${s.status} ${code}`
      if (BOUND_IN_GATEWAY.has(key)) continue
      await suite.test(key, async (t) => {
        t.ok(RAISE[code], `${code} has a raiser`)
        if (!RAISE[code]) return
        const err = await failure(RAISE[code]())
        t.alike([err.statusCode, err.code], [s.status, code], `${s.stage}: ${key}`)
        t.ok(err.message.startsWith(code), 'the message the Gateway forwards starts with the code')
      })
    }
  }

  await suite.test('only the 503 is left to the Gateway', (t) => {
    const declared = FORWARDING.flatMap(s => s.errors.map(e => `${s.status} ${e.code}`))
    for (const key of BOUND_IN_GATEWAY) t.ok(declared.includes(key), `${key} is declared`)
  })
})

// The status rule the runtime answers every controller failure with
// (protocol.js _statusOf), read back by the Gateway's client. Each branch must
// be the one the controller rule states.
test('shared responses: each branch of the controller status rule is what the rule states', (t) => {
  const { rule } = SHARED_RESPONSES.find(s => s.name === 'ControllerError')
  const relayed = (err) => protocol.fromErrorResponse(protocol.toErrorResponse(err))
  const cases = [
    ['the error\'s statusCode when 400 or more', Object.assign(new Error('ERR_X_TAKEN: y'), { statusCode: 409 }), 409, '`statusCode` when that is `400` or more'],
    ['ERR_KERNEL_ACTION_FORBIDDEN', new Error('ERR_KERNEL_ACTION_FORBIDDEN: no'), 403, '`403` for `ERR_KERNEL_ACTION_FORBIDDEN`'],
    ['any other ERR_*, a statusCode under 400 included', Object.assign(new Error('ERR_X_BAD'), { statusCode: 302 }), 400, '`400` for any other `ERR_*` error'],
    ['anything else', new Error('boom'), 500, '`500` for anything else']
  ]
  for (const [branch, err, status, phrase] of cases) {
    t.is(relayed(err).statusCode, status, branch)
    t.ok(rule.includes(phrase), `the rule states it: ${phrase}`)
  }
  t.is(relayed(new Error('boom')).message, 'Internal Server Error', 'a message without ERR_ arrives as the status text')
  t.ok(rule.includes('`Internal Server Error`'))
})

// The relayed code's status follows the controller rule, so the entry declares
// none and the page prints Varies; each status the rule states is checked here.
test('shared responses: a code relayed from the Kernel client arrives with a status the rule states', async (t) => {
  const { status, rule } = SHARED_RESPONSES.find(s => s.name === 'KernelClientError')
  const relayed = (err) => protocol.fromErrorResponse(protocol.toErrorResponse(err))
  t.is(status, undefined, 'no one status: it varies with the code')
  // A real Kernel client with no Kernel configured fails every call with its own code.
  const err = await failure(createMdkClient({}).listWorkers())
  t.is(err.code, 'ERR_MDK_CLIENT_UNAVAILABLE')
  t.absent(err.statusCode, 'the Kernel client sets no status')
  t.is(relayed(err).statusCode, 400)
  t.ok(rule.includes('arrives as `400` by the controller rule'), 'the rule states 400')
  t.is(relayed(new Error('ERR_KERNEL_ACTION_FORBIDDEN: no')).statusCode, 403)
  t.ok(rule.includes('`403` for `ERR_KERNEL_ACTION_FORBIDDEN`'), 'the rule states 403')
})

// Every code the app runtime's wire protocol defines is either declared in the
// shared set or listed here, with the reason no HTTP caller receives it as a
// status. A new code fails this test until it is one or the other.
const NOT_RECEIVED = new Map([
  // The code the runtime gives a controller failure whose message carries no
  // ERR_* code (protocol.js toErrorResponse). The Gateway answers the error's
  // message, which is then the status text, so the caller gets the controller
  // rule's status and never this code.
  ['ERR_APP_REQUEST_FAILED', () => protocol.fromErrorResponse(protocol.toErrorResponse(new Error('boom'))).message === 'Internal Server Error'],
  // Raised only when the HTTP request's signal aborts, which plugin-adapter.js
  // does when the HTTP client has gone (client.js _aborted, status 499): no one
  // is left to receive it.
  ['ERR_APP_REQUEST_ABORTED', null],
  // Raised only once a stream's head has been written (client.js _overflow):
  // the Gateway ends the 200 body early and logs the code (plugin-adapter.js).
  ['ERR_APP_STREAM_OVERFLOW', null]
])

test('shared responses: every app runtime protocol code is declared, or listed as one no HTTP caller receives', (t) => {
  const declared = new Set(SHARED_RESPONSES.flatMap(s => (s.errors || []).map(e => e.code)))
  const codes = new Set(Object.values(protocol.ERR))
  for (const code of codes) t.ok(declared.has(code) !== NOT_RECEIVED.has(code), `${code} is declared or listed, not both`)
  for (const [code, check] of NOT_RECEIVED) {
    t.ok(codes.has(code), `${code} is still a protocol code`)
    if (check) t.ok(check(), `${code}: the HTTP caller gets the status text instead`)
  }
})
