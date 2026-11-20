'use strict'

// The Gateway end to end against real app runtimes (in-process, over a local
// HyperDHT testnet): startGateway mounts each app's route table only, and every
// request is forwarded over HRPC to the app's runtime.

const test = require('brittle')
const net = require('net')
const path = require('path')
const createTestnet = require('hyperdht/testnet')
const { createAppRuntime } = require('@tetherto/mdk-app-runtime')
const { startGateway } = require('@tetherto/mdk-core')

// The Gateway's own copy of the app runtime's echo app: that package does not ship its tests.
const { ECHO_APP, tmpDir, capturingLogger } = require('../fixtures/helpers')

const LOOPBACK = '127.0.0.1'

function freePort () {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.once('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
}

test('gateway forwards to app runtimes over HRPC', { timeout: 120000 }, async (t) => {
  const testnet = await createTestnet(4, t.teardown)
  const dir = tmpDir(t)
  const port = await freePort()
  const keyFile = (name) => path.join(dir, 'run', `${name}.key`)
  const gatewayKeyFile = keyFile('gateway')

  const get = async (url, init) => {
    const res = await fetch(`http://127.0.0.1:${port}${url}`, init)
    const text = await res.text()
    let body = {}
    try { body = JSON.parse(text) } catch {}
    return { status: res.status, headers: res.headers, body, text }
  }
  const startRuntime = async (name, allowedKeyFiles) => {
    const runtime = createAppRuntime({ name, appDir: ECHO_APP, bootstrap: testnet.bootstrap, dhtHost: LOOPBACK, keyFile: keyFile(name), allowedKeyFiles, logger: capturingLogger() })
    await runtime.start()
    t.teardown(() => runtime.stop())
    return runtime
  }

  const hnd = await startGateway({
    kernelKey: false,
    env: 'test',
    port,
    root: path.join(dir, 'gateway'),
    bootstrap: testnet.bootstrap,
    dhtHost: LOOPBACK,
    apps: ['echo', 'denied'].map((name) => ({ name, appDir: ECHO_APP, keyFile: keyFile(name) })),
    gatewayKeyFile,
    authVerifier: async (req) => ({
      'Bearer reader': { user: { userId: 'reader' } },
      'Bearer admin': { user: { userId: 'admin' }, perms: ['cache:overwrite'] }
    })[req.headers.authorization] || false
  })
  t.teardown(() => new Promise((resolve) => hnd.stop(resolve)))

  t.is(globalThis.__echoAppLoads, undefined, 'mounting loaded no controller')
  t.alike(Object.keys(require.cache).filter((k) => k.startsWith(path.join(ECHO_APP, 'controllers'))), [], 'and none entered require.cache')
  for (const url of ['/apps/echo/whoami', '/apps/echo/stream?count=1']) {
    const { status, body } = await get(url)
    t.alike([status, body.message], [503, 'ERR_APP_RUNTIME_UNAVAILABLE: echo'], `${url} answers 503 until the runtime publishes its key`)
  }

  const echo = await startRuntime('echo', [gatewayKeyFile])
  await startRuntime('denied', [])
  t.ok(globalThis.__echoAppLoads > 0, 'the runtimes loaded the controllers')

  const echoed = await get('/apps/echo/echo?x=1', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-trace': 'abc' },
    body: JSON.stringify({ hello: 'world' })
  })
  t.alike([echoed.status, echoed.body.query, echoed.body.body, echoed.body.headers['x-trace']], [200, { x: '1' }, { hello: 'world' }, 'abc'], 'JSON round trip')
  t.alike((await get('/apps/echo/whoami')).body, { info: {} }, 'an open route forwards an empty identity')
  t.is((await get('/apps/echo/whoami-auth')).status, 401, 'an auth: true route is refused without a verified caller')
  t.alike((await get('/apps/echo/whoami-auth', { headers: { authorization: 'Bearer reader' } })).body, { info: { user: { userId: 'reader' } } }, 'the verified identity arrives as req._info')

  const n = async (url, init) => (await get(url, init)).body.n
  const first = await n('/apps/echo/counter?k=a')
  t.is(await n('/apps/echo/counter?k=a'), first, 'a cache hit skips the runtime')
  t.is(await n('/apps/echo/counter?k=b'), first + 1, 'the cache key varies by field')
  t.is(await n('/apps/echo/counter?k=a&overwriteCache=true', { headers: { authorization: 'Bearer admin' } }), first, 'overwriteCache on an open route is ignored')

  const admin = { headers: { authorization: 'Bearer admin' } }
  const reader = { headers: { authorization: 'Bearer reader' } }
  const cachedReader = await n('/apps/echo/counter-auth?k=a', reader)
  t.is(await n('/apps/echo/counter-auth?k=a&overwriteCache=true', reader), cachedReader, 'overwriteCache needs cache:overwrite')
  const cached = await n('/apps/echo/counter-auth?k=a', admin)
  t.is(cached, cachedReader + 1, 'callers do not share an auth: true cache entry')
  t.is(await n('/apps/echo/counter-auth?k=a', admin), cached, 'a caller hits its own entry')
  t.is(await n('/apps/echo/counter-auth?k=a&overwriteCache=true', admin), cached + 1, 'a caller holding cache:overwrite refreshes')

  const errors = [
    ['/apps/echo/fail-safe', 422, /^ERR_ECHO_REJECTED: nope$/],
    ['/apps/echo/fail-masked', 500, /^Internal Server Error$/],
    ['/apps/echo/fail-masked-503', 503, /^Service Unavailable$/],
    ['/apps/echo/stream-fail', 403, /^ERR_STREAM_REJECTED: no stream for you$/],
    ['/apps/echo/nope', 404, null],
    ['/apps/denied/whoami', 502, /^ERR_APP_RUNTIME_UNAVAILABLE/],
    ['/apps/denied/stream?count=1', 502, /^ERR_APP_RUNTIME_UNAVAILABLE/]
  ]
  for (const [url, status, message] of errors) {
    const res = await get(url)
    t.is(res.status, status, `${url}: ${status}`)
    if (message) t.ok(message.test(res.body.message), `${url}: ${res.body.message}`)
  }

  const streamed = await get('/apps/echo/stream?count=3&tag=hi')
  t.alike([streamed.text, streamed.headers.get('x-echo-tag')], ['chunk-0\nchunk-1\nchunk-2\n', 'hi'], 'stream head and chunks are proxied')

  const bodyReader = (await fetch(`http://127.0.0.1:${port}/apps/echo/stream?count=0`)).body.getReader()
  t.ok(new TextDecoder().decode((await bodyReader.read()).value).startsWith('chunk-0'), 'streaming')
  await echo.stop()
  const ended = await Promise.race([
    (async () => { while (!(await bodyReader.read()).done); return 'ended' })().catch(() => 'aborted'),
    new Promise((resolve) => setTimeout(resolve, 20000, 'hung'))
  ])
  t.not(ended, 'hung', 'a runtime stopping mid-stream ends the response')
  const stopped = await get('/apps/echo/whoami')
  t.alike([stopped.status, stopped.body.message], [503, 'ERR_APP_RUNTIME_UNAVAILABLE: echo'], 'a stopped runtime removed its key: 503, as before it started')
})
