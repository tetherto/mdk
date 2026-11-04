'use strict'

const test = require('brittle')
const { createMdkClient } = require('../../index')

function flakyTransport (failures) {
  let attempts = 0
  return {
    get attempts () { return attempts },
    connect: async () => {
      attempts++
      if (attempts <= failures) throw new Error('kernel unreachable')
    },
    close: async () => {},
    request: async () => ({})
  }
}

test('auto client - method calls reject with the default code when no kernelKey', async (t) => {
  const mdkClient = createMdkClient({})
  try {
    await mdkClient.listWorkers()
    t.fail('should have rejected')
  } catch (err) {
    t.is(err.message, 'ERR_MDK_CLIENT_UNAVAILABLE', 'default error code')
    t.is(err.code, 'ERR_MDK_CLIENT_UNAVAILABLE', 'default error code on .code')
  }
})

test('auto client - honors a custom errorCode', async (t) => {
  const mdkClient = createMdkClient({}, { errorCode: 'ERR_KERNEL_CLIENT_NOT_CONNECTED' })
  try {
    await mdkClient.getStatus()
    t.fail('should have rejected')
  } catch (err) {
    t.is(err.message, 'ERR_KERNEL_CLIENT_NOT_CONNECTED', 'custom error code')
    t.is(err.code, 'ERR_KERNEL_CLIENT_NOT_CONNECTED', 'custom error code on .code')
  }
})

test('auto client - first method call connects, later calls reuse the connection', async (t) => {
  const transport = flakyTransport(0)
  const mdkClient = createMdkClient({}, { transport })

  await mdkClient.listWorkers()
  await mdkClient.getStatus()
  t.is(transport.attempts, 1, 'connect ran once across calls')
})

test('auto client - failed connect resets so the next request retries', async (t) => {
  const transport = flakyTransport(1)
  const mdkClient = createMdkClient({}, { transport })

  try {
    await mdkClient.listWorkers()
    t.fail('first call should have rejected')
  } catch (err) {
    t.ok(err.message.startsWith('ERR_MDK_CLIENT_UNAVAILABLE:'), 'code prefixes the cause')
    t.ok(err.message.includes('kernel unreachable'), 'cause preserved')
    t.is(err.code, 'ERR_MDK_CLIENT_UNAVAILABLE', 'bare code on .code despite the cause suffix on .message')
  }

  const res = await mdkClient.listWorkers()
  t.ok(res, 'second call retried and succeeded')
  t.is(transport.attempts, 2, 'one retry, not a permanent failure')
})

test('auto client - a failed Kernel request rejects with the error code, then recovers', async (t) => {
  const channelClosed = Object.assign(new Error('channel closed'), { code: 'CHANNEL_CLOSED' })
  let down = true
  const transport = {
    connect: async () => {},
    close: async () => {},
    request: async () => { if (down) throw channelClosed; return { workers: [] } }
  }
  const mdkClient = createMdkClient({}, { transport, errorCode: 'ERR_KERNEL_CLIENT_NOT_CONNECTED' })

  try {
    await mdkClient.listWorkers()
    t.fail('request to an unreachable Kernel should have rejected')
  } catch (err) {
    t.is(err.code, 'ERR_KERNEL_CLIENT_NOT_CONNECTED', 'configured code on .code')
    t.is(err.message, 'ERR_KERNEL_CLIENT_NOT_CONNECTED: channel closed', 'code prefixes the cause')
    t.is(err.cause, channelClosed, 'transport error kept as the cause')
  }

  down = false
  t.alike(await mdkClient.listWorkers(), { workers: [] }, 'next request succeeds once the Kernel is back')

  try {
    await mdkClient.waitForWorkers({ timeoutMs: 1, intervalMs: 1 })
    t.fail('waiting for an absent worker should have rejected')
  } catch (err) {
    t.is(err.message, 'ERR_MDK_WAIT_WORKERS_TIMEOUT', 'client ERR_ codes pass through unwrapped')
  }
})

test('auto client - unknown method rejects with a named error', async (t) => {
  const mdkClient = createMdkClient({}, { transport: flakyTransport(0) })
  try {
    await mdkClient.notARealAction()
    t.fail('should have rejected')
  } catch (err) {
    t.ok(err.message.startsWith('ERR_MDK_CLIENT_NO_SUCH_METHOD'), 'names the missing method')
  }
})

test('auto client - awaiting the client itself is not a thenable trap', async (t) => {
  const mdkClient = createMdkClient({}, { transport: flakyTransport(0) })
  t.is(mdkClient.then, undefined, 'then stays undefined')
  const same = await mdkClient
  t.is(same, mdkClient, 'await resolves to the client, not a hang')
})

test('auto client - explicit connect() warms up, close() allows reconnect', async (t) => {
  const transport = flakyTransport(0)
  const mdkClient = createMdkClient({}, { transport })

  await mdkClient.connect()
  await mdkClient.listWorkers()
  t.is(transport.attempts, 1, 'warm-up connection reused')

  await mdkClient.close()
  await mdkClient.listWorkers()
  t.is(transport.attempts, 2, 'call after close reconnects')
})

test('auto client - inherited Object.prototype members are not dispatched as methods', async (t) => {
  const mdkClient = createMdkClient({}, { transport: flakyTransport(0) })
  for (const prop of ['constructor', 'toString', 'hasOwnProperty', '__proto__', 'valueOf']) {
    await t.exception(() => mdkClient[prop](), /ERR_MDK_CLIENT_NO_SUCH_METHOD/, prop)
  }
})
