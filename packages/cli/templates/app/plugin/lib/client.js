'use strict'

// The app's Kernel client. The app runtime owns it: it dials with the app's own
// key and signs in as the app's service account (app:<name>), so what this app
// may do is what spec.rbac grants it. The loader overrides
// `require('@tetherto/mdk-gateway/plugin')` per plugin. Controllers import this
// module; they never take mdkClient from a services bag.
const { config } = require('@tetherto/mdk-gateway/plugin')

module.exports = config.mdkClient
