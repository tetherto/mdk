'use strict'

const test = require('brittle')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const createTestnet = require('hyperdht/testnet')
const HyperswarmRPC = require('@hyperswarm/rpc')
const DHT = require('hyperdht')
const { createAppRuntime } = require('../../lib/runtime')
const { createRuntimeClient } = require('../../lib/client')
const protocol = require('../../lib/protocol')
const { main } = require('../../bin/run-app')
const {
  ECHO_APP, tmpDir, identityFor, capturingLogger, until, startEcho, connectClient, collect
} = require('../fixtures/helpers')

const UNAVAILABLE = /ERR_APP_RUNTIME_UNAVAILABLE/

test('runtime', { timeout: 120000 }, async (suite) => {
  const testnet = await createTestnet(3, suite.teardown)
  const caller = identityFor()
  const lateFile = path.join(tmpDir(suite), 'late', 'gateway.key')
  const kernelKey = 'ab'.repeat(32)
  const { runtime, publicKey, logger } = await startEcho(suite, testnet, {
    allowedKeys: [` ${caller.publicKey.toUpperCase()} `],
    allowedKeyFiles: [lateFile],
    kernelKey: Buffer.from(kernelKey, 'hex'),
    kernelBootstrap: [{ host: '127.0.0.1', port: 1234 }],
    config: { greeting: 'howdy', kernelKeyPair: 'not-a-keypair', kernelKey: 'cd'.repeat(32), kernelBootstrap: [{ host: 'elsewhere', port: 1 }] }
  })
  const client = await connectClient(suite, testnet, publicKey, caller)
  const failure = (call) => call.catch((err) => err)

  await suite.test('unary round trip; the identity arrives as _info', async (t) => {
    t.alike(runtime.getPublicKey(), publicKey)
    t.ok(logger.lines.includes('info:echo-ready'), 'onReady ran once serving')
    const req = { params: { id: '7' }, query: { q: 'x' }, body: { hello: 'world' }, headers: { 'x-h': 'v' } }
    t.alike(await client.invoke('echo', req), req)
    const identity = { sub: 'alice', roles: ['admin'] }
    t.alike(await client.invoke('whoami', {}, { identity }), { info: identity }, 'identity forwarded verbatim')
    t.alike(await client.invoke('whoami', {}), { info: {} }, 'no identity -> {}')
  })

  await suite.test('req.mdk acts as the operator when the caller sent their token, else as the app', async (t) => {
    const keys = ['_info', 'body', 'headers', 'params', 'query']
    const asOperator = await client.invoke('kernel-client', {}, { identity: { kind: 'user', sub: 'alice' }, actor: 'operator-token' })
    t.alike(asOperator, { keys, asApp: false, canCommand: true, leaked: false })
    t.alike(await client.invoke('kernel-client', {}, { identity: { kind: 'user', sub: 'alice' } }), { keys, asApp: true, canCommand: true, leaked: false })
    const bad = await failure(client.invoke('kernel-client', {}, { actor: 'x'.repeat(8193) }))
    t.is(bad.code, 'ERR_APP_BAD_REQUEST', 'an actor that cannot be a token is refused')
  })

  await suite.test('a unary call outlives the idle-connection linger', async (t) => {
    const short = await connectClient(t, testnet, publicKey, caller, { poolLingerMs: 100 })
    t.alike(await short.invoke('slow', { query: { ms: '600' } }), { waited: 600 })
    t.alike(await short.invoke('slow', { query: { ms: '0' } }), { waited: 0 }, 'and the next call still connects')
  })

  await suite.test('errors: ERR_* messages are returned, anything else is masked; routes are checked', async (t) => {
    const cases = [
      ['invoke', 'fail-safe', 422, 'ERR_ECHO_REJECTED: nope'],
      ['invoke', 'fail-masked', 500, 'Internal Server Error'],
      ['invoke', 'fail-masked-503', 503, 'Service Unavailable'],
      ['invoke', 'nope', 404, 'ERR_APP_ROUTE_NOT_FOUND: nope'],
      ['stream', 'nope', 404, 'ERR_APP_ROUTE_NOT_FOUND: nope'],
      ['invoke', 'stream', 400, 'ERR_APP_ROUTE_IS_STREAM: stream'],
      ['stream', 'echo', 400, 'ERR_APP_ROUTE_NOT_STREAM: echo']
    ]
    for (const [method, routeId, statusCode, message] of cases) {
      const err = await failure(client[method](routeId, {}))
      t.alike([err.statusCode, err.message], [statusCode, message], `${method} ${routeId}`)
    }
    const errors = logger.lines.filter((l) => l.startsWith('error:'))
    t.ok(errors.some((l) => l.includes('fail-masked') && l.includes('hunter2')), 'a masked failure is logged with its real message')
    t.absent(errors.some((l) => l.includes('fail-safe')), 'an ERR_* answer is not logged as an error')
  })

  await suite.test('protocol version mismatch and malformed requests', async (t) => {
    const rpc = new HyperswarmRPC({ bootstrap: testnet.bootstrap, seed: caller.seed })
    t.teardown(() => rpc.destroy())
    const call = async (buf) => protocol.decode(await rpc.request(publicKey, 'app.invoke', buf))
    const mismatch = await call(protocol.encode({ v: 2, routeId: 'echo', req: {} }))
    t.alike([mismatch.ok, mismatch.v, mismatch.status, mismatch.code], [false, 1, 400, 'ERR_APP_PROTOCOL_VERSION'])
    t.is((await call(Buffer.from('}{'))).code, 'ERR_APP_BAD_REQUEST')
  })

  await suite.test('operator config overrides manifest defaults; the Kernel client is the runtime\'s own', async (t) => {
    const conf = await client.invoke('config', {})
    t.alike([conf.greeting, conf.limit], ['howdy', 5], 'operator config wins, manifest defaults remain')
    t.ok(conf.hasMdkClient, 'plugins get a Kernel client')
    for (const k of ['kernelKey', 'kernelKeyPair', 'kernelBootstrap', 'kernelCredential']) t.absent(k in conf, `no ${k} in config, even when the operator sets one`)
    t.ok(conf.configFrozen)
    t.is(runtime.getKernelPublicKey().length, 32)
  })

  await suite.test('stream: head, chunks, end; errors before the head are in-band; a disconnect closes the response', async (t) => {
    const res = await client.stream('stream', { query: { count: 3, tag: 'abc' } })
    t.alike([res.statusCode, res.headers['content-type'], res.headers['x-echo-tag']], [200, 'text/plain', 'abc'])
    t.is(await collect(res.stream), 'chunk-0\nchunk-1\nchunk-2\n')

    const truncated = await client.stream('stream-fail-mid', {})
    t.is(truncated.statusCode, 200)
    await t.exception(collect(truncated.stream), UNAVAILABLE, 'a handler failing mid-body errors the stream instead of ending it cleanly')

    const failed = await client.stream('stream-fail', {})
    t.alike([failed.statusCode, JSON.parse(await collect(failed.stream))], [403, { statusCode: 403, error: 'Forbidden', message: 'ERR_STREAM_REJECTED: no stream for you' }], 'the same body shape as every other error')

    const open = await client.stream('stream', { query: { count: 0 } })
    await new Promise((resolve) => open.stream.once('data', resolve))
    open.stream.destroy()
    await until(() => logger.lines.includes('info:stream-closed'))
    t.is(await collect((await client.stream('stream', { query: { count: 1 } })).stream), 'chunk-0\n', 'the handler saw the disconnect and the runtime is still healthy')
  })

  await suite.test('stream: a reader that falls too far behind gets ERR_APP_STREAM_OVERFLOW and the handler sees the close', async (t) => {
    const small = await connectClient(t, testnet, publicKey, caller, { maxStreamBufferBytes: 64 })
    const before = logger.lines.filter((l) => l === 'info:stream-closed').length
    const res = await small.stream('stream', { query: { count: 0 } })
    const err = await new Promise((resolve) => res.stream.once('error', resolve))
    t.alike([err.code, err.statusCode], ['ERR_APP_STREAM_OVERFLOW', 502])
    t.ok(res.stream.destroyed)
    await until(() => logger.lines.filter((l) => l === 'info:stream-closed').length > before)
    t.pass('the runtime stopped streaming')
    t.exception(() => createRuntimeClient({ maxStreamBufferBytes: 0 }), /ERR_APP_RUNTIME_CLIENT_OPTIONS_INVALID/)
  })

  await suite.test('firewall: only allowed keys get through; key files are re-read; an empty allow set denies everyone', async (t) => {
    const stranger = identityFor()
    t.is(createRuntimeClient({ seed: stranger.seed }).publicKey.toString('hex'), stranger.publicKey, 'the client key derives from its seed')
    const denied = await connectClient(t, testnet, publicKey, stranger)
    await t.exception(denied.invoke('whoami', {}, { timeoutMs: 5000 }), UNAVAILABLE, 'stranger blocked')
    await t.exception(denied.stream('stream', { query: { count: 1 } }), UNAVAILABLE, 'streams too')
    t.ok(logger.lines.some((l) => l.startsWith('warn:blocked')), 'blocks are logged')

    fs.mkdirSync(path.dirname(lateFile))
    fs.writeFileSync(lateFile, `\n  ${stranger.publicKey}  \n`)
    const late = await connectClient(t, testnet, publicKey, stranger)
    t.alike(await late.invoke('whoami', {}, { timeoutMs: 10000 }), { info: {} }, 'allowed once its key file appears')

    const empty = await startEcho(t, testnet)
    const nobody = await connectClient(t, testnet, empty.publicKey, caller)
    await t.exception(nobody.invoke('whoami', {}, { timeoutMs: 15000 }), UNAVAILABLE, 'empty allow set')
  })

  await suite.test('a call past its timeout is ERR_APP_RUNTIME_TIMEOUT / 504, not a dead runtime', async (t) => {
    const err = await failure(client.invoke('slow', { query: { ms: '1500' } }, { timeoutMs: 200 }))
    t.alike([err.statusCode, err.code], [504, 'ERR_APP_RUNTIME_TIMEOUT'])
  })

  await suite.test('an aborted call never reaches the runtime', async (t) => {
    const before = (await client.invoke('counter', { query: { k: 'abort' } })).n

    const ac = new AbortController()
    ac.abort()
    const early = await failure(client.invoke('counter', { query: { k: 'abort' } }, { signal: ac.signal }))
    t.is(early.code, 'ERR_APP_REQUEST_ABORTED', 'an already-aborted signal is refused up front')

    const cold = await connectClient(t, testnet, publicKey, caller)
    const opening = new AbortController()
    const pending = failure(cold.invoke('counter', { query: { k: 'abort' } }, { signal: opening.signal }))
    opening.abort()
    t.is((await pending).code, 'ERR_APP_REQUEST_ABORTED', 'aborted while the connection was opening')

    const streamAc = new AbortController()
    const streaming = failure(cold.stream('stream', { query: { count: '1' } }, { signal: streamAc.signal }))
    streamAc.abort()
    t.is((await streaming).code, 'ERR_APP_REQUEST_ABORTED', 'a stream aborted before its head')

    t.is((await client.invoke('counter', { query: { k: 'abort' } })).n, before + 1, 'neither aborted call ran the controller')
  })

  await suite.test('an unreachable or stopped runtime is ERR_APP_RUNTIME_UNAVAILABLE / 502', async (t) => {
    const nobody = await connectClient(t, testnet, DHT.keyPair(crypto.randomBytes(32)).publicKey, caller)
    const err = await failure(nobody.invoke('echo', {}, { timeoutMs: 5000 }))
    t.alike([err.statusCode, err.code], [502, 'ERR_APP_RUNTIME_UNAVAILABLE'])
    await runtime.stop()
    await t.exception(client.invoke('whoami', {}, { timeoutMs: 5000 }), UNAVAILABLE)
  })

  await suite.test('a start that fails after publishing keyFile removes it again', async (t) => {
    const dir = tmpDir(t)
    fs.writeFileSync(path.join(dir, 'not-a-dir'), '')
    const rt = createAppRuntime({
      name: 'echo',
      appDir: ECHO_APP,
      bootstrap: testnet.bootstrap,
      keyFile: path.join(dir, 'echo.key'),
      kernelKeyFile: path.join(dir, 'not-a-dir', 'kernel.pub'),
      logger: capturingLogger()
    })
    t.teardown(() => rt.stop())
    await t.exception(rt.start(), /ENOTDIR|EEXIST/)
    t.absent(fs.existsSync(path.join(dir, 'echo.key')), 'the Gateway reads "not started" (503), not a dead key')
  })

  await suite.test('a stream END before any HEAD fails the call instead of hanging it', async (t) => {
    const rpc = new HyperswarmRPC({ bootstrap: testnet.bootstrap })
    t.teardown(() => rpc.destroy())
    const server = rpc.createServer()
    server.on('connection', (conn) => {
      conn.mux.pair({ protocol: protocol.METHODS.STREAM }, () => {
        const channel = conn.mux.createChannel({
          protocol: protocol.METHODS.STREAM,
          messages: [{ onmessage: () => channel.messages[protocol.STREAM_MESSAGES.END].send(Buffer.alloc(0)) }, {}, {}, {}, {}]
        })
        channel.open()
      })
    })
    await server.listen()
    const rogue = await connectClient(t, testnet, server.publicKey, caller)
    await t.exception(rogue.stream('x', {}), UNAVAILABLE)
  })

  await suite.test('a second start() during startup waits until the runtime is serving', async (t) => {
    const rt = createAppRuntime({ name: 'echo', appDir: ECHO_APP, bootstrap: testnet.bootstrap, logger: capturingLogger() })
    t.teardown(() => rt.stop())
    let firstDone = false
    const first = rt.start().then((r) => { firstDone = true; return r })
    const second = await rt.start()
    t.ok(firstDone, 'the second call resolved only after the first finished starting')
    t.alike(second.publicKey, (await first).publicKey)
    t.alike((await rt.start()).publicKey, second.publicKey, 'a start() once serving returns at once')
  })

  await suite.test('a storeDir gives stable RPC and Kernel keys; keyFile and kernelKeyFile are written', async (t) => {
    const dir = tmpDir(t)
    const opts = {
      name: 'echo',
      appDir: ECHO_APP,
      bootstrap: testnet.bootstrap,
      storeDir: path.join(dir, 'store'),
      keyFile: path.join(dir, 'run', 'echo.key'),
      kernelKeyFile: path.join(dir, 'run', 'kernel.key'),
      logger: capturingLogger()
    }
    const first = createAppRuntime(opts)
    const kernelPublicKey = first.getKernelPublicKey()
    t.is(first.getPublicKey(), null, 'no RPC key before start')
    const { publicKey } = await first.start()
    t.not(kernelPublicKey.toString('hex'), publicKey.toString('hex'), 'two distinct identities')
    t.is(fs.readFileSync(opts.keyFile, 'utf8'), publicKey.toString('hex'))
    t.is(fs.readFileSync(opts.kernelKeyFile, 'utf8'), kernelPublicKey.toString('hex'))
    t.alike(fs.readdirSync(path.join(dir, 'run')).sort(), ['echo.key', 'kernel.key'], 'no temp files left behind')
    if (process.platform !== 'win32') {
      t.is(fs.statSync(path.join(opts.storeDir, 'identity', 'seedRpc')).mode & 0o777, 0o600, 'seeds are owner-only')
      t.is(fs.statSync(path.join(dir, 'run')).mode & 0o777, 0o700, 'a key dir it creates is owner-only')
      t.is(fs.statSync(opts.kernelKeyFile).mode & 0o777, 0o644, 'key files are readable, not writable, by others')
    }
    await first.stop()
    t.absent(fs.existsSync(opts.keyFile), 'stop() removes the key file, so the Gateway answers 503, not 502')
    t.ok(fs.existsSync(opts.kernelKeyFile), 'the Kernel key stays: it is stable across restarts')

    const second = createAppRuntime(opts)
    t.alike(second.getKernelPublicKey(), kernelPublicKey, 'same Kernel key after restart')
    t.alike((await second.start()).publicKey, publicKey, 'same RPC key after restart')
    await second.stop()
  })

  await suite.test('main runs with the config before the runtime serves, sharing modules with the controllers', async (t) => {
    const dir = tmpDir(t)
    const appDir = path.join(__dirname, '..', 'fixtures', 'main-app')
    const rt = createAppRuntime({ name: 'main', appDir, bootstrap: testnet.bootstrap, storeDir: path.join(dir, 'store'), allowedKeys: [caller.publicKey], logger: capturingLogger() })
    t.teardown(() => rt.stop())
    const { publicKey: mainKey } = await rt.start()
    const mainClient = await connectClient(t, testnet, mainKey, caller)
    const dataDir = path.join(dir, 'store', 'data')
    t.alike(await mainClient.invoke('state', {}), { label: 'from-manifest', dataDir }, 'state main set is visible to the controller')
    t.ok(fs.statSync(dataDir).isDirectory(), 'the data dir exists')
  })

  await suite.test('bin/run-app - starts from env, reports ready over IPC, stops on SIGTERM; bad options exit 1', async (t) => {
    const sent = []
    const handlers = {}
    let exitCode = null
    const io = { send: (m) => sent.push(m), stderr: () => {}, exit: (c) => { exitCode = c }, on: (e, fn) => { handlers[e] = fn } }

    const env = { MDK_APP_RUNTIME_OPTIONS: JSON.stringify({ name: 'echo', appDir: ECHO_APP, bootstrap: testnet.bootstrap }) }
    const started = await main(env, io)
    t.teardown(() => started.runtime.stop())
    t.absent('MDK_APP_RUNTIME_OPTIONS' in env, 'the options (app config included) are dropped from the environment once read')
    t.alike(sent, [{ type: 'ready', publicKey: started.runtime.getPublicKey().toString('hex') }])
    t.alike(Object.keys(handlers).sort(), ['SIGINT', 'SIGTERM', 'disconnect'])
    await handlers.SIGTERM()
    t.alike([exitCode, started.runtime.getPublicKey()], [0, null], 'runtime stopped')

    sent.length = 0
    t.is(await main({ MDK_APP_RUNTIME_OPTIONS: '{nope' }, io), null)
    t.is(exitCode, 1)
    t.ok(sent[0].type === 'error' && /ERR_APP_RUNTIME_OPTIONS_INVALID/.test(sent[0].message))
  })
})
