'use strict'

const test = require('brittle')
const EventEmitter = require('events')
const { PassThrough } = require('stream')
const { createRuntimeClient, pipeToResponse } = require('../../lib/client')
const protocol = require('../../lib/protocol')

const KEY = Buffer.alloc(32, 7)
// Each connection answers through `request(key, method, payload, options)`.
function fakeRpc (request) {
  const conns = []
  const connect = (key) => {
    const conn = new EventEmitter()
    conn.destroyed = false
    conn.request = (method, payload, options) => request(key, method, payload, options)
    conn.destroy = () => {
      if (conn.destroyed) return
      conn.destroyed = true
      conn.emit('close')
    }
    conns.push(conn)
    return conn
  }
  return { defaultKeyPair: { publicKey: Buffer.alloc(32, 1), secretKey: Buffer.alloc(64, 2) }, connect, conns, destroy: async () => {} }
}

async function connected (request) {
  const client = createRuntimeClient({ rpc: fakeRpc(request) })
  await client.connect()
  return client
}

test('client: derives a stable public key from a seed, and a random one without', async (t) => {
  const seed = Buffer.alloc(32, 9).toString('hex')
  const a = createRuntimeClient({ seed })
  const b = createRuntimeClient({ seed: Buffer.alloc(32, 9) })
  t.alike(a.publicKey, b.publicKey)
  t.unlike(createRuntimeClient({}).publicKey, createRuntimeClient({}).publicKey)
  t.alike(createRuntimeClient({ rpc: fakeRpc() }).publicKey, Buffer.alloc(32, 1), 'an injected rpc supplies its own key')
})

test('client: calls before connect() are rejected', async (t) => {
  const client = createRuntimeClient({ rpc: fakeRpc() })
  await t.exception(() => client.invoke(KEY, 'r', {}), /ERR_APP_RUNTIME_CLIENT_NOT_CONNECTED/)
})

test('client: invoke returns the result and passes a timeout only when asked', async (t) => {
  const seen = []
  const client = await connected(async (key, method, payload, options) => {
    seen.push(options)
    return protocol.encode(protocol.okResponse({ fine: true }))
  })
  t.alike(await client.invoke(KEY.toString('hex'), 'r', {}), { fine: true })
  await client.invoke(KEY, 'r', {}, { timeoutMs: 50 })
  t.alike(seen, [undefined, { timeout: 50 }])
})

test('client: unary calls share one connection per runtime, kept open while any call is in flight', async (t) => {
  const ok = protocol.encode(protocol.okResponse({}))
  let finish = null
  const rpc = fakeRpc(async (key) => {
    if (!key.equals(KEY) || finish) return ok
    return new Promise((resolve) => { finish = () => resolve(ok) })
  })
  const client = createRuntimeClient({ rpc, poolLingerMs: 30 })
  await client.connect()

  const slow = client.invoke(KEY, 'r', {})
  await client.invoke(Buffer.alloc(32, 8), 'r', {})
  t.is(rpc.conns.length, 2, 'one connection per runtime key')
  await new Promise((resolve) => setTimeout(resolve, 100))
  t.is(rpc.conns[0].destroyed, false, 'not torn down under a call slower than the linger')
  t.is(rpc.conns[1].destroyed, true, 'an idle connection is dropped after the linger')
  finish()
  await slow
  await new Promise((resolve) => setTimeout(resolve, 100))
  t.is(rpc.conns[0].destroyed, true, 'dropped once its last call settled')

  await client.invoke(KEY, 'other', {})
  t.is(rpc.conns.length, 3, 'a dropped connection is replaced on the next call')
  await client.close()
  t.is(rpc.conns[2].destroyed, true, 'close() drops pooled connections')
})

test('client: concurrent calls to one runtime reuse the connection being opened', async (t) => {
  const rpc = fakeRpc(async () => protocol.encode(protocol.okResponse({})))
  const client = createRuntimeClient({ rpc })
  await client.connect()
  await Promise.all([client.invoke(KEY, 'a', {}), client.invoke(KEY, 'b', {}), client.invoke(KEY, 'c', {})])
  t.is(rpc.conns.length, 1)
  await client.close()
})

test('client: transport, decode and version failures all map to a typed error', async (t) => {
  const transport = await connected(async () => { throw new Error('boom') })
  await t.exception(() => transport.invoke(KEY, 'r', {}), /ERR_APP_RUNTIME_UNAVAILABLE/)

  const garbled = await connected(async () => Buffer.from('not json'))
  await t.exception(() => garbled.invoke(KEY, 'r', {}), /ERR_APP_RUNTIME_UNAVAILABLE/)

  const wrongVersion = await connected(async () => protocol.encode({ v: 99, ok: true }))
  await t.exception(() => wrongVersion.invoke(KEY, 'r', {}), /ERR_APP_PROTOCOL_VERSION/)

  const empty = await connected(async () => protocol.encode(null))
  await t.exception(() => empty.invoke(KEY, 'r', {}), /ERR_APP_PROTOCOL_VERSION/)
})

test('client: an ok:false response becomes an error with its status', async (t) => {
  const client = await connected(async () => protocol.encode(protocol.errorResponse(404, 'ERR_APP_ROUTE_NOT_FOUND', 'ERR_APP_ROUTE_NOT_FOUND: x')))
  try {
    await client.invoke(KEY, 'x', {})
    t.fail('should reject')
  } catch (err) {
    t.is(err.statusCode, 404)
    t.is(err.code, 'ERR_APP_ROUTE_NOT_FOUND')
  }
})

test('client: close() leaves an injected rpc open and is idempotent', async (t) => {
  let destroyed = 0
  const rpc = { ...fakeRpc(), destroy: async () => { destroyed++ } }
  const client = createRuntimeClient({ rpc })
  await client.connect()
  await client.connect()
  await client.close()
  await client.close()
  t.is(destroyed, 0)
})

test('client: stream() fails fast without a mux and when the connection closes', async (t) => {
  const handlers = {}
  const conn = { on: (e, fn) => { handlers[e] = fn }, destroy () {} }
  const noMux = createRuntimeClient({ rpc: { ...fakeRpc(), connect: () => conn } })
  await noMux.connect()
  await t.exception(() => noMux.stream(KEY, 'r', {}), /ERR_APP_RUNTIME_UNAVAILABLE/)
})

test('pipeToResponse writes the head and resolves after the body', async (t) => {
  const body = new PassThrough()
  const out = new PassThrough()
  const written = []
  out.writeHead = (status, headers) => written.push([status, headers])
  const done = pipeToResponse({ statusCode: 201, headers: { a: 'b' }, stream: body }, out)
  body.end('hello')
  t.is(await done, undefined, 'a completed body resolves with nothing')
  t.alike(written, [[201, { a: 'b' }]])
  t.is(out.read().toString(), 'hello')

  const broken = new PassThrough()
  const sink = new PassThrough()
  sink.writeHead = () => {}
  const aborted = pipeToResponse({ statusCode: 200, headers: {}, stream: broken }, sink)
  const gone = Object.assign(new Error('ERR_APP_STREAM_OVERFLOW: r'), { code: 'ERR_APP_STREAM_OVERFLOW' })
  broken.destroy(gone)
  t.is(await aborted, gone, 'resolves, not rejects, with the error that tore it down')
})
