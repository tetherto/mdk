'use strict'

const test = require('brittle')
const fs = require('fs')
const path = require('path')
const { createWorker } = require('@tetherto/tether-svc-test-helper').worker
const os = require('os')
const { setTimeout: sleep } = require('timers/promises')
const { ECHO_APP } = require('../fixtures/helpers')

// A gateway mounts only the apps it is handed. The echo app is declared here
// so there is a real route to exercise; with no runtime publishing a key it
// answers 503. Anything not declared must not be served.
const DECLARED_APPS = [{ name: 'echo', appDir: ECHO_APP, keyFile: 'tests/integration/run/echo.key' }]

// An app with one `auth: true` route, to check the gateway closes it when no
// authVerifier is configured (before it would forward to a runtime).
const SECURED_PLUGIN = path.join(os.tmpdir(), 'mdk-gateway-api-secured-' + Date.now())
fs.mkdirSync(SECURED_PLUGIN, { recursive: true })
fs.writeFileSync(path.join(SECURED_PLUGIN, 'mdk-plugin.json'), JSON.stringify({
  name: '@test/secured',
  version: '1.0.0',
  routes: [{ id: 'secured.me', method: 'GET', path: '/api/test/me', handler: './me.js', auth: true }]
}))
fs.writeFileSync(path.join(SECURED_PLUGIN, 'me.js'), '\'use strict\'\nmodule.exports = async (req) => req._info\n')

test('Api', { timeout: 90000 }, async (main) => {
  const baseDir = 'tests/integration'
  let worker
  const gatewayPort = 5000
  const gatewayBaseUrl = `http://127.0.0.1:${gatewayPort}`
  const site = 'test-site'

  const cleanDirs = () => {
    fs.rmSync(`./${baseDir}/store`, { recursive: true, force: true })
    fs.rmSync(`./${baseDir}/status`, { recursive: true, force: true })
    fs.rmSync(`./${baseDir}/config`, { recursive: true, force: true })
    fs.rmSync(`./${baseDir}/identity`, { recursive: true, force: true })
  }

  main.teardown(async () => {
    await worker.stop()
    // wait for worker to stop
    await sleep(2000)
    cleanDirs()
    fs.rmSync(SECURED_PLUGIN, { recursive: true, force: true })
  })

  const createConfig = () => {
    cleanDirs()

    fs.mkdirSync(`./${baseDir}/config/facs`, { recursive: true })

    const commonConf = {
      dir_log: 'logs',
      debug: 0,
      site
    }
    fs.writeFileSync(`./${baseDir}/config/common.json`, JSON.stringify(commonConf))
    fs.writeFileSync(`./${baseDir}/config/facs/net.config.json`, JSON.stringify({ r0: {} }))
    fs.writeFileSync(`./${baseDir}/config/facs/httpd.config.json`, JSON.stringify({ h0: {} }))
  }

  const startWorker = async () => {
    worker = createWorker({
      env: 'test',
      wtype: 'wrk-node-http-test',
      rack: 'test-rack',
      tmpdir: baseDir,
      storeDir: 'test-store',
      serviceRoot: `${process.cwd()}/${baseDir}`,
      port: gatewayPort,
      apps: [...DECLARED_APPS, { name: 'secured', appDir: SECURED_PLUGIN, keyFile: path.join(SECURED_PLUGIN, 'runtime.key'), mount: '/' }]
    })

    await worker.start()
  }

  const getJson = async (url) => {
    const res = await fetch(url)
    return { status: res.status, body: await res.json() }
  }

  createConfig()
  await startWorker()
  await sleep(2000)

  await main.test('Api: worker boots and serves HTTP', async (t) => {
    const { status, body } = await getJson(`${gatewayBaseUrl}/apps/echo/whoami`)
    t.is(status, 503, 'route mounted from the route table, without any auth token')
    t.is(body.message, 'ERR_APP_RUNTIME_UNAVAILABLE: echo', 'no runtime has published a key')
  })

  await main.test('Api: undeclared app routes respond 404', async (n) => {
    const undeclared = [
      '/auth/site',
      '/auth/featureConfig',
      '/auth/metrics/hashrate',
      '/site-monitor/hashrate',
      '/site-hashrate/summary'
    ]

    for (const route of undeclared) {
      await n.test(`get ${route}`, async (t) => {
        const { status } = await getJson(`${gatewayBaseUrl}${route}`)
        t.is(status, 404, `${route} should respond 404`)
      })
    }
  })

  await main.test('Api: auth: true route answers 401 without an authVerifier', async (t) => {
    const { status, body } = await getJson(`${gatewayBaseUrl}/api/test/me`)
    t.is(status, 401)
    t.is(body.message, 'ERR_AUTH_UNAUTHORIZED')
  })

  await main.test('Api: hardening defaults', async (t) => {
    const echo = await fetch(`${gatewayBaseUrl}/echo?value=x`)
    t.is(echo.status, 404, 'no default /echo route')

    const res = await fetch(`${gatewayBaseUrl}/apps/echo/whoami`)
    t.is(res.headers.get('x-content-type-options'), 'nosniff', 'security headers are set')
    t.ok(res.headers.get('x-ratelimit-limit'), 'rate limit is on')

    const rebound = await new Promise((resolve, reject) => {
      require('http').get({ host: '127.0.0.1', port: gatewayPort, path: '/apps/echo/whoami', headers: { host: 'evil.example:' + gatewayPort } }, resolve).on('error', reject)
    })
    t.is(rebound.statusCode, 403, 'a foreign Host header is refused')
    rebound.resume()
  })
})
