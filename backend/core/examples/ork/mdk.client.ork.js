'use strict'

/**
 * MDK ORK — Sample Client
 *
 * Demonstrates starting the ORK kernel using the lib pattern
 * (same pattern as samples/miners/mdk.client.miner.js uses MinerManager).
 *
 * Usage:
 *   node samples/ork/mdk.client.ork.js
 */

const path = require('path')
const fs = require('fs')
const { OrkManager } = require('../../ork')

const startOrk = async () => {
  // Setup dirs (same as lib/utils/initialize.js does for the full MDK)
  const root = path.join(__dirname, '../../../../tmp')
  const storeDir = path.join(root, 'store', 'ork-db')
  const configDir = path.join(root, 'config')

  fs.mkdirSync(storeDir, { recursive: true })
  fs.mkdirSync(configDir, { recursive: true })

  // Write config if not exists
  const configPath = path.join(configDir, 'ork.json')
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({
      hrpc: { whitelist: [] },
      ipc: { path: path.join(root, 'mdk-ork.sock') },
      discovery: { topic: null },
      telemetryPullMs: 10000,
      statePullMs: 60000,
      healthPingMs: 5000,
      healthFailureThreshold: 3,
      commandMaxRetries: 3,
      commandTimeoutMs: 30000
    }, null, 2))
  }

  // Create and start ORK
  const ork = new OrkManager({}, {
    storeDir,
    root
  })

  await ork.init()
  await ork.start()

  const pubKey = ork.getPublicKey()
  console.log('ORK started')
  if (pubKey) {
    console.log(`HRPC public key: ${pubKey.toString('hex')}`)
  }
  console.log(`Registered workers: ${ork.registry.listWorkers().length}`)

  // Handle shutdown
  const shutdown = async () => {
    console.log('\nShutting down ORK...')
    await ork.stop()
    console.log('ORK stopped')
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

startOrk().catch((err) => {
  console.error('Failed to start ORK:', err)
  process.exit(1)
})
