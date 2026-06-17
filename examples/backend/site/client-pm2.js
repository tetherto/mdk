'use strict'

const { startServices } = require('../../../backend/core/mdk')
const config = {
  ...require('./config/mdk.config.json'),
  runtime: 'pm2'
}

async function main () {
  const siteDir = process.cwd()

  console.log('[mdk-site] Setting up PM2 runtime in', siteDir)
  await startServices(config)

  console.log('[mdk-site] Wrote mdk/worker.js and mdk/utils/service-bootstrap.js')
  console.log('[mdk-site] Wrote ecosystem.config.js')

  if (config.shouldAutoStart) {
    console.log('[mdk-site] PM2 services started (shouldAutoStart=true)')
    return
  }

  console.log('[mdk-site] Setup complete. Start services with:')
  console.log('  pm2 start ecosystem.config.js')
}

main().catch((err) => {
  console.error('[mdk-site] Setup failed:', err.message)
  process.exit(1)
})
