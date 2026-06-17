'use strict'

const { startServices } = require('../../../backend/core/mdk')
const config = {
  ...require('./config/mdk.config.json'),
  runtime: 'docker'
}

async function main () {
  const siteDir = process.cwd()

  console.log('[mdk-site] Setting up Docker runtime in', siteDir)
  const { file } = await startServices(config)

  console.log('[mdk-site] Wrote mdk/worker.js and mdk/utils/service-bootstrap.js')
  console.log(`[mdk-site] Wrote ${file}`)

  if (config.shouldAutoStart) {
    console.log('[mdk-site] Docker services started (shouldAutoStart=true)')
    return
  }

  console.log('[mdk-site] Setup complete. Build image (once) with:')
  console.log('  docker build -f Dockerfile -t site-mdk ../../..')
  console.log('[mdk-site] Then start services with:')
  console.log('  docker compose -f docker-compose.generated.yml up -d')
}

main().catch((err) => {
  console.error('[mdk-site] Setup failed:', err.message)
  process.exit(1)
})
