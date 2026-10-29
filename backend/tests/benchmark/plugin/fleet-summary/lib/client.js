'use strict'

// The app runtime's Kernel client, signed in as this app's service account.
const { config } = require('@tetherto/mdk-gateway/plugin')

module.exports = config.mdkClient
