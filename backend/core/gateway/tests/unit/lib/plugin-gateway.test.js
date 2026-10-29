'use strict'

const test = require('brittle')
const { buildPluginContext } = require('../../../workers/lib/plugin-gateway')

function makeWrk () {
  return {
    conf: { site: { name: 'test-site' }, ttl: 300 },
    ctx: { kernelKey: 'a'.repeat(64), kernelBootstrap: null },
    net_r0: { dht: { defaultKeyPair: { publicKey: 'pk', secretKey: 'sk' } } },
    onGatewayReady (fn) { (this._readyWaiters ||= []).push(fn) }
  }
}

test('plugin context - request-time surface: config', (t) => {
  const wrk = makeWrk()
  const { context } = buildPluginContext(wrk, '/plugins/thing')

  for (const k of ['kernelKey', 'kernelKeyPair', 'kernelBootstrap']) t.absent(k in context.config, `no ${k}: plugins never dial the Kernel with raw keys`)
  t.alike(context.config.site, { name: 'test-site' }, 'gateway conf spread into config')
  t.ok(Object.isFrozen(context.config), 'config frozen')
  t.ok(Object.isFrozen(context), 'context frozen')
})

test('plugin context - Kernel fields set in either conf layer are dropped', (t) => {
  const wrk = { ...makeWrk(), conf: { kernelKey: 'b'.repeat(64), ttl: 1 } }
  const { context } = buildPluginContext(wrk, '/plugins/thing', { kernelKeyPair: { secretKey: 'x' }, kernelCredential: {}, own: true })
  t.alike(Object.keys(context.config).sort(), ['own', 'ttl'])
})

test('plugin context - per-plugin config merges over the gateway conf', (t) => {
  const wrk = makeWrk()
  const { context } = buildPluginContext(wrk, '/plugins/thing', {
    ttl: 60,
    agent: { provider: { kind: 'qvac' } }
  })

  t.is(context.config.ttl, 60, 'plugin config wins over gateway conf')
  t.alike(context.config.agent, { provider: { kind: 'qvac' } }, 'plugin-only keys visible')
  t.alike(context.config.site, { name: 'test-site' }, 'gateway conf still spread underneath')
  t.ok(Object.isFrozen(context.config), 'config still frozen')
})

test('plugin context - logger: pino instance tagged with the plugin name', (t) => {
  const wrk = makeWrk()
  const { context } = buildPluginContext(wrk, '/plugins/thing')

  for (const level of ['fatal', 'error', 'warn', 'info', 'debug', 'trace']) {
    t.is(typeof context.logger[level], 'function', `${level}() is present`)
  }
  t.is(typeof context.logger.child, 'function', 'child() is present, for a plugin that wants its own sub-tag')
  t.is(context.logger.bindings().name, 'thing', 'tagged with the plugin name (from mdk-plugin.json, falling back to the dir)')

  // Calling it must not throw — the point of this test is that the ambient
  // context hands back a real, usable logger, not that pino formats correctly
  // (pino's own test suite covers that).
  t.execution(() => context.logger.info('hello'), 'a real log call does not throw')
})

// The boot-time surface. A plugin's module code runs while the worker is still
// building itself, so a plugin with work that needs the gateway to answer has
// to be told when that is.

test('plugin context - onReady hands the callback to the worker, unfired', (t) => {
  const wrk = makeWrk()
  const fired = []

  const { context } = buildPluginContext(wrk, '/plugins/thing')
  context.onReady(() => fired.push('boot'))

  t.is(wrk._readyWaiters.length, 1, 'the callback reached the worker')
  t.alike(fired, [], 'and nothing ran at registration time')
})
