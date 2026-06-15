'use strict'

const config = require('./config/mdk.config.json')

if (config.runtime === 'docker') {
  require('./client-docker')
} else if (config.runtime === 'pm2') {
  require('./client-pm2')
} else {
  console.error(`[mdk-site] Unsupported runtime "${config.runtime}". Use client-pm2.js or client-docker.js.`)
  process.exit(1)
}
