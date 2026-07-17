'use strict'

/**
 * MDK E2E Example — HTTP Bridge
 *
 * Fastify server that connects to the Kernel over HRPC (key read from the
 * kernel key file) and exposes Kernel data over REST for the UI demo page.
 *
 * Run after server.js:
 *
 *   # Terminal 1
 *   node examples/backend/mdk-e2e/server.js
 *
 *   # Terminal 2
 *   node examples/backend/mdk-e2e/http.js
 *
 */

const fs = require('fs')
const Fastify = require('fastify')
const { createMdkClient } = require('../../../backend/core/client')
const { DEFAULT_KEY_FILE } = require('../../../backend/core/mdk')

const KERNEL_KEY = process.env.MDK_KERNEL_KEY ||
  (fs.existsSync(DEFAULT_KEY_FILE) ? fs.readFileSync(DEFAULT_KEY_FILE, 'utf8').trim() : null)
const PORT = Number(process.env.MDK_HTTP_PORT) || 3001
const HOST = '127.0.0.1'

async function main () {
  if (!KERNEL_KEY) {
    console.error(`\n  No kernel key: set MDK_KERNEL_KEY or start the Kernel first (key file: ${DEFAULT_KEY_FILE})`)
    console.error('  Is server.js running?\n')
    process.exit(1)
  }
  const mdkClient = createMdkClient({ hrpc: { key: KERNEL_KEY } })

  try {
    await mdkClient.connect()
  } catch (err) {
    console.error(`\n  Cannot connect to Kernel over HRPC (key ${KERNEL_KEY.slice(0, 16)}…)`)
    console.error('  Is server.js running?\n')
    process.exit(1)
  }

  const app = Fastify({ logger: false })

  app.addHook('onSend', (req, reply, payload, done) => {
    reply.header('Access-Control-Allow-Origin', '*')
    reply.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    reply.header('Access-Control-Allow-Headers', 'Content-Type')
    done(null, payload)
  })

  app.options('/*', (req, reply) => reply.code(204).send())

  app.get('/workers', async () => {
    return mdkClient.listWorkers()
  })

  app.get('/devices/:deviceId/telemetry', async (req) => {
    const { deviceId } = req.params
    const queryType = req.query.queryType || 'metrics'
    const result = await mdkClient.pullTelemetry(deviceId, queryType)
    return result || { error: 'ERR_NO_TELEMETRY' }
  })

  app.get('/devices/:deviceId/state', async (req) => {
    const result = await mdkClient.pullState(req.params.deviceId)
    return result || { error: 'ERR_NO_STATE' }
  })

  app.post('/devices/:deviceId/commands', async (req, reply) => {
    const { command, params = {} } = req.body || {}
    if (!command) {
      reply.code(400)
      return { error: 'ERR_COMMAND_REQUIRED' }
    }
    return mdkClient.sendCommand(req.params.deviceId, command, params)
  })

  await app.listen({ port: PORT, host: HOST })

  console.log('\n  ════════════════════════════════════════')
  console.log(`  MDK HTTP bridge ready at http://${HOST}:${PORT}`)
  console.log(`  Kernel HRPC key: ${KERNEL_KEY.slice(0, 16)}…`)
  console.log('\n  Endpoints:')
  console.log('    GET  /workers')
  console.log('    GET  /devices/:deviceId/telemetry')
  console.log('    GET  /devices/:deviceId/state')
  console.log('    POST /devices/:deviceId/commands')
  console.log('  ════════════════════════════════════════\n')

  process.on('SIGINT', async () => {
    mdkClient.close()
    await app.close()
    process.exit(0)
  })
}

main().catch((err) => { console.error(err); process.exit(1) })
