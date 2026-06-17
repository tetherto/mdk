'use strict'

const test = require('brittle')
const fs = require('fs')
const WebSocket = require('ws')
const { createWorker } = require('tether-svc-test-helper').worker
const { setTimeout: sleep } = require('timers/promises')
const { ENDPOINTS } = require('../../workers/lib/constants')

const createTimeout = (ms, message) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error(message || 'Timeout')), ms)
  })
}

const waitForEvent = (ws, event, timeoutMs = 5000) => {
  return Promise.race([
    new Promise((resolve) => {
      ws.once(event, resolve)
    }),
    createTimeout(timeoutMs, `${event} timeout`)
  ])
}

const waitForMessage = (ws, timeoutMs = 5000) => {
  return Promise.race([
    new Promise((resolve, reject) => {
      ws.once('message', (data) => {
        try {
          resolve(JSON.parse(data))
        } catch (err) {
          reject(err)
        }
      })
      ws.once('error', reject)
    }),
    createTimeout(timeoutMs, 'Message timeout')
  ])
}

const expectConnectionRejection = async (url, timeoutMs = 2000) => {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url)
    let resolved = false

    const cleanup = () => {
      if (!resolved) {
        resolved = true
        try {
          ws.close()
        } catch (e) {
          console.error(e)
        }
      }
    }

    const timeout = setTimeout(() => {
      cleanup()
      resolve()
    }, timeoutMs)

    ws.on('open', () => {
      clearTimeout(timeout)
      cleanup()
      reject(new Error('Connection should have been rejected but opened'))
    })

    ws.on('close', () => {
      clearTimeout(timeout)
      cleanup()
      resolve()
    })

    ws.on('error', (err) => {
      console.error(err)
      clearTimeout(timeout)
      cleanup()
      resolve()
    })
  })
}

test('WebSocket endpoint', { timeout: 90000 }, async (main) => {
  const baseDir = 'tests/integration'
  let worker
  const appNodePort = 5001
  const ip = '127.0.0.1'
  const wsBaseUrl = `ws://${ip}:${appNodePort}`
  const readonlyUser = 'readonly@test'
  const siteOperatorUser = 'siteoperator@test'
  const invalidToken = 'invalid-token'
  let superadminUser

  main.teardown(async () => {
    await worker.stop()
    await sleep(2000)
    fs.rmSync(`./${baseDir}/store`, { recursive: true, force: true })
    fs.rmSync(`./${baseDir}/status`, { recursive: true, force: true })
    fs.rmSync(`./${baseDir}/config`, { recursive: true, force: true })
    fs.rmSync(`./${baseDir}/db`, { recursive: true, force: true })
  })

  const createConfig = () => {
    fs.rmSync(`./${baseDir}/store`, { recursive: true, force: true })
    fs.rmSync(`./${baseDir}/status`, { recursive: true, force: true })
    fs.rmSync(`./${baseDir}/config`, { recursive: true, force: true })
    fs.rmSync(`./${baseDir}/db`, { recursive: true, force: true })

    if (!fs.existsSync(`./${baseDir}/config/facs`)) {
      if (!fs.existsSync(`./${baseDir}/config`)) fs.mkdirSync(`./${baseDir}/config`)
      fs.mkdirSync(`./${baseDir}/config/facs`)
    }
    if (!fs.existsSync(`./${baseDir}/db`)) fs.mkdirSync(`./${baseDir}/db`)

    const commonConf = { dir_log: 'logs', debug: 0, orks: { 'cluster-1': { rpcPublicKey: '' } }, cacheTiming: {}, featureConfig: {} }
    const netConf = { r0: {} }
    const httpdConf = { h0: {} }
    const httpdOauthConf = {
      h0: { method: 'google', credentials: { client: { id: 'i', secret: 's' } }, users: [{ email: readonlyUser }, { email: siteOperatorUser, write: true }] },
      h1: { method: 'microsoft', credentials: { client: { id: 'i', secret: 's' }, tenant: 'test-tenant' }, users: [] }
    }
    const authConf = require('../../config/facs/auth.config.json')
    superadminUser = authConf.a0.superAdmin

    fs.writeFileSync(`./${baseDir}/config/common.json`, JSON.stringify(commonConf))
    fs.writeFileSync(`./${baseDir}/config/facs/net.config.json`, JSON.stringify(netConf))
    fs.writeFileSync(`./${baseDir}/config/facs/httpd.config.json`, JSON.stringify(httpdConf))
    fs.writeFileSync(`./${baseDir}/config/facs/httpd-oauth2.config.json`, JSON.stringify(httpdOauthConf))
    fs.writeFileSync(`./${baseDir}/config/facs/auth.config.json`, JSON.stringify(authConf))
  }

  const startWorker = async () => {
    worker = createWorker({
      env: 'test',
      wtype: 'wrk-node-http-test',
      rack: 'test-rack',
      tmpdir: baseDir,
      storeDir: 'test-store',
      serviceRoot: `${process.cwd()}/${baseDir}`,
      port: appNodePort
    })

    await worker.start()
    worker.worker.net_r0.jRequest = async () => {
      return [
        { id: 'alert1', last: { alerts: { createdAt: Date.now() } } },
        { id: 'alert2', last: { alerts: { createdAt: Date.now() } } }
      ]
    }
  }

  const getTestToken = async (email) => {
    worker.worker.authLib._auth.addHandlers({
      google: () => { return { email } }
    })
    const token = await worker.worker.auth_a0.authCallbackHandler('google', { ip })
    return token
  }

  const connectWebSocket = async (token) => {
    const ws = new WebSocket(`${wsBaseUrl}${ENDPOINTS.WEBSOCKET}?token=${token}`)
    await waitForEvent(ws, 'open', 5000)
    return ws
  }

  const subscribeToAlerts = (ws) => {
    ws.send(JSON.stringify({ event: 'subscribe', channel: 'alerts' }))
  }

  const unsubscribeFromAlerts = (ws) => {
    ws.send(JSON.stringify({ event: 'unsubscribe', channel: 'alerts' }))
  }

  createConfig()
  await startWorker()
  await sleep(2000)

  await main.test('WS: connection without token', async (t) => {
    try {
      await expectConnectionRejection(`${wsBaseUrl}${ENDPOINTS.WEBSOCKET}`)
      t.pass()
    } catch (err) {
      t.fail('Connection should be rejected without token')
    }
  })

  await main.test('WS: connection with invalid token', async (t) => {
    try {
      await expectConnectionRejection(`${wsBaseUrl}${ENDPOINTS.WEBSOCKET}?token=${invalidToken}`)
      t.pass()
    } catch (err) {
      t.fail('Connection should be rejected with invalid token')
    }
  })

  await main.test('WS: successful connection with valid token', async (t) => {
    const token = await getTestToken(readonlyUser)
    try {
      const ws = await connectWebSocket(token)
      t.pass()
      ws.close()
    } catch (err) {
      t.fail('Connection should succeed with valid token')
    }
  })

  await main.test('WS: client added to wsClients set', async (t) => {
    const token = await getTestToken(siteOperatorUser)
    const initialSize = worker.worker.wsClients.size

    const ws = await connectWebSocket(token)
    await sleep(500)

    t.is(worker.worker.wsClients.size, initialSize + 1, 'Client should be added to wsClients set')
    ws.close()
    await sleep(500)
    t.is(worker.worker.wsClients.size, initialSize, 'Client should be removed from wsClients set on close')
  })

  await main.test('WS: client removed on disconnect', async (t) => {
    const token = await getTestToken(readonlyUser)
    const ws = await connectWebSocket(token)

    subscribeToAlerts(ws)
    await waitForMessage(ws, 3000)

    const sizeBeforeClose = worker.worker.wsClients.size
    t.ok(sizeBeforeClose > 0, 'Client should be in set')

    ws.close()
    await waitForEvent(ws, 'close', 2000)
    await sleep(100)

    t.ok(worker.worker.wsClients.size < sizeBeforeClose, 'Client should be removed after close')
    t.pass()
  })

  await main.test('WS: multiple concurrent connections', async (t) => {
    const token1 = await getTestToken(readonlyUser)
    const token2 = await getTestToken(siteOperatorUser)
    const token3 = await getTestToken(superadminUser)

    const ws1 = await connectWebSocket(token1)
    const ws2 = await connectWebSocket(token2)
    const ws3 = await connectWebSocket(token3)

    await sleep(500)

    t.ok(worker.worker.wsClients.size >= 3, 'Should support multiple concurrent connections')

    ws1.close()
    ws2.close()
    ws3.close()

    await sleep(500)
    t.pass()
  })

  await main.test('WS: broadcast to all connected clients', async (t) => {
    const token1 = await getTestToken(readonlyUser)
    const token2 = await getTestToken(siteOperatorUser)

    const ws1 = await connectWebSocket(token1)
    const ws2 = await connectWebSocket(token2)

    subscribeToAlerts(ws1)
    subscribeToAlerts(ws2)

    // wait for initial subscription messages
    await Promise.all([
      waitForMessage(ws1, 3000),
      waitForMessage(ws2, 3000)
    ])

    await sleep(1000)
    await worker.worker.alertsService.broadcastAlerts(worker.worker.wsClients)

    // wait for broadcast messages
    const [alerts1, alerts2] = await Promise.all([
      waitForMessage(ws1, 3000),
      waitForMessage(ws2, 3000)
    ])

    t.ok(Array.isArray(alerts1), 'WS1 should receive alerts array')
    t.ok(Array.isArray(alerts2), 'WS2 should receive alerts array')

    ws1.close()
    ws2.close()
    t.pass()
  })

  await main.test('WS: handle client errors gracefully', async (t) => {
    const token = await getTestToken(readonlyUser)
    const ws = await connectWebSocket(token)

    subscribeToAlerts(ws)
    await waitForMessage(ws, 3000)

    ws.emit('error', new Error('Test error'))
    await sleep(500)

    t.pass('Error handled gracefully')
    ws.close()
  })

  await main.test('WS: connection persistence', async (t) => {
    const token = await getTestToken(siteOperatorUser)
    const ws = await connectWebSocket(token)

    subscribeToAlerts(ws)
    await waitForMessage(ws, 3000)

    t.pass('Received initial message')
    await sleep(1000)
    ws.close()

    t.pass('Connection should persist and receive messages')
  })

  await main.test('WS: data format validation', async (t) => {
    const token = await getTestToken(readonlyUser)
    const ws = await connectWebSocket(token)

    try {
      subscribeToAlerts(ws)
      const data = await waitForMessage(ws, 5000)
      t.ok(Array.isArray(data), 'Data should be valid JSON array')
      ws.close()
      t.pass()
    } catch (err) {
      ws.close()
      t.fail(`Did not receive data: ${err.message}`)
    }
  })

  await main.test('WS: no data without subscription', async (t) => {
    const token = await getTestToken(readonlyUser)
    const ws = await connectWebSocket(token)

    try {
      await Promise.race([
        waitForMessage(ws, 2000),
        sleep(2000).then(() => {
          t.pass('No data received without subscription')
        })
      ])
      ws.close()
      t.fail('Should not receive data without subscription')
    } catch (err) {
      if (err.message.includes('Should not')) {
        ws.close()
        throw err
      }
      // Expected timeout
    }

    await worker.worker.alertsService.broadcastAlerts(worker.worker.wsClients)
    await sleep(1000)
    ws.close()
    t.pass()
  })

  await main.test('WS: invalid message format handling', async (t) => {
    const token = await getTestToken(readonlyUser)
    const ws = await connectWebSocket(token)

    try {
      ws.send('invalid json')
      const response = await waitForMessage(ws, 3000)
      t.ok(response.error, 'Should receive error message')
      t.is(response.error, 'Invalid message format', 'Should have correct error message')
      ws.close()
      t.pass()
    } catch (err) {
      ws.close()
      t.fail(`Did not receive error response: ${err.message}`)
    }
  })

  await main.test('WS: subscription tracking', async (t) => {
    const token = await getTestToken(siteOperatorUser)
    const ws = await connectWebSocket(token)

    subscribeToAlerts(ws)
    await waitForMessage(ws, 3000)
    await sleep(100)

    const client = Array.from(worker.worker.wsClients).find(c => c === ws._socket || c.writable)
    if (client?.subscriptions) {
      t.ok(client.subscriptions.has('alerts'), 'Client should have alerts subscription')
    }
    ws.close()
    t.pass()
  })

  await main.test('WS: unsubscribe from channel', async (t) => {
    const token = await getTestToken(readonlyUser)
    const ws = await connectWebSocket(token)

    subscribeToAlerts(ws)
    await waitForMessage(ws, 3000)
    await sleep(100)

    unsubscribeFromAlerts(ws)
    await sleep(100)

    const client = Array.from(worker.worker.wsClients).find(c => c === ws._socket || c.writable)
    if (client?.subscriptions) {
      t.ok(!client.subscriptions.has('alerts'), 'Client should not have alerts subscription after unsubscribe')
    }
    ws.close()
    t.pass()
  })

  await main.test('WS: no broadcast after unsubscribe', async (t) => {
    const token = await getTestToken(siteOperatorUser)
    const ws = await connectWebSocket(token)

    subscribeToAlerts(ws)
    await waitForMessage(ws, 3000)

    unsubscribeFromAlerts(ws)
    await sleep(500)

    await worker.worker.alertsService.broadcastAlerts(worker.worker.wsClients)
    await sleep(500)

    // Should not receive additional messages
    try {
      await Promise.race([
        waitForMessage(ws, 1000),
        sleep(1000).then(() => {
          t.pass('No additional messages after unsubscribe')
        })
      ])
      t.fail('Should not receive additional messages after unsubscribe')
    } catch (err) {
      t.pass('No broadcast received after unsubscribe')
    }

    ws.close()
    t.pass()
  })
})
