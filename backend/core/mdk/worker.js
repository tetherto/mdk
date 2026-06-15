'use strict'

// Shared process entry for PM2, Docker, and direct `node mdk/worker.js` runs.
const { main } = require('./utils/service-bootstrap')

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
